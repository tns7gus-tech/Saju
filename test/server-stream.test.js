import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../server-api.js',import.meta.url),'utf8');
async function adapter(events){
 const context={window:{},Intl,Date,TextDecoder,fetch:async(url,options)=>{
  if(url==='/api/session')return Response.json({account:null,csrf:'test-csrf',providers:[]});
  assert.equal(options.headers['X-CSRF-Token'],'test-csrf');assert.equal(JSON.parse(options.body).stream,true);
  const bytes=new TextEncoder().encode(events.map(e=>JSON.stringify(e)+'\n').join(''));
  return new Response(new ReadableStream({start(controller){for(let i=0;i<bytes.length;i+=7)controller.enqueue(bytes.slice(i,i+7));controller.close();}}),{headers:{'Content-Type':'application/x-ndjson'}});
 }};vm.runInNewContext(source,context);await context.window.SaiDemoAPI.ready;return context.window.SaiDemoAPI;
}
test('browser decodes split UTF-8 and JSON escapes into provisional plain text',async()=>{
 const raw=JSON.stringify({paragraphs:['한국어를 읽어요.','"따옴표"도 보여요.','줄바꿈\n문장이에요.']});
 const events=Array.from(raw,text=>({type:'delta',text}));events.push({type:'result',result:{paragraphs:['검증된 결과']}});
 const api=await adapter(events),updates=[];const result=await api.reading('quick',{input:{}},{},text=>updates.push(text));
 assert.equal(result.paragraphs[0],'검증된 결과');assert.equal(updates.at(-1),'한국어를 읽어요.\n"따옴표"도 보여요.\n줄바꿈\n문장이에요.');assert.ok(updates.some(t=>t==='한국어를'));assert.ok(updates.every(t=>!t.includes('paragraphs')));
});
test('browser rejects stream errors and missing final validation event',async()=>{
 const error=await adapter([{type:'delta',text:'{"paragraphs":["초안"'},{type:'error',error:'형식 오류'}]);await assert.rejects(error.reading('quick',{input:{}}),/형식 오류/);
 const truncated=await adapter([{type:'delta',text:'{"paragraphs":["초안"'}]);await assert.rejects(truncated.reading('quick',{input:{}}),/연결이 끊겼습니다/);
});
