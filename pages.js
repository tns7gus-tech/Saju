/* GitHub Pages preview: all birth data stays in this browser. */
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
    if(!/^[0-9\s./-]+$/.test(raw))throw new Error('출생 날짜를 숫자로 입력해주세요. 예: 950228');
    let digits=raw.replace(/[^0-9]/g,'');
    if(digits.length===6){
      const yy=Number(digits.slice(0,2));
      const thisYear=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date()));
      digits=String((yy<=thisYear%100?2000:1900)+yy)+digits.slice(2);
    }
    if(digits.length!==8)throw new Error('출생 날짜는 950228 또는 19950228처럼 입력해주세요.');
    return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`;
  }
  function normalizeBirthTime(value) {
    if(!String(value||'').trim())return '';
    const raw=String(value).trim();
    if(!/^[0-9:\s]+$/.test(raw))throw new Error('출생 시각은 1245처럼 입력하거나 비워주세요.');
    const digits=raw.replace(/[^0-9]/g,'');
    if(digits.length<1||digits.length>4)throw new Error('출생 시각은 1245처럼 입력하거나 비워주세요.');
    const hour=digits.length<=2?Number(digits):Number(digits.slice(0,-2));
    const minute=digits.length<=2?0:Number(digits.slice(-2));
    if(hour>23||minute>59)throw new Error('출생 시각을 확인해주세요. 예: 1245 또는 12:45');
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
  // Each month's calculated relationship between the birth-day stem and the month's stem
  // selects everyday questions. Money, work and health prompts are conversation starters,
  // not forecasts of income, career events or illness.
  const monthLens={
    비견:['각자의 취향을 존중하는 방법을 물어보세요.','혼자만의 시간을 얼마나 원하는지 이야기해보세요.','서로 양보하기 어려운 기준을 비교해보세요.','개인 지출과 함께 쓰는 돈을 구분해보세요.','내가 맡고 싶은 역할을 분명히 말해보세요.','혼자 쉴 시간을 일정에 넣어보세요.'],
    겁재:['친구와 연인 사이의 거리감을 이야기해보세요.','주변 사람의 의견을 어디까지 들을지 정해보세요.','서로 경쟁하듯 말하고 있지 않은지 살펴보세요.','모임비와 관계 비용의 한도를 정해보세요.','협업할 때 공을 어떻게 나눌지 확인해보세요.','약속을 빽빽하게 잡았다면 쉬는 날을 비워보세요.'],
    식신:['함께 즐길 수 있는 음식이나 취미를 물어보세요.','평범한 하루를 어떻게 보내고 싶은지 이야기해보세요.','고마웠던 행동을 구체적으로 말해보세요.','취미에 쓰는 돈의 우선순위를 정해보세요.','만든 결과물을 보여주고 반응을 물어보세요.','식사와 수면 시간을 일정하게 맞춰보세요.'],
    상관:['서운했던 일을 공격 없이 표현해보세요.','갈등을 풀 때 원하는 대화 방식을 맞춰보세요.','농담과 진심의 경계를 확인해보세요.','즉흥적인 구매 전 하루만 기다려보세요.','새 아이디어를 제안하되 실행 순서를 정해보세요.','말과 일정에 지쳤다면 조용한 시간을 확보해보세요.'],
    편재:['새로운 만남에서 어떤 점에 끌리는지 물어보세요.','변화가 생겼을 때 함께 결정하는 방법을 말해보세요.','예상 밖의 제안을 받으면 서로의 속도를 확인해보세요.','새로운 소비를 시도하기 전에 한도를 정해보세요.','여러 선택지 중 한 가지에 집중할 때를 정해보세요.','새로운 일정 사이에 쉬는 간격을 남겨보세요.'],
    정재:['데이트 비용을 어떻게 나누고 싶은지 물어보세요.','생활비와 저축에 대한 기대를 이야기해보세요.','돈 문제를 말할 때 불편한 점을 확인해보세요.','고정 지출과 저축 금액을 다시 살펴보세요.','반복하는 일의 비용과 시간을 계산해보세요.','규칙적인 식사와 휴식 시간을 챙겨보세요.'],
    편관:['부담스러운 관계의 속도를 솔직히 말해보세요.','어려운 결정을 함께 내릴 때의 기준을 확인해보세요.','압박을 느낄 때 원하는 도움을 물어보세요.','급한 지출과 꼭 필요한 지출을 구분해보세요.','급한 일과 중요한 일을 따로 적어보세요.','긴장되는 일정 뒤에 회복 시간을 남겨보세요.'],
    정관:['약속을 지키는 방식이 서로 비슷한지 물어보세요.','함께 책임질 일의 범위를 이야기해보세요.','연락과 만남의 약속을 현실적으로 맞춰보세요.','매달 지키기 쉬운 예산 기준을 정해보세요.','일의 책임 범위와 마감일을 분명히 해보세요.','규칙적인 생활을 유지할 수 있는 시간을 살펴보세요.'],
    편인:['혼자 생각을 정리할 시간이 필요한지 물어보세요.','서로 다른 생활 취향을 존중할 방법을 이야기해보세요.','상대의 말에 숨은 뜻을 짐작하기보다 확인해보세요.','배움이나 구독에 드는 돈을 다시 확인해보세요.','새 방법을 공부한 뒤 작은 일에 적용해보세요.','생각이 많을 때 잠들기 전 화면을 멀리해보세요.'],
    정인:['서로에게 힘이 되는 말이 무엇인지 물어보세요.','가족과 주변 도움을 어디까지 받을지 이야기해보세요.','도움이 필요할 때 부탁하는 방법을 정해보세요.','안정적인 생활비를 먼저 확보해보세요.','도움을 요청할 사람과 필요한 자료를 정리해보세요.','충분히 쉬고 있는지 일정을 돌아보세요.'],
    default:['서로의 취향을 물어보세요.','함께 살 때 중요한 기준을 이야기해보세요.','상대의 생각을 직접 확인해보세요.','이번 달 지출을 점검해보세요.','맡은 일을 살펴보세요.','쉬는 시간을 확보해보세요.']
  };
  const budgetChecks=['모임비','교통비','식비','구독료','취미 지출','선물 비용','휴가 비용','생활용품비','배달 비용','교육비','통신비','연말 지출'];
  const workChecks=['이번 달 목표','협업 방식','마감 일정','새로 배울 일','업무 우선순위','회의 시간','집중 시간','반복 업무','휴가 계획','업무 분담','올해 성과','다음 달 준비'];
  const restChecks=['수면 시간','식사 리듬','산책 시간','쉬는 날','밤 약속 수','화면 보는 시간','물 마시는 습관','늦은 식사','운동 뒤 휴식','주말 일정','스트레스 해소법','연말 피로'];
  function makeQuickSummary(chart,year,month,game){
    const t=window.sajuRelationshipTransit(chart,year,month);
    const label=`${year}년 ${month}월`;
    const meeting=t.meeting>=4, commitment=t.commitment>=4, change=t.change>=4;
    const [love,marriage,partner,money,work,health]=monthLens[t.god]||monthLens.default;
    const relation=t.branchJoin?'서로 가까워지는 이야기를 꺼내볼 소재가 있어요.':t.clash?'관계나 생활 방식이 바뀔 때 서로의 뜻을 확인해보세요.':t.stemJoin?'서로의 관심사를 연결할 대화를 시도해보세요.':'가벼운 질문에서 시작해 상대의 반응을 살펴보세요.';
    const categories=[
      ['연애',meeting?'새로운 대화를 시도할 단서가 비교적 많은 달이에요.':'새 인연을 단정하기보다 대화의 속도를 살펴보세요.',love,relation],
      ['결혼',commitment?'미래 계획을 말로 맞춰볼 소재가 있는 달이에요.':'결혼 시기보다 서로의 준비를 확인하는 달로 써보세요.',marriage,t.branchJoin?'함께 살 때의 생활 모습을 구체적으로 물어보세요.':t.clash?'큰 결정 전에 주거와 일의 변화를 함께 확인해보세요.':`이번 달에는 ${budgetChecks[(month-1)%12]}에 대한 생각도 나눠보세요.`],
      ['연인',change?'생활 방식이나 연락 빈도가 달라질 때 대화가 필요해요.':'서로 지키기 쉬운 약속을 맞춰보세요.',partner,t.clash?'평소와 다른 선택을 앞뒀다면 두 사람의 뜻을 확인해보세요.':`서로의 ${workChecks[(month-1)%12]} 때문에 만나는 시간이 달라지는지 물어보세요.`],
      ['자산·소비',/재/.test(t.god)?'수입과 지출의 균형을 대화 소재로 삼아보세요.':'큰 지출 전 예산을 살펴보세요.',money,`이번 달에는 ${budgetChecks[(month-1)%12]}부터 점검해보세요.`],
      ['일·사업',/관|식|상/.test(t.god)?'일의 역할과 표현 방식을 점검해보세요.':'지금 맡은 일에서 바꾸고 싶은 것을 골라보세요.',work,`이번 달에는 ${workChecks[(month-1)%12]}을 한 가지 정해보세요.`],
      ['건강·컨디션',health,`이번 달에는 ${restChecks[(month-1)%12]} 항목을 살펴보세요.`,`다음 일정 전 ${restChecks[(month+2)%12]} 항목도 점검해보세요.`]
    ];
    const lines=[];
    for(const [category,...sentences] of categories)for(const sentence of sentences)lines.push({category,text:sentence});
    lines.push({category:'자리 게임',text:`${game.direction} 자리에 앉은 사람과 취향 질문 한 번! 연인 여부는 직접 대화해보세요.`});
    lines.push({category:'자리 게임',text:`${game.accessory}에게 좋아하는 데이트 코스를 물어보세요. 무작위 질문입니다.`});
    return {label,lines};
  }
  let current=null;
  let gameTurn=0;
  function showQuickSummary(){
    if(!current)return;
    const [year,month]=$('summaryMonth').value.split('-').map(Number);
    const {label,lines}=makeQuickSummary(current,year,month,gameCards(year,month,gameTurn));
    $('quickTitle').textContent=`${label}, 한눈에 20줄`;
    const list=$('quickSummary');list.replaceChildren();
    list.setAttribute('aria-label',`${label} 요약 20줄`);
    for(const entry of lines){const item=add(list,'li','quick-line','');add(item,'strong','',entry.category);add(item,'span','',entry.text);}
    renderReport(current,year,month);
  }
  const dialog=$('detailDialog');
  $('openDetails').addEventListener('click',()=>{if(current)dialog.showModal();});
  $('closeDetails').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  $('summaryMonth').addEventListener('change',()=>{gameTurn=0;showQuickSummary();});
  $('rerollGame').addEventListener('click',()=>{gameTurn++;showQuickSummary();});
  function renderReport(chart,year,month){
    const report=$('report');report.replaceChildren();
    if (!window.makeSajuReport) throw new Error('분석 규칙 파일을 불러오지 못했습니다. 새로고침해주세요.');
    for (const section of window.makeSajuReport(chart,{year,month})) {
      const card=add(report,'section','report-card','');
      add(card,'h3','',section.title);
      add(card,'span','report-confidence','판독 수준 · '+section.confidence);
      for(const paragraph of section.paragraphs)add(card,'p','',paragraph);
      if(section.table){
        const scroll=add(card,'div','report-table-scroll','');
        const table=add(scroll,'table','report-table','');
        const head=add(table,'thead','',''),headRow=add(head,'tr','','');
        for(const label of section.table.headers)add(headRow,'th','',label);
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
    $('question').textContent=topics[dayElement];
    const {year,month}=seoulMonth(),monthSelect=$('summaryMonth');monthSelect.replaceChildren();
    for(let offset=0;offset<12;offset++){
      const index=year*12+(month-1)+offset,ym=Math.floor(index/12),mm=index%12+1;
      const option=add(monthSelect,'option','',`${ym}년 ${mm}월`);option.value=`${ym}-${mm}`;
    }
    gameTurn=0;showQuickSummary();
    $('output').hidden=false;
    $('output').scrollIntoView({behavior:'smooth',block:'start'});
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
    try { await navigator.clipboard.writeText(button.dataset.question);button.textContent='복사 완료 ✓';setTimeout(()=>button.textContent='질문 복사 ↗',2000); }
    catch { button.textContent='복사할 수 없습니다'; }
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
  window.makeQuickSajuSummary=makeQuickSummary;
})();
