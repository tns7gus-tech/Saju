import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(),'saju-test-'));
process.env.FREE_WEEKDAY = String(({Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6})[new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',weekday:'short'}).format(new Date())]);
delete process.env.OPENAI_API_KEY;
const {createServer,isFreeKST}=await import('../server.js');
const {calculateManse}=await import('../manse.js');
const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');
const base=`http://127.0.0.1:${server.address().port}`;
test.after(()=>{server.close();fs.rmSync(process.env.DATA_DIR,{recursive:true,force:true});});

function client(){let cookie='';return async (url,body)=>{
  const res=await fetch(base+url,{method:body?'POST':'GET',headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  if(res.headers.get('set-cookie')) cookie=res.headers.get('set-cookie').split(';')[0];
  return {status:res.status,data:await res.json()};
};}

test('Korean free day switches at local midnight',()=>{
  assert.equal(isFreeKST(new Date('2026-09-25T14:59:59Z'),5),true);
  assert.equal(isFreeKST(new Date('2026-09-25T15:00:00Z'),6),true);
});

test('guest report excludes full text; registered user sees it on a free day',async()=>{
  const call=client();const first=await call('/api/bootstrap');assert.equal(first.data.user,null);
  const created=await call('/api/analysis',{image:'data:image/png;base64,iVBORw0KGgo=',priority:'연애'});
  assert.equal(created.status,201);assert.equal(created.data.full,null);assert.equal(created.data.locked,true);
  const foreign=await client()(`/api/analyses/${created.data.id}`);assert.equal(foreign.status,404);
  const register=await call('/api/register',{email:'owner@example.com',password:'very-strong-password'});
  assert.equal(register.status,201);assert.equal(register.data.canRead,true);
  const result=await call(`/api/analyses/${created.data.id}`);assert.match(result.data.full,/데모 모드/);
});

test('five real registrations grant one pass to referrer',async()=>{
  const inviter=client();let r=await inviter('/api/register',{email:'inviter@example.com',password:'very-strong-password'});
  const code=r.data.user.code;
  for(let i=0;i<5;i++){
    const guest=client();r=await guest('/api/register',{email:`friend${i}@example.com`,password:'very-strong-password',ref:code});
    assert.equal(r.status,201);
  }
  r=await inviter('/api/bootstrap');assert.equal(r.data.user.credits,1);
  const dup=await client()('/api/register',{email:'friend0@example.com',password:'very-strong-password',ref:code});assert.equal(dup.status,409);
});

test('changing accounts on one browser does not transfer saved results',async()=>{
  const call=client();await call('/api/bootstrap');
  await call('/api/register',{email:'alice@example.com',password:'very-strong-password'});
  const created=await call('/api/analysis',{image:'data:image/png;base64,iVBORw0KGgo='});
  assert.equal(created.status,201);
  await call('/api/logout',{});
  await call('/api/register',{email:'bob@example.com',password:'very-strong-password'});
  const result=await call(`/api/analyses/${created.data.id}`);
  assert.equal(result.status,404);
});

test('local manse generates dated pillars and a gated deterministic report without an API key',async()=>{
  const call=client();await call('/api/bootstrap');
  const result=await call('/api/manse',{calendar:'solar',date:'2024-02-06',time:'12:30',gender:'male',mode:'date',priority:'연애'});
  assert.equal(result.status,201);assert.equal(result.data.chart.pillars[0].hanja,'甲辰');
  assert.equal(result.data.chart.pillars.length,4);
  assert.equal(Object.values(result.data.chart.elements).reduce((a,b)=>a+b,0),8);
  assert.ok(result.data.chart.luck.periods.length>0);
  assert.equal(result.data.full,null);
  const user=await call('/api/register',{email:'birth@example.com',password:'very-strong-password'});
  assert.equal(user.data.canRead,true);
  const unlocked=await call(`/api/analyses/${result.data.id}`);
  assert.match(unlocked.data.full,/계산된 원국/);
});

test('missing birth time does not fabricate an hour pillar or precise luck start',()=>{
  const chart=calculateManse({date:'2024-02-06',calendar:'solar',gender:'male'});
  assert.equal(chart.pillars[3].unknown,true);
  assert.equal(chart.luck,null);
  assert.equal(Object.values(chart.elements).reduce((a,b)=>a+b,0),6);
  assert.throws(()=>calculateManse({date:'2024-02-31',time:'12:00'}),/양력 날짜/);
});
