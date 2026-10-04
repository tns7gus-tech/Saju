import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createHomeServer} from '../home-server.js';
import {createLocalLLM} from '../backend/local-llm.js';
import {SAJU_EXPERT_PROMPT,SAJU_PREVIEW_PROMPT,REPORT_TITLES} from '../backend/saju-prompt.js';
import {calculate} from '../backend/engine.js';
import {planReading} from '../backend/ai-readings.js';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sai-home-'));
let base,aiFailure=false,subject='kakao-one',calls=0;
const request=async(url,options)=>{
 const address=String(url);
 if(address.includes('/oauth/token')||address.includes('/oauth2.0/token'))return Response.json({access_token:'private-access-token'});
 if(address.includes('kapi.kakao.com'))return Response.json({id:subject,properties:{nickname:'여행자'}});
 if(address.includes('openapi.naver.com'))return Response.json({resultcode:'00',response:{id:'naver-one',nickname:'여행자'}});
 if(address.includes('/api/chat')){calls++;const payload=JSON.parse(options.body);assert.equal(payload.messages.length,2);assert.ok([SAJU_EXPERT_PROMPT,SAJU_PREVIEW_PROMPT].includes(payload.messages[0].content));if(aiFailure)return new Response('',{status:500});
   function fill(schema){if(schema.type==='object')return Object.fromEntries(Object.entries(schema.properties).map(([k,v])=>[k,fill(v)]));if(schema.type==='array')return Array.from({length:schema.minItems||0},(_,i)=>{const value=fill(schema.items);return typeof value==='string'?value+' '+(i+1):value;});const value=schema.enum?.[0]||'AI가 새로 작성한 해석입니다.';return value.repeat(Math.max(1,Math.ceil((schema.minLength||1)/value.length)));}
   const data=payload.format?fill(payload.format):null;
   if(data?.lines)data.lines.forEach((l,i)=>l.category=i<18?['연애','결혼','연인','자산·소비','일·사업','건강·컨디션'][Math.floor(i/3)]:'자리 게임');
   const content=data?JSON.stringify(data):'자기 탐색을 위한 이야기입니다.\n작은 실천을 해보세요.';
   if(payload.stream)return new Response(JSON.stringify({message:{content:content.slice(0,11)}})+'\n'+JSON.stringify({message:{content:content.slice(11)},done:true})+'\n',{headers:{'Content-Type':'application/x-ndjson'}});
   return Response.json({message:{content}});
 }
 throw Error('Unexpected request');
};
// A mutable env allows the ephemeral test port to be set as its origin.
const env={HOME_DATA_DIR:temp,KAKAO_CLIENT_ID:'test',KAKAO_CLIENT_SECRET:'secret',NAVER_CLIENT_ID:'test',NAVER_CLIENT_SECRET:'secret',OLLAMA_MODEL:'test'};
// Allocate a port first, then construct using that actual configured origin.
import net from 'node:net';
const probe=net.createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));
base=`http://127.0.0.1:${port}`;env.PUBLIC_ORIGIN=base;
const server=createHomeServer({env,request});server.listen(port,'127.0.0.1');await once(server,'listening');
test.after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true});});
function client(){let cookie='',csrf='';return {
 async call(url,body,headers={}){const res=await fetch(base+url,{redirect:'manual',method:body===undefined?'GET':'POST',headers:{Cookie:cookie,...(body===undefined?{}:{'Content-Type':'application/json',Origin:base,'X-CSRF-Token':csrf}),...headers},body:body===undefined?undefined:JSON.stringify(body)});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];const type=res.headers.get('content-type');const data=type?.includes('application/json')?await res.json():await res.text();if(data.csrf)csrf=data.csrf;return {status:res.status,data,location:res.headers.get('location'),cookie};},
 async login(provider='kakao',link=false){const start=await this.call(`/auth/${provider}/start${link?'?link=1':''}`);assert.equal(start.status,302);const state=new URL(start.location).searchParams.get('state');return {state,result:await this.call(`/auth/${provider}/callback?code=test&state=${state}`)};}
};}
const input={calendar:'solar',date:'2000-06-15',time:'09:30',gender:'male'};
test('static allowlist hides secrets and injects real API adapter',async()=>{const c=client();assert.equal((await c.call('/.env')).status,404);assert.equal((await c.call('/home-server.js')).status,404);const page=await c.call('/');assert.match(page.data,/server-api.js/);assert.doesNotMatch(page.data,/demo-api.js/);});
test('OAuth state is bound to browser, one-use and session rotates',async()=>{const c=client(),other=client();await c.call('/api/session');const before=(await c.call('/api/session')).cookie;const start=await c.call('/auth/kakao/start');const state=new URL(start.location).searchParams.get('state');assert.equal((await other.call(`/auth/kakao/callback?code=test&state=${state}`)).status,403);const done=await c.call(`/auth/kakao/callback?code=test&state=${state}`);assert.equal(done.status,302);assert.notEqual(done.cookie,before);assert.equal((await c.call(`/auth/kakao/callback?code=test&state=${state}`)).status,403);const session=await c.call('/api/session');assert.equal(session.data.account.providers[0],'kakao');assert.doesNotMatch(JSON.stringify(session.data),/private-access-token|secret/);});
test('server auth, CSRF, profile persistence and daily quota',async()=>{const guest=client();await guest.call('/api/session');assert.equal((await guest.call('/api/profile',{input})).status,401);const c=client();await c.login();await c.call('/api/session');assert.equal((await c.call('/api/profile',{input},{Origin:'https://evil.example'})).status,403);assert.equal((await c.call('/api/profile',{input},{'X-CSRF-Token':'bad'})).status,403);assert.equal((await c.call('/api/profile',{input})).status,200);const other=client();subject='kakao-two';await other.login();await other.call('/api/session');assert.equal((await other.call('/api/session')).data.account.profile,null);subject='kakao-one';const reconnect=client();await reconnect.login();await reconnect.call('/api/session');assert.equal((await reconnect.call('/api/session')).data.account.profile.date,input.date);const a=await c.call('/api/daily',{input}),b=await c.call('/api/daily',{input:{...input,date:'2001-01-01'}});assert.deepEqual(a.data.result,b.data.result);});
test('failed AI does not consume quota, success is saved, repeated call blocked',async()=>{const c=client();await c.login();await c.call('/api/session');aiFailure=true;assert.equal((await c.call('/api/consultation',{input,question:'이직을 고민하고 있습니다.'})).status,503);assert.deepEqual((await c.call('/api/session')).data.account.consults,{});aiFailure=false;assert.equal((await c.call('/api/consultation',{input,question:'이직을 고민하고 있습니다.'})).status,200);const count=calls;assert.equal((await c.call('/api/consultation',{input,question:'이직을 고민하고 있습니다.'})).status,409);assert.equal(calls,count);});
test('explicit provider link shares account, conflicting link fails; deletion invalidates sessions',async()=>{const c=client();await c.login();await c.call('/api/session');const id=(await c.call('/api/session')).data.account.id;assert.equal((await c.login('naver',true)).result.status,302);await c.call('/api/session');assert.deepEqual((await c.call('/api/session')).data.account.providers.sort(),['kakao','naver']);const n=client();await n.login('naver');await n.call('/api/session');assert.equal((await n.call('/api/session')).data.account.id,id);const other=client();subject='kakao-three';await other.login();await other.call('/api/session');assert.equal((await other.login('naver',true)).result.status,409);subject='kakao-one';await c.call('/api/account/delete',{});assert.equal((await n.call('/api/session')).data.account,null);});
test('local AI rejects remote endpoint and bounds concurrent work',async()=>{assert.throws(()=>createLocalLLM({OLLAMA_URL:'https://remote.example'}),/로컬/);let release;const llm=createLocalLLM({OLLAMA_MODEL:'test'},()=>new Promise(r=>release=()=>r(Response.json({message:{content:JSON.stringify({paragraphs:['짧은 응답입니다.']})}}))));const first=llm(calculate(input),'질문',[]);await assert.rejects(llm(calculate(input),'질문',[]),e=>e.status===503);release();await first;});
test('public server requires HTTPS origin',()=>assert.throws(()=>createHomeServer({env:{NODE_ENV:'production',PUBLIC_ORIGIN:'http://example.com'}}),/HTTPS/));

