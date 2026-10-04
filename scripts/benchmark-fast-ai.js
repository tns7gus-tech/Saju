// Synthetic input only; no account or real birth information is used.
const base='http://127.0.0.1:3000';
const session=await fetch(base+'/api/session');const cookie=session.headers.get('set-cookie').split(';')[0],{csrf}=await session.json();
const input={calendar:'solar',date:'2000-06-15',time:'09:30',gender:'male'};
for(const [kind,params] of [['quick',{year:2026,month:10}],['topic',{year:2026,month:10,topic:'연애'}],['topic',{year:2026,month:10,topic:'일·사업'}],['topic',{year:2026,month:10,topic:'건강·컨디션'}],['quick',{year:2026,month:10}]]){
 const start=performance.now();let first=null,firstSentence=null,result;
 const response=await fetch(base+'/api/reading',{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({kind,input,params,stream:true})});
 if(!response.ok)throw Error(await response.text());
 const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',raw='';
 while(true){const {value,done}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});let index;while((index=pending.indexOf('\n'))>=0){const event=JSON.parse(pending.slice(0,index));pending=pending.slice(index+1);if(event.type==='error')throw Error(event.error);if(event.type==='delta'){first??=(performance.now()-start)/1000;raw+=event.text;if(/"paragraphs"\s*:\s*\[\s*"(?:[^"\\]|\\.)*"/.test(raw))firstSentence??=(performance.now()-start)/1000;}if(event.type==='result')result=event;}}
 if(!result)throw Error('Missing validated result');
 console.log(JSON.stringify({kind,cached:result.cached,firstTokenSeconds:first,firstSentenceSeconds:firstSentence,completeSeconds:(performance.now()-start)/1000,paragraphs:result.result.paragraphs}));
}
