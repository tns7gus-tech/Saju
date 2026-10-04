/* Replace this adapter with authenticated server endpoints for production.
   Browser storage is deliberately a demo, never a payment or identity boundary. */
(() => {
  'use strict';
  const KEY='sai-demo-v2',providers=['kakao','naver','google'];
  const products={saju:'사주',compatibility:'궁합',decade:'대운',annual:'연운',dates:'택일'};
  const blank=()=>({version:2,session:null,accounts:{}});
  function today(now=new Date()){
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const v=k=>p.find(x=>x.type===k).value;return `${v('year')}-${v('month')}-${v('day')}`;
  }
  function read(){
    let raw;try{raw=localStorage.getItem(KEY);}catch{throw new Error('브라우저 저장소를 사용할 수 없습니다. 사이트 저장을 허용한 뒤 다시 시도해주세요.');}
    if(!raw)return blank();
    try{const s=JSON.parse(raw);if(s.version!==2||!s.accounts||typeof s.accounts!=='object'||Array.isArray(s.accounts))throw 0;
      for(const a of Object.values(s.accounts))if(!Array.isArray(a.providers)||!Array.isArray(a.orders)||!a.daily||!a.consults)throw 0;
      if(s.session&&!s.accounts[s.session])s.session=null;return s;
    }catch{throw new Error('테스트 저장 데이터가 손상되었습니다. 아래 테스트 데이터 초기화로 복구할 수 있습니다.');}
  }
  function write(s){try{localStorage.setItem(KEY,JSON.stringify(s));}catch{throw new Error('저장 공간이 부족하거나 저장이 차단되었습니다. 이번 작업은 완료되지 않았습니다.');}}
  const account=s=>{if(!s.session||!s.accounts[s.session])throw new Error('로그인이 필요합니다.');return s.accounts[s.session];};
  const copy=x=>JSON.parse(JSON.stringify(x));
  const canonical=x=>JSON.stringify(x,Object.keys(x).sort());
  function inputKey(c){return canonical({signature:c.pillars.map(p=>p.unknown?'?':p.hanja).join('/'),solarDate:c.solarDate,time:c.input.time,gender:c.input.gender,status:c.input.relationshipStatus||''});}
  function orderKey(product,chart,params={}){return `${window.SajuInsights.VERSION}|${product}|${inputKey(chart)}|${JSON.stringify(params)}`;}
  function transact(fn){const s=read(),result=fn(s);write(s);return copy(result);}
  const api={
    today,products,inputKey,orderKey,
    session(){const s=read();return s.session?copy(account(s)):null;},
    login(provider){if(!providers.includes(provider))throw new Error('지원하지 않는 로그인 방식입니다.');return transact(s=>{
      let a=Object.values(s.accounts).find(a=>a.providers.includes(provider));
      if(!a){const id=`demo-${provider}`;a={id,name:'사이 여행자',providers:[provider],profile:null,orders:[],daily:{},consults:{}};s.accounts[id]=a;}
      s.session=a.id;return a;
    });},
    link(provider){if(!providers.includes(provider))throw new Error('지원하지 않는 연동입니다.');return transact(s=>{const a=account(s);if(Object.values(s.accounts).some(b=>b.id!==a.id&&b.providers.includes(provider)))throw new Error('다른 테스트 계정에 연결된 방식입니다. 해당 계정으로 로그인하거나 테스트 데이터를 초기화해주세요.');if(!a.providers.includes(provider))a.providers.push(provider);return a;});},
    logout(){return transact(s=>{s.session=null;return true;});},
    saveProfile(input){return transact(s=>{account(s).profile=copy(input);return input;});},
    daily(chart){return transact(s=>{const a=account(s),day=today();if(a.daily[day])return {...a.daily[day],cached:true};
      const [y,m,d]=day.split('-').map(Number),f=window.SajuInsights.frame(chart,y,m,d);
      const result={day,input:copy(chart.input),signature:inputKey(chart),title:`오늘은 ${f.theme.group}에 마음을 써볼 날`,paragraphs:[`${f.profile.top[0].title}인 당신에게, 오늘은 ${f.theme.strength}을 써보는 흐름입니다.`,f.tension,f.theme.action],evidence:f.evidence};a.daily[day]=result;return result;});},
    consultation(chart,q){return transact(s=>{const a=account(s),day=today();if(a.consults[day])throw new Error('오늘의 무료 상담을 사용했어요. 저장된 상담을 다시 읽거나 내일 만나요.');const result=window.SajuInsights.consult(chart,q,day);if(result.consumes)a.consults[day]={...result,question:q,day,signature:inputKey(chart)};return result;});},
    purchase(product,chart,params,result,outcome='success'){if(!products[product])throw new Error('상품을 확인해주세요.');return transact(s=>{
      const a=account(s),key=orderKey(product,chart,params),existing=a.orders.find(o=>o.key===key);if(existing)return existing;
      if(outcome==='failure')throw new Error('테스트 결제가 실패했습니다. 이용 내역과 금액은 변경되지 않았습니다. 다시 시도해주세요.');
      if(outcome!=='success')throw new Error('테스트 결제를 취소했습니다.');
      const order={id:`demo-${Date.now()}-${a.orders.length}`,key,product,amount:990,charged:0,createdAt:new Date().toISOString(),params:copy(params),result:copy(result)};a.orders.unshift(order);return order;
    });},
    findOrder(product,chart,params){return this.session()?.orders.find(o=>o.key===orderKey(product,chart,params))||null;},
    reset(){try{localStorage.removeItem(KEY);}catch{throw new Error('테스트 데이터를 지우지 못했습니다.');}}
  };
  window.SaiDemoAPI=api;
})();