test('all reading paths use local AI, cache is private and invalid inputs never call AI',async()=>{
 const c=client();await c.call('/api/session');
 for(const kind of ['quick','full','saju','compatibility','decade','annual','dates']){
  const params=kind==='compatibility'?{other:input,relation:'친구'}:kind==='dates'?{start:'2026-10-01',end:'2026-10-03',purpose:'work'}:{year:2026,month:10};
  const before=calls,result=await c.call('/api/reading',{kind,input,params});assert.equal(result.status,200,kind);assert.equal(result.data.result.source,'local-llm');assert.equal(calls,before+1);assert.match(JSON.stringify(result.data.result),/AI가 새로/);
  const cached=await c.call('/api/reading',{kind,input,params});assert.equal(cached.data.cached,true);assert.equal(calls,before+1);
 }
 const other=client();await other.call('/api/session');const before=calls;assert.equal((await other.call('/api/reading',{kind:'quick',input,params:{year:2026,month:10}})).data.cached,false);assert.equal(calls,before+1);
 const count=calls;assert.equal((await c.call('/api/reading',{kind:'unknown',input})).status,400);assert.equal((await c.call('/api/reading',{kind:'full',input,params:{month:13}})).status,400);assert.equal((await c.call('/api/reading',{kind:'decade',input:{...input,time:''}})).status,400);assert.equal(calls,count);
});
test('AI failure never returns rule-generated reading or caches it',async()=>{const c=client();await c.call('/api/session');aiFailure=true;assert.equal((await c.call('/api/reading',{kind:'full',input})).status,503);aiFailure=false;const result=await c.call('/api/reading',{kind:'full',input});assert.equal(result.data.cached,false);assert.equal(result.data.result.source,'local-llm');});

