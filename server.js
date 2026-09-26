import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { analysisPrompt } from './prompts.js';
import { calculateManse, interpretRules } from './manse.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'data'));
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'saju.sqlite'));
db.exec(`PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, code TEXT UNIQUE NOT NULL, inviter TEXT, credits INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT, created_at TEXT NOT NULL, expires_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS referrals (referred_id TEXT PRIMARY KEY, inviter_id TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS analyses (id TEXT PRIMARY KEY, session_hash TEXT NOT NULL, user_id TEXT, body TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS access_grants (user_id TEXT PRIMARY KEY, expires_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, name TEXT NOT NULL, user_id TEXT, created_at TEXT NOT NULL);
`);
if(!db.prepare('PRAGMA table_info(analyses)').all().some(c=>c.name==='chart_json')) db.exec('ALTER TABLE analyses ADD COLUMN chart_json TEXT');
const PORT = Number(process.env.PORT || 3000);
const freeDay = Number(process.env.FREE_WEEKDAY ?? 3); // 0 Sunday, 3 Wednesday, Korean time
const validDay = Number.isInteger(freeDay) && freeDay >= 0 && freeDay <= 6 ? freeDay : 3;
const csrfOrigin = process.env.PUBLIC_ORIGIN || '';
const secureCookie = process.env.NODE_ENV === 'production' ? '; Secure' : '';
const loginAttempts = new Map();
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };
const randomId = () => crypto.randomBytes(18).toString('hex');
const hash = v => crypto.createHash('sha256').update(v).digest('hex');
const now = () => new Date().toISOString();
export const isFreeKST = (date = new Date(), day = validDay) => ({Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6})[new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Seoul',weekday:'short'}).format(date)] === day;
const json = (res, status, body) => {res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(JSON.stringify(body));};
function event(name, userId) { db.prepare('INSERT INTO events VALUES (?,?,?,?)').run(randomId(),name,userId || null,now()); }
function getSession(req, res) {
  const cookie = /(?:^|;\s*)saju_session=([a-f0-9]{64})/.exec(req.headers.cookie || '');
  let token = cookie?.[1]; let record = token && db.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires_at>?').get(hash(token),now());
  if (!record) {
    token = randomId() + randomId().slice(0,28); // 64 hex chars
    const expires = new Date(Date.now()+30*86400000).toISOString();
    db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(hash(token),null,now(),expires);
    res.setHeader('Set-Cookie',`saju_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secureCookie}`);
    record = { token_hash:hash(token),user_id:null };
  }
  return record;
}
function rotateSession(res, oldSession, userId=null) {
  db.prepare('DELETE FROM sessions WHERE token_hash=?').run(oldSession.token_hash);
  const token=crypto.randomBytes(32).toString('hex');
  const record={token_hash:hash(token),user_id:userId};
  db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(record.token_hash,userId,now(),new Date(Date.now()+30*86400000).toISOString());
  res.setHeader('Set-Cookie',`saju_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secureCookie}`);
  return record;
}
const userOf = session => session.user_id ? db.prepare('SELECT id,email,code,credits FROM users WHERE id=?').get(session.user_id) : null;
function canRead(user) { return !!user && (isFreeKST() || !!db.prepare('SELECT 1 FROM access_grants WHERE user_id=? AND expires_at>?').get(user.id,now())); }
function view(user) {
  return { user:user ? {email:user.email,code:user.code,credits:user.credits} : null,
    freeToday:isFreeKST(), freeWeekday:validDay, canRead:canRead(user), demo:!process.env.OPENAI_API_KEY };
}
async function body(req, limit=7_000_000) {
  let raw='', bytes=0; for await (const chunk of req) {bytes+=chunk.length;if(bytes>limit) throw Object.assign(new Error('요청 크기를 줄여주세요.'),{status:413});raw+=chunk;}
  try{return JSON.parse(raw || '{}');}catch{throw Object.assign(new Error('요청 형식이 올바르지 않습니다.'),{status:400});}
}
const bad = (message,status=400) => {throw Object.assign(new Error(message),{status});};
function verifyOrigin(req) {
  if(req.headers['sec-fetch-site']==='cross-site') bad('다른 사이트에서 보낸 요청은 처리하지 않습니다.',403);
  const origin=req.headers.origin; if (!origin) return;
  const host=`${req.socket.encrypted?'https':'http'}://${req.headers.host}`;
  if (origin !== host && origin !== csrfOrigin) bad('다른 사이트에서 보낸 요청은 처리하지 않습니다.',403);
}
function requireJson(req) {
  if(!/^application\/json(?:\s*;|\s*$)/i.test(req.headers['content-type']||'')) bad('JSON 요청만 처리합니다.',415);
}
function checkLoginLimit(req,email) {
  const key=hash(`${req.socket.remoteAddress||''}:${email}`);
  const entry=loginAttempts.get(key);
  if(entry && entry.until>Date.now() && entry.count>=5) bad('로그인 시도가 많습니다. 잠시 후 다시 시도해주세요.',429);
  if(!entry || entry.until<=Date.now())loginAttempts.set(key,{count:0,until:Date.now()+15*60_000});
  if(loginAttempts.size>5000){
    for(const [k,v] of loginAttempts)if(v.until<=Date.now())loginAttempts.delete(k);
    while(loginAttempts.size>5000)loginAttempts.delete(loginAttempts.keys().next().value);
  }
  return key;
}
function passwordHash(password,salt=crypto.randomBytes(16).toString('hex')) {return `${salt}:${crypto.scryptSync(password,salt,64).toString('hex')}`;}
function passwordMatches(password, saved) {const [salt,value]=saved.split(':');return crypto.timingSafeEqual(Buffer.from(value,'hex'),Buffer.from(passwordHash(password,salt).split(':')[1],'hex'));}
async function generateReport(image,priority,mode) {
  const res=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL || 'gpt-4.1',store:false,max_output_tokens:12000,input:[{role:'user',content:[{type:'input_text',text:analysisPrompt({priority,mode})},{type:'input_image',image_url:image,detail:'high'}]}]}),signal:AbortSignal.timeout(150000)});
  const result=await res.json();
  if(!res.ok) throw new Error(`AI 분석 요청에 실패했습니다 (${res.status}). 설정과 이용 한도를 확인해주세요.`);
  return (result.output || []).flatMap(item=>item.content || []).filter(c=>c.type==='output_text').map(c=>c.text).join('\n').trim();
}
const previewText = '처음 만났을 때는 가벼운 질문 한 개가 대화의 흐름을 바꿉니다. 두 사람이 서로 동의한 정보만으로 질문을 고르고, 답변 자체에 귀를 기울여 보세요.';
const publicCards = [
  {title:'첫 5분',question:'처음 만난 사람과 있을 때 먼저 말문을 트는 편인가요, 분위기를 보는 편인가요?'},
  {title:'취향 탐색',question:'쉬는 날을 혼자 충전하는 데 쓰나요, 사람을 만나며 보내나요?'},
  {title:'작은 선택',question:'새로운 동네에 가면 계획을 세우나요, 걷다가 발견하나요?'}
];
function safeAnalysis(row, session, user) {
  if (!row || (row.user_id ? row.user_id !== user?.id : row.session_hash !== session.token_hash)) bad('결과를 찾을 수 없습니다.',404);
  // Full text is only serialized after a server-side entitlement check. CSS blur alone cannot protect it.
  return {id:row.id,preview:row.body.startsWith('데모 모드:')?previewText:row.body.slice(0,300).trim()+'…',chart:row.chart_json?JSON.parse(row.chart_json):null,full:canRead(user)?row.body:null,locked:!canRead(user)};
}
async function api(req,res,url) {
  const session=getSession(req,res), user=userOf(session);
  if(req.method==='GET' && url.pathname==='/api/bootstrap') return json(res,200,{...view(user),cards:publicCards});
  if(req.method==='GET' && /^\/api\/analyses\/[a-f0-9]{36}$/.test(url.pathname)) {
    const row=db.prepare('SELECT * FROM analyses WHERE id=?').get(url.pathname.split('/').at(-1));return json(res,200,safeAnalysis(row,session,user));
  }
  if(req.method!=='POST') bad('지원하지 않는 요청입니다.',405);
  verifyOrigin(req);
  requireJson(req);
  const b=await body(req);
  if(url.pathname==='/api/register') {
    const email=String(b.email||'').trim().toLowerCase(), password=String(b.password||'');
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length>200 || password.length<10 || password.length>128) bad('이메일과 10자 이상 비밀번호를 확인해주세요.');
    if(db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) bad('이미 가입된 이메일입니다.',409);
    const id=randomId(), code=crypto.randomBytes(5).toString('hex').toUpperCase();
    const inviter=String(b.ref||'').trim().toUpperCase(); const parent=inviter ? db.prepare('SELECT id FROM users WHERE code=?').get(inviter) : null;
    db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?)').run(id,email,passwordHash(password),code,parent?.id||null,0,now());
    db.prepare('UPDATE analyses SET user_id=? WHERE session_hash=? AND user_id IS NULL').run(id,session.token_hash);
    rotateSession(res,session,id);
    // Count one actual registered account once; do not count visits, links, or a user's own code.
    if(parent && parent.id!==id) {
      db.prepare('INSERT INTO referrals VALUES (?,?,?)').run(id,parent.id,now());
      const n=db.prepare('SELECT count(*) AS n FROM referrals WHERE inviter_id=?').get(parent.id).n;
      if(n%5===0) db.prepare('UPDATE users SET credits=credits+1 WHERE id=?').run(parent.id);
      event('referral_registered',parent.id);
    }
    event('registered',id);return json(res,201,view(userOf({...session,user_id:id})));
  }
  if(url.pathname==='/api/login') {
    const email=String(b.email||'').trim().toLowerCase();
    const password=String(b.password||'');
    if(email.length>200 || password.length>128) bad('이메일 또는 비밀번호를 확인해주세요.',401);
    const key=checkLoginLimit(req,email);
    const found=db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if(!found || !passwordMatches(password,found.password)){
      loginAttempts.get(key).count++;
      bad('이메일 또는 비밀번호를 확인해주세요.',401);
    }
    loginAttempts.delete(key);
    db.prepare('UPDATE analyses SET user_id=? WHERE session_hash=? AND user_id IS NULL').run(found.id,session.token_hash);
    rotateSession(res,session,found.id);
    event('login',found.id);return json(res,200,view(userOf({...session,user_id:found.id})));
  }
  if(url.pathname==='/api/logout') { rotateSession(res,session); return json(res,200,view(null)); }
  if(url.pathname==='/api/manse') {
    const count=db.prepare('SELECT count(*) n FROM analyses WHERE session_hash=? AND created_at>?').get(session.token_hash,new Date(Date.now()-86400000).toISOString()).n;
    if(count>=20) bad('하루 계산 횟수에 도달했습니다. 내일 다시 이용해주세요.',429);
    const chart=calculateManse(b);
    const priority=['연애','금전','결혼','직업','건강','가족','부동산'].includes(b.priority)?b.priority:'연애';
    const report=interpretRules(chart,{priority,mode:b.mode==='date'?'date':'solo'});
    const id=randomId();db.prepare('INSERT INTO analyses(id,session_hash,user_id,body,created_at,chart_json) VALUES(?,?,?,?,?,?)').run(id,session.token_hash,user?.id||null,report,now(),JSON.stringify(chart));
    event('manse_calculated',user?.id);return json(res,201,safeAnalysis(db.prepare('SELECT * FROM analyses WHERE id=?').get(id),session,user));
  }
  if(url.pathname==='/api/account/delete') {
    if(!user) bad('먼저 로그인해주세요.',401);
    db.prepare('DELETE FROM analyses WHERE user_id=?').run(user.id);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
    db.prepare('DELETE FROM referrals WHERE referred_id=? OR inviter_id=?').run(user.id,user.id);
    db.prepare('DELETE FROM access_grants WHERE user_id=?').run(user.id);
    db.prepare('DELETE FROM users WHERE id=?').run(user.id);
    event('account_deleted');return json(res,200,{ok:true});
  }
  if(url.pathname==='/api/analysis') {
    const image=String(b.image||'');
    if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length>5_600_000) bad('JPG, PNG, WEBP 이미지를 4MB 이하로 올려주세요.');
    const count=db.prepare('SELECT count(*) n FROM analyses WHERE session_hash=? AND created_at>?').get(session.token_hash,new Date(Date.now()-86400000).toISOString()).n;
    if(count>=2) bad('하루 분석 횟수에 도달했습니다. 내일 다시 이용해주세요.',429);
    let report='';
    if(process.env.OPENAI_API_KEY) report=await generateReport(image,String(b.priority||'연애').slice(0,20),b.mode==='date'?'date':'solo');
    else report='데모 모드: AI 키가 연결되면 업로드한 만세력 이미지를 근거로 12개 항목을 분석합니다. 지금은 실제 사주를 판독하거나 예측하지 않습니다.';
    if(!report) bad('이미지에서 결과를 생성하지 못했습니다. 더 선명한 캡처를 시도해주세요.',422);
    const id=randomId();db.prepare('INSERT INTO analyses(id,session_hash,user_id,body,created_at) VALUES(?,?,?,?,?)').run(id,session.token_hash,user?.id||null,report,now());
    event('analysis_created',user?.id);return json(res,201,safeAnalysis(db.prepare('SELECT * FROM analyses WHERE id=?').get(id),session,user));
  }
  if(url.pathname==='/api/redeem') {
    if(!user) bad('먼저 로그인해주세요.',401);
    if(isFreeKST()) return json(res,200,view(user));
    const result=db.prepare('UPDATE users SET credits=credits-1 WHERE id=? AND credits>0').run(user.id);
    if(!result.changes) bad('이용권이 없습니다. 추천인 5명이 가입하면 1일 이용권을 받습니다.',403);
    const expires=new Date(Date.now()+86400000).toISOString();
    db.prepare('INSERT INTO access_grants VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET expires_at=excluded.expires_at').run(user.id,expires);
    event('pass_redeemed',user.id);return json(res,200,view(userOf(session)));
  }
  if(url.pathname==='/api/event') {
    if(['card_opened','report_gate_viewed','share_clicked'].includes(b.name)) event(b.name,user?.id);
    return json(res,200,{ok:true});
  }
  bad('경로를 찾을 수 없습니다.',404);
}
export function createServer() {return http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,`http://${req.headers.host || 'localhost'}`);
    if(url.pathname.startsWith('/api/')) return await api(req,res,url);
    if(req.method!=='GET' && req.method!=='HEAD') bad('지원하지 않는 요청입니다.',405);
    const requested=url.pathname==='/' ? '/index.html' : url.pathname;
    const file=path.resolve(root,'public',`.`+requested);
    if(!file.startsWith(path.join(root,'public')+path.sep)) bad('경로를 찾을 수 없습니다.',404);
    let contents;try{contents=fs.readFileSync(file);}catch{return json(res,404,{error:'페이지를 찾을 수 없습니다.'});}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' blob: data:; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'",'Referrer-Policy':'strict-origin-when-cross-origin'});
    res.end(req.method==='HEAD'?undefined:contents);
  } catch(err) { if(!err.status) console.error(err);json(res,err.status||500,{error:err.status?err.message:'요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'}); }
});}
if(process.argv[1]===fileURLToPath(import.meta.url)) createServer().listen(PORT,()=>console.log(`Saju listening on http://localhost:${PORT}`));
