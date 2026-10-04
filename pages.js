/* Shared calculation and UI; home-server interpretations use the local LLM. */
(() => {
  'use strict';
  const form = document.getElementById('manseForm');
  const $ = id => document.getElementById(id);
  const themeToggle=$('themeToggle');
  const applyTheme=theme=>{
    document.documentElement.dataset.theme=theme;
    themeToggle.textContent=theme==='dark'?'☀ 라이트모드':'☾ 다크모드';
    themeToggle.setAttribute('aria-pressed',String(theme==='dark'));
    themeToggle.setAttribute('aria-label',theme==='dark'?'라이트모드 켜기':'다크모드 켜기');
  };
  let savedTheme='';
  try{savedTheme=localStorage.getItem('sai-theme')||'';}catch{}
  applyTheme(savedTheme==='dark'||savedTheme==='light'?savedTheme:window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light');
  themeToggle.addEventListener('click',()=>{
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    applyTheme(next);
    try{localStorage.setItem('sai-theme',next);}catch{}
  });
  const stems = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'};
  const branches = {寅:'목',卯:'목',巳:'화',午:'화',辰:'토',戌:'토',丑:'토',未:'토',申:'금',酉:'금',亥:'수',子:'수'};
  const topics = {목:'새로운 일을 시작할 때 먼저 계획하는 편인가요?',화:'요즘 가장 신나게 이야기할 수 있는 주제는 뭔가요?',토:'쉬는 날 안정감을 느끼는 루틴이 있나요?',금:'결정할 때 가장 중요하게 보는 기준은 뭔가요?',수:'호기심이 생기면 바로 알아보는 편인가요?'};
  const names = ['년주','월주','일주','시주'];
  const keys = ['Year','Month','Day','Time'];
  const gods = {'比肩':'비견','劫财':'겁재','食神':'식신','伤官':'상관','偏财':'편재','正财':'정재','七杀':'편관','正官':'정관','偏印':'편인','正印':'정인','日主':'일간'};
  const stages = {'长生':'장생','沐浴':'목욕','冠带':'관대','临官':'건록','帝旺':'제왕','衰':'쇠','病':'병','死':'사','墓':'묘','绝':'절','胎':'태','养':'양'};
  const stemSounds = {甲:'갑',乙:'을',丙:'병',丁:'정',戊:'무',己:'기',庚:'경',辛:'신',壬:'임',癸:'계'};
  const branchSounds = {子:'자',丑:'축',寅:'인',卯:'묘',辰:'진',巳:'사',午:'오',未:'미',申:'신',酉:'유',戌:'술',亥:'해'};

  function normalizeBirthDate(value) {
    const raw=String(value||'').trim();
    if(!/^[0-9\s./-]+$/.test(raw))throw new Error('출생 날짜를 숫자로 입력해주세요. 예: 20010724');
    let digits=raw.replace(/[^0-9]/g,'');
    if(digits.length===6){
      const yy=Number(digits.slice(0,2));
      const thisYear=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date()));
      digits=String((yy<=thisYear%100?2000:1900)+yy)+digits.slice(2);
    }
    if(digits.length!==8)throw new Error('출생 날짜는 20010724처럼 입력해주세요.');
    return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`;
  }
  function normalizeBirthTime(value) {
    if(!String(value||'').trim())return '';
    const raw=String(value).trim();
    if(!/^[0-9:\s]+$/.test(raw))throw new Error('출생 시각은 1530처럼 입력하거나 비워주세요.');
    const digits=raw.replace(/[^0-9]/g,'');
    if(digits.length<1||digits.length>4)throw new Error('출생 시각은 1530처럼 입력하거나 비워주세요.');
    const hour=digits.length<=2?Number(digits):Number(digits.slice(0,-2));
    const minute=digits.length<=2?0:Number(digits.slice(-2));
    if(hour>23||minute>59)throw new Error('출생 시각을 확인해주세요. 예: 1530 또는 15:30');
    return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
  }

  function calculate(input) {
    if (!window.Solar || !window.Lunar) throw new Error('달력 계산 파일을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해주세요.');
    input={...input,date:normalizeBirthDate(input.date),time:normalizeBirthTime(input.time)};
    if(!['solar','lunar'].includes(input.calendar))throw new Error('달력 종류를 확인해주세요.');
    if(!['','male','female'].includes(input.gender||''))throw new Error('대운 계산 기준을 확인해주세요.');
    if(!['','single','dating'].includes(input.relationshipStatus||''))throw new Error('현재 관계 상태를 확인해주세요.');
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date);
    if (!m) throw new Error('생년월일을 입력해주세요.');
    const [year, month, day] = m.slice(1).map(Number);
    if (year < 1900 || year > 2050 || month < 1 || month > 12 || day < 1 || day > 31) throw new Error('1900년부터 2050년 사이의 날짜를 입력해주세요.');
    const known = !!input.time;
    const [hour, minute] = known ? input.time.split(':').map(Number) : [12,0];
    if (known && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))) throw new Error('출생 시각을 확인해주세요.');
    if (input.calendar === 'solar' && (new Date(Date.UTC(year,month-1,day)).toISOString().slice(0,10) !== input.date)) throw new Error('존재하지 않는 양력 날짜입니다. 일과 월을 확인해주세요.');
    let solar;
    try {
      solar = input.calendar === 'lunar'
        ? window.Lunar.fromYmdHms(year, input.leapMonth ? -month : month, day, hour, minute, 0).getSolar()
        : window.Solar.fromYmdHms(year,month,day,hour,minute,0);
      if (input.calendar === 'lunar') {
        const back = solar.getLunar();
        if (back.getYear() !== year || back.getMonth() !== (input.leapMonth ? -month : month) || back.getDay() !== day) throw new Error('음력 날짜가 달력과 일치하지 않습니다.');
      }
    } catch { throw new Error('음력 날짜 또는 윤달 여부를 확인해주세요.'); }
    const todayParts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const today=key=>todayParts.find(p=>p.type===key).value;
    const todayYmd=`${today('year')}-${today('month')}-${today('day')}`;
    if(solar.toYmd()>todayYmd)throw new Error('미래의 출생 날짜는 입력할 수 없습니다.');
    const eight = solar.getLunar().getEightChar();
    const pillars = keys.map((key,i) => {
      if (key === 'Time' && !known) return {name:names[i],unknown:true};
      const hanja = eight['get'+key]();
      const god=eight['get'+key+'ShiShenGan']();
      const stage=eight['get'+key+'DiShi']();
      const hiddenGod=eight['get'+key+'ShiShenZhi']()[0];
      return {name:names[i],hanja,stem:hanja[0],branch:hanja[1],stemElement:stems[hanja[0]],branchElement:branches[hanja[1]],tenGod:gods[god]||god,branchGod:gods[hiddenGod]||hiddenGod,hiddenStems:eight['get'+key+'HideGan'](),stage:stages[stage]||stage,naYin:eight['get'+key+'NaYin'](),xunKong:eight['get'+key+'XunKong']()};
    });
    const elements = Object.fromEntries(['목','화','토','금','수'].map(x => [x,0]));
    for (const p of pillars) if (!p.unknown) {elements[p.stemElement]++; elements[p.branchElement]++;}
    const warnings = ['한국 현지 표준시 기준 · 출생지/역사적 시간대 보정 없음 · 자정에 일주 교체'];
    if (!known) warnings.push('출생 시각 미입력: 시주와 정확한 대운 시작 시점은 표시하지 않습니다.');
    if (!input.gender) warnings.push('대운 배열은 계산 기준을 선택해야 표시됩니다.');
    if (known && ([0,1,22,23].includes(hour) || (minute <= 40 && hour % 2 === 1) || (minute >= 20 && hour % 2 === 0))) warnings.push('시간 경계에 가까워 다른 자시/출생지 기준을 쓰는 만세력과 다를 수 있습니다.');
    let luck = null;
    if (known && input.gender) {
      const yun = eight.getYun(input.gender === 'male' ? 1 : 0);
      luck = {direction: yun.isForward() ? '순행' : '역행', start: [yun.getStartYear(),yun.getStartMonth(),yun.getStartDay()], periods:yun.getDaYun(12).filter(d=>d.getIndex()>0).map(d=>({startYear:d.getStartYear(),endYear:d.getEndYear(),startAge:d.getStartAge(),ganZhi:d.getGanZhi()}))};
    }
    return {input,solarDate:solar.toYmd(),pillars,elements,luck,warnings,dayElement:pillars[2].stemElement};
  }

  const add = (parent,tag,cls,value) => { const el=document.createElement(tag); if(cls)el.className=cls; el.textContent=value; parent.append(el); return el; };
  const seoulMonth=()=>{
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'numeric'}).formatToParts(new Date());
    return {year:Number(parts.find(p=>p.type==='year').value),month:Number(parts.find(p=>p.type==='month').value)};
  };
  const gameCards=(year,month,turn=0)=>({direction:['왼쪽','오른쪽','정면','뒤쪽'][(year*12+month+turn)%4],accessory:['안경 쓴 사람','아이폰 사용자','갤럭시폰 사용자'][(year*12+month+turn)%3]});
  function makeQuickSummary(chart,year,month,game){
    if(!window.SajuInsights)throw new Error('해석 파일을 불러오지 못했습니다. 새로고침해주세요.');
    return window.SajuInsights.quick(chart,year,month,game);
  }
  let current=null;
  let readingRevision=0,quickJob=null,reportJob=null,reportResult=null;
  const localAI=()=>!!window.SaiDemoAPI?.production;
  let gameTurn=0;
  let lastSummary=null;
  let detailReturnFocus=null;
  let topicGoingToDetails=false;
  const topicCards=[
    {name:'연애',short:'연애',art:'♡',accent:'rose'},
    {name:'결혼',short:'결혼',art:'◇',accent:'peach'},
    {name:'연인',short:'연인',art:'♥',accent:'lavender'},
    {name:'자산·소비',short:'돈·소비',art:'₩',accent:'gold'},
    {name:'일·사업',short:'일·사업',art:'✦',accent:'mint'},
    {name:'건강·컨디션',short:'건강',art:'✚',accent:'sky'},
    {name:'자리 게임',short:'자리 게임',art:'♧',accent:'lime'},
    {name:'만세력',short:'만세력',art:'四',accent:'ink'}
  ];
  const topicIllustrations={
    '연애':'<path d="M32 54 13 35C1 23 16 7 29 18l3 3 3-3C48 7 63 23 51 35Z"/><path d="m47 8 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z"/>',
    '결혼':'<circle cx="22" cy="37" r="13"/><circle cx="42" cy="37" r="13"/><path d="m22 24 5-10h10l5 10M27 14l5 9 5-9"/>',
    '연인':'<circle cx="22" cy="22" r="8"/><circle cx="43" cy="22" r="8"/><path d="M9 52c0-12 5-19 13-19s13 7 13 19M30 52c0-12 5-19 13-19s13 7 13 19M35 46l-5-6"/><path d="m32 17 3-4 3 4"/>',
    '자산·소비':'<ellipse cx="32" cy="19" rx="19" ry="7"/><path d="M13 19v24c0 4 8 8 19 8s19-4 19-8V19M13 31c0 4 8 8 19 8s19-4 19-8"/><path d="M32 25v20m-8-13 8 13 8-13"/>',
    '일·사업':'<rect x="9" y="21" width="46" height="32" rx="4"/><path d="M24 21v-7h16v7M9 34c9 7 37 7 46 0M27 35v9h10v-9"/>',
    '건강·컨디션':'<path d="M32 55 13 36C1 24 16 8 29 19l3 3 3-3C48 8 63 24 51 36Z"/><path d="M14 34h10l5-8 6 17 5-9h10"/>',
    '자리 게임':'<path d="M16 10v27h32V10M12 38h40v9H12zM19 47v8m26-8v8"/><circle cx="32" cy="23" r="6"/><path d="M32 13v4m0 12v4m-10-10h4m12 0h4"/>',
    '만세력':'<rect x="8" y="11" width="48" height="43" rx="5"/><path d="M8 24h48M20 11v43m12-30v30m12-30v30M13 32h2m10 0h2m10 0h2m10 0h2M13 44h2m10 0h2m10 0h2m10 0h2"/>'
  };
  const topicDialog=$('topicDialog');
  function openTopic(card,entries,label,opener){
    $('topicDialogMonth').textContent=label+' · 이번 달의 이야기';
    $('topicDialogTitle').textContent=card.name;
    const list=$('topicDialogList');list.replaceChildren();
    for(const entry of entries)add(list,'li','',entry.text);
    detailReturnFocus=opener;
    topicDialog.showModal();
    $('closeTopic').focus();
  }
  function showQuickSummary(){quickJob=loadQuickSummary();return quickJob;}
  async function loadQuickSummary(){
    if(!current)return;
    const [year,month]=$('summaryMonth').value.split('-').map(Number);
    const revision=++readingRevision,chart=current;reportResult=null;reportJob=null;
    let loading;
    if(localAI()){
      if(dialog.open)dialog.close();if(topicDialog.open)topicDialog.close();
      const list=$('quickSummary');list.replaceChildren();loading=window.SaiLoading.mount(list,{kind:'quick',label:'이번 달, 나의 이야기를 준비하고 있어요.'});
      list.setAttribute('aria-busy','true');$('report').replaceChildren();$('question').textContent='나에게 건넬 질문을 준비하고 있어요.';
    }
    let summary;
    try{summary=localAI()?await window.SaiDemoAPI.reading('quick',chart,{year,month,...gameCards(year,month,gameTurn)},text=>{if(revision===readingRevision)loading?.updateText(text);}):makeQuickSummary(chart,year,month,gameCards(year,month,gameTurn));}
    catch(e){if(revision!==readingRevision)return;const list=$('quickSummary');list.replaceChildren();list.setAttribute('aria-busy','false');add(list,'p','error',e.message);const retry=add(list,'button','button','이야기 다시 보기');retry.type='button';retry.addEventListener('click',showQuickSummary);$('question').textContent='이야기를 불러오지 못했어요.';return;}
    finally{loading?.dispose();}
    if(revision!==readingRevision||current!==chart)return;
    if(localAI()){renderLocalSummary(summary,chart,year,month);return;}
    const {label,lines}=summary;if(localAI())$('question').textContent=summary.question;
    if(lastSummary&&lastSummary.label!==label){
      $('monthChange').textContent=`${lastSummary.label} → ${label}: 새 달의 계산 단서를 반영했습니다. 근거가 같은 내용은 그대로 표시합니다.`;
    }else if(!lastSummary){$('monthChange').textContent='다른 달을 고르면 아래 문장들이 새롭게 바뀝니다.';}
    if(localAI())$('monthChange').textContent+=' · 나의 이야기';
    lastSummary={label,lines};
    if(!localAI())window.SaiVisuals?.result(current,year,month);
    $('quickTitle').textContent=`${label}, 무엇이 궁금하세요?`;
    const list=$('quickSummary');list.replaceChildren();list.setAttribute('aria-busy','false');
    list.setAttribute('aria-label',`${label} 주제별 이야기 8개`);
    for(let index=0;index<topicCards.length;index++){
      const card=topicCards[index];
      const button=add(list,'button',`topic-card topic-${card.accent}`,'');
      button.type='button';
      button.setAttribute('aria-haspopup','dialog');
      button.setAttribute('aria-controls',index===7?'detailDialog':'topicDialog');
      button.setAttribute('aria-label',`${card.name} 그림, 내용을 보려면 누르세요`);
      const art=add(button,'span','topic-art','');
      art.setAttribute('aria-hidden','true');
      art.innerHTML=`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" focusable="false">${topicIllustrations[card.name]}</svg>`;
      add(button,'span','topic-label',card.short);
      if(index===7)button.addEventListener('click',()=>{detailReturnFocus=null;showChart();});
      else button.addEventListener('click',()=>openTopic(card,index===6?lines.slice(18):lines.slice(index*3,index*3+3),label,button));
    }
    if(!localAI())renderReport(current,year,month);
  }
  let topicRevision=0;
  function renderLocalSummary(summary,chart,year,month){
    lastSummary=summary;$('question').textContent=summary.question;$('quickTitle').textContent=`${summary.label}, 핵심 이야기`;
    $('monthChange').textContent='궁금한 주제를 눌러 나의 이야기를 펼쳐보세요.';
    const list=$('quickSummary');list.replaceChildren();list.setAttribute('aria-busy','false');list.setAttribute('aria-label','월별 핵심 이야기와 주제 선택');
    const brief=add(list,'section','ai-brief','');for(const text of summary.paragraphs)add(brief,'p','',text);
    topicCards.forEach((card,index)=>{const b=add(list,'button',`topic-card topic-${card.accent}`,'');b.type='button';b.setAttribute('aria-haspopup','dialog');const art=add(b,'span','topic-art','');art.setAttribute('aria-hidden','true');art.innerHTML=`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${topicIllustrations[card.name]}</svg>`;add(b,'span','topic-label',card.short);b.addEventListener('click',()=>index===7?showChart():loadTopic(card,b,chart,year,month));});
  }
  async function loadTopic(card,opener,chart,year,month){
    const token=++topicRevision,revision=readingRevision;detailReturnFocus=opener;
    $('topicDialogMonth').textContent=`${year}년 ${month}월 · 나의 이야기`;$('topicDialogTitle').textContent=card.name;
    const body=$('topicDialogList');body.replaceChildren();if(!topicDialog.open)topicDialog.showModal();
    const loading=window.SaiLoading.mount(body,{kind:'topic',label:`${card.name} 이야기를 작성하고 있어요.`});
    const valid=()=>token===topicRevision&&revision===readingRevision&&topicDialog.open;
    try{const result=await window.SaiDemoAPI.reading('topic',chart,{year,month,topic:card.name,...gameCards(year,month,gameTurn)},text=>{if(valid())loading.updateText(text);});if(!valid())return;body.replaceChildren();result.paragraphs.forEach(text=>add(body,'li','',text));}
    catch(e){if(!valid())return;body.replaceChildren();add(body,'li','error',e.message);const retry=add(body,'button','button','다시 작성');retry.type='button';retry.addEventListener('click',()=>loadTopic(card,opener,chart,year,month));}finally{loading.dispose();}
  }
  function renderLazyReport(chart,year,month,result){
    const report=$('report');report.replaceChildren();add(report,'h3','','관심 있는 항목을 선택해주세요');
    add(report,'p','form-note','만세력 판독 요약부터 순서대로 읽어보세요. 각 항목은 상세하게 작성되어 시간이 걸릴 수 있어요. 읽었던 내용은 하루 동안 다시 볼 수 있어요.');
    for(const section of result.sections){const card=add(report,'details','report-card','');add(card,'summary','',section.title);const body=add(card,'div','','');let job=null;
      const load=async()=>{if(job)return;const loading=window.SaiLoading.mount(body,{kind:'section',label:`${section.title} 이야기를 준비하고 있어요.`});const revision=readingRevision;
        job=window.SaiDemoAPI.reading('section',chart,{year,month,reportKind:'full',section:section.index},text=>{if(revision===readingRevision)loading.updateText(text);});
        try{const answer=await job;if(revision!==readingRevision)return;body.replaceChildren();answer.paragraphs.forEach(text=>add(body,'p','',text));if(answer.table){const table=add(body,'table','report-table','');const head=add(table,'tr','','');answer.table.headers.forEach(text=>add(head,'th','',text));answer.table.rows.forEach(row=>{const tr=add(table,'tr','','');row.forEach(text=>add(tr,'td','',text));});}}
        catch(e){job=null;if(revision!==readingRevision)return;body.replaceChildren();add(body,'p','error',e.message);const retry=add(body,'button','button','다시 작성');retry.type='button';retry.addEventListener('click',load);}finally{loading.dispose();}};
      card.addEventListener('toggle',()=>{if(card.open)load();});
    }
  }
  const dialog=$('detailDialog');
  $('closeTopic').addEventListener('click',()=>topicDialog.close());
  topicDialog.addEventListener('click',event=>{if(event.target===topicDialog)topicDialog.close();});
  topicDialog.addEventListener('close',()=>{topicRevision++;if(!topicGoingToDetails)detailReturnFocus=null;});
  $('topicFullDetails').addEventListener('click',()=>{topicGoingToDetails=true;topicDialog.close();showDetails();});
  $('openDetails').addEventListener('click',()=>{if(current){detailReturnFocus=null;showDetails();}});
  $('closeDetails').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{topicGoingToDetails=false;if(detailReturnFocus?.isConnected)detailReturnFocus.focus();detailReturnFocus=null;});
  $('summaryMonth').addEventListener('change',()=>{gameTurn=0;showQuickSummary();});
  $('rerollGame').addEventListener('click',()=>{gameTurn++;showQuickSummary();$('monthChange').textContent='자리 게임 질문을 다시 뽑았습니다.';});
  function setDetailMode(showReport){
    for(const element of [dialog.querySelector('.report-intro'),dialog.querySelector('.term-help'),$('report'),dialog.querySelector('.reading')])if(element)element.hidden=!showReport;
    $('detailTitle').textContent=showReport?'만세력과 상세 해석':'나의 만세력';
  }
  function showChart(){if(!current)return;setDetailMode(false);if(!dialog.open)dialog.showModal();}
  async function showDetails(){
    if(!current)return;setDetailMode(true);if(!dialog.open)dialog.showModal();if(!localAI())return;
    dialog.querySelector('.report-intro h2').textContent='선택해서 읽는 12단계 사주 분석';
    const revision=readingRevision,chart=current,[year,month]=$('summaryMonth').value.split('-').map(Number);
    if(reportResult){renderLazyReport(chart,year,month,reportResult);return;}
    const report=$('report');report.replaceChildren();
    try{if(!reportJob)reportJob=window.SaiDemoAPI.reading('catalog',chart,{year,month,reportKind:'full'});const result=await reportJob;if(revision!==readingRevision||current!==chart)return;reportResult=result;renderLazyReport(chart,year,month,result);}
    catch(e){if(revision!==readingRevision)return;reportJob=null;report.replaceChildren();add(report,'p','error',e.message);const retry=add(report,'button','button','다시 열기');retry.type='button';retry.addEventListener('click',showDetails);}
  }
  function renderReport(chart,year,month,aiReport=null){
    const report=$('report');report.replaceChildren();
    if (!window.makeFullSajuReport) throw new Error('상세 분석 파일을 불러오지 못했습니다. 새로고침해주세요.');
    const detailed=aiReport||window.makeFullSajuReport(chart,{year,month});
    const overview=add(report,'section','report-card report-overview','');
    add(overview,'h3','',aiReport?'나의 핵심 이야기':'30줄 핵심 요약');
    if(aiReport)add(overview,'p','form-note','나를 알아가는 이야기');
    add(overview,'p','',`${year}년 ${month}월 · 나의 강점, 반복되는 장면, 이번 달의 실천을 먼저 만나보세요.`);
    const overviewList=add(overview,'ol','','');
    for(const item of detailed.overview)add(overviewList,'li','',item);
    for (const section of detailed.sections) {
      const card=add(report,'section','report-card','');
      add(card,'h3','',section.title);
      add(card,'span','report-confidence','판독 수준 · '+section.confidence);
      for(const paragraph of section.paragraphs)add(card,'p','',paragraph);
      if(section.table){
        const scroll=add(card,'div','report-table-scroll','');
        scroll.setAttribute('role','region');
        scroll.setAttribute('tabindex','0');
        scroll.setAttribute('aria-label',section.title+' 표, 좌우로 스크롤 가능');
        const table=add(scroll,'table','report-table','');
        add(table,'caption','',section.title+' 자세한 비교');
        const head=add(table,'thead','',''),headRow=add(head,'tr','','');
        for(const label of section.table.headers){const th=add(headRow,'th','',label);th.scope='col';}
        const body=add(table,'tbody','','');
        for(const cells of section.table.rows){const row=add(body,'tr','','');for(const value of cells)add(row,'td','',value);}
      }
      if(section.items.length){const list=add(card,'ol','', '');for(const item of section.items)add(list,'li','',item);}
    }
  }
  function render(chart) {
    const {input,solarDate,elements,luck,warnings,dayElement}=chart;
    $('chartMeta').textContent=`${input.calendar==='lunar'?'음력':'양력'} ${input.date}${input.leapMonth?' · 윤달':''} · 양력 환산 ${solarDate}${input.time?' · '+input.time:''}`;
    if(!window.renderVisualManse) throw new Error('만세력 표 파일을 불러오지 못했습니다. 새로고침해주세요.');
    window.renderVisualManse(chart);
    $('elements').textContent='보이는 글자 기준 오행 · '+Object.entries(elements).map(([e,n])=>`${e} ${n}`).join('  /  ');
    $('luck').textContent=luck?`대운 ${luck.direction} · 출생 후 ${luck.start[0]}년 ${luck.start[1]}개월 ${luck.start[2]}일 시작 (대운수 약 ${luck.periods[0].startAge-1}세) · ${luck.periods.slice(0,5).map(p=>`${p.startYear}년 ${p.ganZhi}`).join(' → ')}`:'대운 · 출생 시각과 계산 기준 선택 시 표시';
    $('warnings').textContent=warnings.join(' ');
    $('question').textContent=localAI()?'나의 이야기를 준비하고 있어요.':window.SajuInsights.profile(chart).top[0].question;
    window.currentSajuChart=chart;
    document.dispatchEvent?.(new CustomEvent('sai:chart',{detail:chart}));
    const {year,month}=seoulMonth(),monthSelect=$('summaryMonth');monthSelect.replaceChildren();
    for(let offset=0;offset<12;offset++){
      const index=year*12+(month-1)+offset,ym=Math.floor(index/12),mm=index%12+1;
      const option=add(monthSelect,'option','',`${ym}년 ${mm}월`);option.value=`${ym}-${mm}`;
    }
    gameTurn=0;lastSummary=null;showQuickSummary();
    $('output').hidden=false;
    $('output').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    $('quickTitle').focus({preventScroll:true});
  }

  form.elements.calendar.addEventListener('change',()=>{$('leapField').hidden=form.elements.calendar.value!=='lunar'; if(form.elements.calendar.value!=='lunar')form.elements.leapMonth.checked=false;});
  form.addEventListener('submit',event=>{
    event.preventDefault();$('error').textContent='';
    for(const field of [form.elements.date,form.elements.time])field.removeAttribute('aria-invalid');
    try { current=calculate({calendar:form.elements.calendar.value,date:form.elements.date.value,time:form.elements.time.value,gender:form.elements.gender.value,leapMonth:form.elements.leapMonth.checked,nickname:form.elements.nickname.value.trim(),relationshipStatus:form.elements.relationshipStatus.value});form.elements.date.value=current.input.date;form.elements.time.value=current.input.time;render(current); }
    catch(err){
      $('output').hidden=true;current=null;$('error').textContent=err.message;
      const field=/시각|시간/.test(err.message)?form.elements.time:/날짜|출생일|윤달|1900|2050/.test(err.message)?form.elements.date:null;
      if(field){field.setAttribute('aria-invalid','true');field.focus();}
    }
  });
  for(const field of [form.elements.date,form.elements.time])field.addEventListener('input',()=>{field.removeAttribute('aria-invalid');$('error').textContent='';});
  document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',async()=>{
    try { await navigator.clipboard.writeText(button.dataset.question);button.textContent='복사 완료 ✓';$('copyStatus').textContent='질문을 복사했습니다.';setTimeout(()=>button.textContent='질문 복사 ↗',2000); }
    catch { button.textContent='복사할 수 없습니다';$('copyStatus').textContent='복사하지 못했습니다. 질문을 직접 선택해 복사해주세요.'; }
  }));
  $('savePng').addEventListener('click',()=>{
    if(!current)return;
    const c=document.createElement('canvas');c.width=1000;c.height=680;
    const ctx=c.getContext('2d');ctx.fillStyle='#f6f2eb';ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle='#25392e';ctx.font='bold 46px sans-serif';ctx.fillText('사이  ·  나의 만세력',65,95);
    ctx.font='24px sans-serif';ctx.fillText(`${current.solarDate}  ·  ${current.input.time||'출생 시각 미입력'}`,65,145);
    [...current.pillars].reverse().forEach((p,i)=>{
      const x=65+i*235;ctx.fillStyle='#fff';ctx.fillRect(x,200,215,220);
      ctx.fillStyle='#25392e';ctx.font='25px sans-serif';ctx.fillText(p.name,x+20,245);
      ctx.font='bold 67px sans-serif';ctx.fillText(p.unknown?'—':p.hanja,x+20,333);
      ctx.font='20px sans-serif';ctx.fillText(p.unknown?'시각 미입력':`${stemSounds[p.stem]+branchSounds[p.branch]} · ${p.stemElement} / ${p.branchElement}`,x+20,385);
    });
    ctx.fillStyle='#25392e';ctx.font='24px sans-serif';ctx.fillText('오행  '+Object.entries(current.elements).map(([e,n])=>`${e} ${n}`).join('   '),65,485);
    ctx.font='20px sans-serif';ctx.fillText('계산 기준: 한국 현지 표준시 · 출생지 보정 없음 · 자정 일주 교체',65,550);
    ctx.fillText('사주 결과는 자기 탐색과 대화의 소재입니다.  SAI',65,600);
    const link=document.createElement('a');link.href=c.toDataURL('image/png');link.download='sai-manse.png';link.click();
  });
  window.calculateStaticManse=calculate;
  window.renderSajuChart=chart=>{current=chart;render(chart);};
  window.makeQuickSajuSummary=makeQuickSummary;
})();
