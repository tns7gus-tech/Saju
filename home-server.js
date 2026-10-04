import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {calculate,insights,today} from './backend/engine.js';
import {configuration,authorization,identity} from './backend/oauth.js';
import {generateReading,planReading,PROMPT_VERSION} from './backend/ai-readings.js';
import {chartFacts} from './backend/saju-prompt.js';
import {createLocalLLM} from './backend/local-llm.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const random=()=>crypto.randomBytes(32).toString('hex');
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const allowed=new Set(['index.html','pages.css','experience.css','pages.js','ai-loading.js','reading-rules.js','insight-engine.js','server-api.js','experience.js','manse-visual.js','vendor/lunar.js','assets/sai-mascot.png','assets/sai-seasons.png','assets/sai-companions.png']);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};
export function createHomeServer({env=process.env,request=fetch}={}){
  const production=env.NODE_ENV==='production';
  const origin=new URL(env.PUBLIC_ORIGIN||'http://127.0.0.1:3000');
  if(origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password||!['http:','https:'].includes(origin.protocol))throw Error('PUBLIC_ORIGIN에는 사이트의 기본 주소만 입력해주세요.');
  if(production&&origin.protocol!=='https:')throw Error('공개 서비스의 PUBLIC_ORIGIN은 HTTPS여야 합니다.');
  const dataDir=path.resolve(env.HOME_DATA_DIR||path.join(root,'data','home'));
  fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
  const db=new DatabaseSync(path.join(dataDir,'sai.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,name TEXT NOT NULL,profile TEXT);
    CREATE TABLE IF NOT EXISTS identities(provider TEXT,subject TEXT,user_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,PRIMARY KEY(provider,subject),UNIQUE(provider,user_id));
    CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS oauth(state_hash TEXT PRIMARY KEY,session_hash TEXT NOT NULL,provider TEXT NOT NULL,link_user TEXT,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS readings(user_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,kind TEXT,day TEXT,body TEXT NOT NULL,PRIMARY KEY(user_id,kind,day));
    CREATE TABLE IF NOT EXISTS generated(session_hash TEXT REFERENCES sessions(hash) ON DELETE CASCADE,cache_key TEXT,body TEXT NOT NULL,expires INTEGER NOT NULL,PRIMARY KEY(session_hash,cache_key));`);
  const llm=createLocalLLM(env,request),pending=new Set(),rates=new Map(),inflight=new Map();
  const cookieName=production?'__Host-sai_session':'sai_session';
  const cookie=(res,token)=>res.setHeader('Set-Cookie',`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${production?'; Secure':''}`);
  function newSession(res,user=null){const token=random(),s={hash:hash(token),user_id:user,csrf:random(),expires:Date.now()+30*86400000};db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(s.hash,s.user_id,s.csrf,s.expires);cookie(res,token);return s;}
  function getSession(req,res){const match=new RegExp(`(?:^|;\\s*)${cookieName}=([a-f0-9]{64})(?:;|$)`).exec(req.headers.cookie||'');return match&&db.prepare('SELECT * FROM sessions WHERE hash=? AND expires>?').get(hash(match[1]),Date.now())||newSession(res);}
  function account(s){if(!s.user_id)return null;const a=db.prepare('SELECT * FROM accounts WHERE id=?').get(s.user_id);if(!a)return null;
    const result={id:a.id,name:a.name,profile:a.profile?JSON.parse(a.profile):null,providers:db.prepare('SELECT provider FROM identities WHERE user_id=?').all(a.id).map(x=>x.provider),daily:{},consults:{},orders:[]};
    for(const r of db.prepare('SELECT * FROM readings WHERE user_id=? ORDER BY day DESC LIMIT 120').all(a.id))result[r.kind==='daily'?'daily':'consults'][r.day]=JSON.parse(r.body);
    return result;
  }
  const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  const redirect=(res,to)=>{res.writeHead(302,{Location:to,'Cache-Control':'no-store'});res.end();};
  function rate(req){const key=req.socket.remoteAddress||'unknown',now=Date.now();let entry=rates.get(key);if(!entry||entry.until<now){entry={n:0,until:now+60000};rates.set(key,entry);}if(++entry.n>120)fail('요청이 많습니다. 잠시 후 다시 시도해주세요.',429);if(rates.size>5000){for(const [k,v] of rates)if(v.until<now)rates.delete(k);}}
  async function body(req,s){if(req.headers.origin!==origin.origin||req.headers['sec-fetch-site']==='cross-site'||req.headers['x-csrf-token']!==s.csrf)fail('요청 인증을 확인해주세요. 페이지를 새로고침해주세요.',403);if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail('JSON 요청이 필요합니다.',415);let raw='';let size=0;for await(const chunk of req){size+=chunk.length;if(size>16384)fail('요청이 너무 큽니다.',413);raw+=chunk;}try{return JSON.parse(raw||'{}');}catch{fail('요청 형식이 잘못되었습니다.');}}
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
    let wantsStream=false;
    const event=data=>{if(res.destroyed)return;if(!res.headersSent){res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Accel-Buffering':'no'});res.flushHeaders();}res.write(JSON.stringify(data)+'\n');};
    const delta=text=>event({type:'delta',text});
    const reply=data=>{if(!wantsStream)return json(res,200,data);event({type:'result',...data});res.end();};
    try{
      const url=new URL(req.url,origin);
      if(url.pathname==='/healthz')return json(res,200,{ok:true});
      if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/')){
        rate(req);
        db.prepare('DELETE FROM oauth WHERE expires<?').run(Date.now());db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
        let s=getSession(req,res);
        if(req.method==='GET'&&url.pathname==='/api/session')return json(res,200,{account:account(s),csrf:s.csrf,providers:['kakao','naver'].filter(p=>configuration(p,env)),aiConfigured:!!env.OLLAMA_MODEL});
        const route=/^\/auth\/(kakao|naver)\/(start|callback)$/.exec(url.pathname);
        if(route&&req.method==='GET'){
          const [,provider,action]=route,c=configuration(provider,env),callback=`${origin.origin}/auth/${provider}/callback`;
          if(!c)fail('소셜 로그인 앱 설정이 필요합니다.',503);
          if(action==='start'){
            if(req.headers['sec-fetch-site']==='cross-site')fail('페이지에서 로그인 버튼을 눌러주세요.',403);
            const link=url.searchParams.get('link')==='1';if(link&&!s.user_id)fail('연동하려면 먼저 로그인해주세요.',401);
            const state=random();db.prepare('INSERT INTO oauth VALUES(?,?,?,?,?)').run(hash(state),s.hash,provider,link?s.user_id:null,Date.now()+600000);
            return redirect(res,authorization(c,callback,state));
          }
          const state=url.searchParams.get('state')||'',entry=db.prepare('SELECT * FROM oauth WHERE state_hash=?').get(hash(state));
          if(!entry||entry.provider!==provider||entry.session_hash!==s.hash||entry.expires<Date.now())fail('로그인 요청이 만료되었거나 일치하지 않습니다. 다시 로그인해주세요.',403);
          db.prepare('DELETE FROM oauth WHERE state_hash=?').run(hash(state));
          if(url.searchParams.has('error'))return redirect(res,'/?auth_error=cancelled');
          const code=url.searchParams.get('code');if(!code||code.length>2048)fail('로그인 코드가 없습니다.');
          const person=await identity(c,provider,callback,code,state,request);
          if(!db.prepare('SELECT 1 FROM sessions WHERE hash=? AND expires>?').get(s.hash,Date.now()))fail('로그인 요청을 다시 시작해주세요.',403);
          const found=db.prepare('SELECT user_id FROM identities WHERE provider=? AND subject=?').get(provider,person.subject);
          let user;
          db.exec('BEGIN IMMEDIATE');
          try{
            if(entry.link_user){
              if(s.user_id!==entry.link_user||!db.prepare('SELECT 1 FROM sessions WHERE hash=? AND user_id=? AND expires>?').get(s.hash,s.user_id,Date.now()))fail('계정 연동을 다시 시작해주세요.',403);
              if(found&&found.user_id!==s.user_id)fail('다른 계정에 연결된 로그인입니다.',409);
              const linked=db.prepare('SELECT subject FROM identities WHERE provider=? AND user_id=?').get(provider,s.user_id);
              if(linked&&linked.subject!==person.subject)fail('이미 다른 소셜 계정이 연결되어 있습니다.',409);
              user=s.user_id;
            }else user=found?.user_id;
            if(!user){user=random();db.prepare('INSERT INTO accounts VALUES(?,?,NULL)').run(user,person.name);}
            if(!found)db.prepare('INSERT INTO identities VALUES(?,?,?)').run(provider,person.subject,user);
            db.prepare('DELETE FROM sessions WHERE hash=?').run(s.hash);s=newSession(res,user);db.exec('COMMIT');
          }catch(e){db.exec('ROLLBACK');throw e;}
          return redirect(res,'/');
        }
        if(req.method!=='POST')fail('경로를 찾을 수 없습니다.',404);
        const b=await body(req,s);
        if(!b||typeof b!=='object'||Array.isArray(b))fail('요청 형식을 확인해주세요.');
        wantsStream=b.stream===true&&['/api/reading','/api/daily','/api/consultation'].includes(url.pathname);
        if(url.pathname==='/api/reading'){
          if(!['quick','topic','section','catalog','full','saju','compatibility','decade','annual','dates'].includes(b.kind))fail('지원하지 않는 해석입니다.');
          const params=b.params||{};if(typeof params!=='object'||Array.isArray(params))fail('해석 조건을 확인해주세요.');
          try{planReading(b.kind,b.input,params);}catch(e){fail(e.message);}
          db.prepare('DELETE FROM generated WHERE expires<?').run(Date.now());
          const key=hash(JSON.stringify({kind:b.kind,input:b.input,params,day:today(),model:env.OLLAMA_MODEL,version:PROMPT_VERSION}));
          const cached=db.prepare('SELECT body FROM generated WHERE session_hash=? AND cache_key=?').get(s.hash,key);
          if(cached)return reply({result:JSON.parse(cached.body),cached:true});
          const jobKey=s.hash+key;let job=inflight.get(jobKey);
          if(!job){
            job={listeners:new Set(),content:''};if(wantsStream)job.listeners.add(delta);
            job.promise=generateReading(llm,env,b.kind,b.input,params,text=>{job.content+=text;for(const listener of job.listeners)listener(text);});inflight.set(jobKey,job);
          }else if(wantsStream){job.listeners.add(delta);if(job.content)delta(job.content);}
          const disconnect=()=>job.listeners.delete(delta);res.once('close',disconnect);
          let result;try{result=await job.promise;}finally{disconnect();res.off('close',disconnect);if(inflight.get(jobKey)===job)inflight.delete(jobKey);}
          if(!db.prepare('SELECT 1 FROM sessions WHERE hash=? AND expires>?').get(s.hash,Date.now()))fail('페이지를 새로고침해주세요.',401);
          db.prepare('INSERT OR REPLACE INTO generated VALUES(?,?,?,?)').run(s.hash,key,JSON.stringify(result),Date.now()+86400000);
          return reply({result,cached:false});
        }
        if(!s.user_id)fail('로그인이 필요합니다.',401);
        if(url.pathname==='/api/logout'){db.prepare('DELETE FROM sessions WHERE hash=?').run(s.hash);s=newSession(res);return json(res,200,{account:null,csrf:s.csrf});}
        if(url.pathname==='/api/account/delete'){if(pending.has(s.user_id))fail('상담 완료 후 다시 시도해주세요.',409);db.prepare('DELETE FROM oauth WHERE link_user=? OR session_hash=?').run(s.user_id,s.hash);db.prepare('DELETE FROM accounts WHERE id=?').run(s.user_id);s=newSession(res);return json(res,200,{account:null,csrf:s.csrf});}
        if(url.pathname==='/api/profile'){let c;try{c=calculate(b.input);}catch(e){fail(e.message);}db.prepare('UPDATE accounts SET profile=? WHERE id=?').run(JSON.stringify(c.input),s.user_id);return json(res,200,{account:account(s)});}
        if(url.pathname==='/api/daily'||url.pathname==='/api/consultation'){
          const kind=url.pathname==='/api/daily'?'daily':'consult',day=today();
          const old=db.prepare('SELECT body FROM readings WHERE user_id=? AND kind=? AND day=?').get(s.user_id,kind,day);
          if(old&&JSON.parse(old.body).source==='local-llm'&&(kind==='consult'||JSON.parse(old.body).promptVersion===PROMPT_VERSION)){if(kind==='consult')fail('오늘의 무료 상담을 사용했어요. 마이페이지에서 다시 볼 수 있습니다.',409);return reply({result:JSON.parse(old.body),account:account(s)});}
          let c;try{c=calculate(b.input);}catch(e){fail(e.message);}
          let result;
          if(kind==='consult'&&(typeof b.question!=='string'||b.question.trim().length<5||b.question.length>500))fail('고민을 5~500자로 적어주세요.');
          if(pending.has(s.user_id))fail('AI 답변을 작성 중입니다.',409);
          pending.add(s.user_id);
          try{
            if(kind==='daily')result=await generateReading(llm,env,'daily',c.input,{},wantsStream?delta:undefined);
            else{const [y,m,d]=day.split('-').map(Number),f=insights.frame(c,y,m,d);result={...await llm(c,b.question,{facts:chartFacts(c,{year:y,month:m}),requestedDay:day,userQuestion:b.question},wantsStream?delta:undefined),question:b.question,day};}
            if(!db.prepare('SELECT 1 FROM sessions WHERE hash=? AND user_id=? AND expires>?').get(s.hash,s.user_id,Date.now()))fail('다시 로그인해주세요.',401);
          }finally{pending.delete(s.user_id);}
          db.prepare('INSERT INTO readings VALUES(?,?,?,?) ON CONFLICT(user_id,kind,day) DO UPDATE SET body=excluded.body').run(s.user_id,kind,day,JSON.stringify(result));return reply({result,account:account(s)});
        }
        fail('경로를 찾을 수 없습니다.',404);
      }
      if(!['GET','HEAD'].includes(req.method))fail('지원하지 않는 요청입니다.',405);
      const name=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';if(!allowed.has(name))fail('페이지를 찾을 수 없습니다.',404);
      let data=fs.readFileSync(path.join(root,name));
      if(name==='index.html')data=Buffer.from(data.toString().replace('./demo-api.js?v=2','./server-api.js?v=1').replace('; upgrade-insecure-requests','').replace('여기에 입력한 정보는 서버로 전송되지 않습니다.','AI 해석을 요청하면 출생 정보를 이 맥의 서버로 전송합니다. 로그인 후 저장한 정보와 상담은 서버에 보관됩니다.').replace('로그인과 결제는 무료 테스트로 체험해요','카카오·네이버 로그인으로 내 이야기를 보관해요').replace('지금은 테스트 버전으로, 로그인·계정 연동·구매는 이 브라우저에서만 체험하며 실제 인증이나 청구는 없습니다. 저장한 정보는 마이페이지에서 지울 수 있어요.','카카오·네이버로 로그인하고 출생 정보와 상담을 보관할 수 있습니다. 상담은 운영자의 맥미니에서 실행하는 로컬 AI가 작성합니다. 유료 결제는 아직 제공하지 않습니다. 마이페이지에서 계정과 저장 정보를 삭제할 수 있어요.'));
      res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
    }catch(e){const error=e.status?e.message:'요청을 처리하지 못했습니다. 서버 설정을 확인해주세요.';if(res.headersSent){event({type:'error',error});res.end();}else json(res,e.status||500,{error});}
  });
  server.on('close',()=>db.close());server.requestTimeout=30000;server.headersTimeout=10000;
  server.warmAI=()=>llm.warm();
  return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const server=createHomeServer();server.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>{console.log(`SAI home server: http://127.0.0.1:${process.env.PORT||3000}`);server.warmAI().catch(()=>console.error('모델 사전 준비에 실패했습니다. 다음 요청에서 다시 불러옵니다.'));});
}
