/* Authenticated same-origin adapter. No credentials or account data in localStorage. */
(() => {
  let account=null,csrf='',providers=[];
  async function call(url,body){
    const response=await fetch(url,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});
    const data=await response.json();if(!response.ok)throw Error(data.error||'서버 요청에 실패했습니다.');
    if('account' in data)account=data.account;if(data.csrf)csrf=data.csrf;
    if(data.providers)providers=data.providers;
    return data;
  }
  // Never insert model HTML. Partial text is provisional until server validation succeeds.
  function partialText(raw){
    const match=/"paragraphs"\s*:\s*\[/.exec(raw);if(!match)return raw.startsWith('{')?'':raw;
    const tail=raw.slice(match.index+match[0].length),values=[];let i=0;
    while(i<tail.length){while(/[\s,]/.test(tail[i]||'')&&i<tail.length)i++;if(tail[i]!== '"')break;i++;let token='',closed=false;
      while(i<tail.length){const char=tail[i++];if(char==='"'){closed=true;break;}token+=char;if(char==='\\'&&i<tail.length)token+=tail[i++];}
      try{values.push(JSON.parse('"'+token+'"'));}catch{}if(!closed)break;
    }return values.join('\n');
  }
  async function streamed(url,body,onText){
    await api.ready;
    const response=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({...body,stream:true})});
    if(!response.ok){const data=await response.json();throw Error(data.error||'AI 요청에 실패했습니다.');}
    if(!response.headers.get('content-type')?.includes('ndjson'))throw Error('AI 스트림 형식을 확인해주세요.');
    const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',raw='',final;
    const consume=line=>{if(!line.trim())return;const data=JSON.parse(line);if(data.type==='error')throw Error(data.error);if(data.type==='delta'){raw+=data.text;onText?.(partialText(raw));}if(data.type==='result')final=data;};
    try{while(true){const chunk=await reader.read();if(chunk.done)break;pending+=decoder.decode(chunk.value,{stream:true});let index;while((index=pending.indexOf('\n'))>=0){consume(pending.slice(0,index));pending=pending.slice(index+1);}}pending+=decoder.decode();consume(pending);}finally{reader.releaseLock();}
    if(!final)throw Error('답변 연결이 끊겼습니다. 다시 요청해주세요.');if('account' in final)account=final.account;return final.result;
  }
  const today=()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>p.find(x=>x.type===k).value).join('-');};
  const api={production:true,today,products:{saju:'사주',compatibility:'궁합',decade:'대운',annual:'연운',dates:'택일'},session:()=>account,
    providers:()=>providers,
    login(provider){if(!providers.includes(provider))throw Error('운영자가 소셜 로그인 앱을 설정해야 합니다.');location.assign(`/auth/${provider}/start`);},
    link(provider){if(!providers.includes(provider))throw Error('운영자가 소셜 로그인 앱을 설정해야 합니다.');location.assign(`/auth/${provider}/start?link=1`);},
    logout:()=>call('/api/logout',{}),saveProfile:input=>call('/api/profile',{input}),
    daily:(chart,onText)=>streamed('/api/daily',{input:chart.input},onText),
    consultation:(chart,question,onText)=>streamed('/api/consultation',{input:chart.input,question},onText),
    reading:(kind,chart,params={},onText)=>streamed('/api/reading',{kind,input:chart.input,params},onText),
    findOrder:()=>null,purchase(){throw Error('유료 결제는 준비 중입니다.');},reset:()=>call('/api/account/delete',{})
  };
  api.ready=call('/api/session');window.SaiDemoAPI=api;
})();