test('short readings reject missing, repeated or oversized sentences',()=>{
 const quick=planReading('quick',input,{year:2026,month:10});assert.equal(quick.maxTokens,96);assert.equal(quick.schema.properties.paragraphs.maxItems,1);
 for(const paragraphs of [[],['같은 설명','같은 설명','같은 설명'],['가'.repeat(41),'둘째','셋째'],['JSON 스키마','둘째','셋째']])assert.throws(()=>quick.validate({paragraphs}),/형식/);
 const full=planReading('full',input);assert.equal(full.validate({paragraphs:['첫째 문장']}).sections.length,12);
 assert.throws(()=>planReading('section',input,{reportKind:'full',section:12}),/항목/);
});
test('stream emits deltas followed by validated result; cache skips generation',async()=>{
 const c=client();await c.call('/api/session');const before=calls;
 const first=await c.call('/api/reading',{kind:'topic',input,params:{topic:'연애'},stream:true});
 const events=first.data.trim().split('\n').map(JSON.parse);assert.equal(events[0].type,'delta');assert.equal(events.at(-1).type,'result');assert.equal(events.at(-1).result.paragraphs.length,1);assert.equal(calls,before+1);
 const cached=await c.call('/api/reading',{kind:'topic',input,params:{topic:'연애'},stream:true});const saved=cached.data.trim().split('\n').map(JSON.parse);assert.equal(saved.length,1);assert.equal(saved[0].cached,true);assert.equal(calls,before+1);
 const catalog=await c.call('/api/reading',{kind:'catalog',input,params:{reportKind:'full'}});assert.equal(catalog.data.result.sections.length,12);assert.equal(calls,before+1);
 const section=await c.call('/api/reading',{kind:'section',input,params:{reportKind:'full',section:0},stream:true});assert.equal(section.data.trim().split('\n').map(JSON.parse).at(-1).result.paragraphs.length,3);assert.equal(calls,before+2);
});
test('truncated Ollama stream fails instead of accepting partial output',async()=>{
 const llm=createLocalLLM({OLLAMA_MODEL:'test'},async()=>new Response(JSON.stringify({message:{content:'부분 답변'}})+'\n'));
 await assert.rejects(llm.generate(calculate(input),'질문',{}, {onDelta:()=>{}}),e=>e.status===503);
});

test('expert prompt, twelve sections and factual evidence replace legacy interpretations',()=>{
 const catalog=planReading('catalog',input,{reportKind:'full'});assert.deepEqual(catalog.catalog.sections.map(s=>s.title),REPORT_TITLES.map((t,i)=>`${i+1}. ${t}`));
 const detail=planReading('section',input,{reportKind:'full',section:3});assert.equal(detail.maxTokens,5000);assert.ok(detail.schema.properties.paragraphs.items.maxLength>40);assert.match(detail.question,/3~6문단/);assert.equal(detail.evidence.reference,undefined);assert.equal(detail.evidence.facts.luck.startAfterBirth.years,calculate(input).luck.start[0]);assert.equal(detail.evidence.facts.luck.start,undefined);assert.equal(detail.evidence.facts.luck.periods[0].startAge,undefined);assert.equal(detail.evidence.profile,undefined);assert.equal(detail.evidence.facts.annualLuck.length,5);assert.equal(planReading('section',input,{reportKind:'full',section:2}).evidence.facts.annualLuck.length,81);
 const unknown=planReading('section',{...input,time:'',gender:''},{reportKind:'full',section:9});assert.equal(unknown.evidence.facts.luck,null);assert.ok(unknown.evidence.facts.missingInformation.includes('출생시각·시주: 미입력'));
 const annual=planReading('section',input,{reportKind:'annual',year:2027,section:0});assert.equal(annual.evidence.facts.requestedPeriod.month,1);
 assert.throws(()=>detail.validate({paragraphs:['짧은 첫째','짧은 둘째','짧은 셋째']}),/형식/);
 assert.doesNotThrow(()=>detail.validate({paragraphs:['첫 항목의 설명을 충분히 자세하게 풀어 쓴 문장입니다.'.repeat(4),'둘째 항목의 설명입니다.'.repeat(8),'셋째 항목의 설명입니다.'.repeat(8)]}));
});

test('icon topic uses compact preview while explicit section keeps expert report',()=>{
 const icon=planReading('topic',input,{topic:'연애'}),section=planReading('section',input,{reportKind:'full',section:5});assert.equal(icon.fast,true);assert.equal(icon.maxTokens,96);assert.equal(icon.schema.properties.paragraphs.maxItems,1);assert.equal(section.fast,false);assert.equal(section.maxTokens,5000);
});
