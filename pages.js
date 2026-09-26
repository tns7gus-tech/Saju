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
  const marriageChecks=['생활비','가사 분담','주말 생활','가족 행사','퇴근 후 시간','저축 계획','휴가 방식','집안일','함께 살 집','친구 모임','명절 일정','장기 계획'];
  const partnerChecks=['연락 시간','혼자만의 시간','모임 빈도','취미 시간','약속 조율','돈 쓰는 방식','휴일 사용','갈등 대화','만남 빈도','일과 데이트','가족과의 거리','연말 계획'];
  const loveThemes={
    비견:['각자의 속도와 독립적인 시간이 관계의 주제입니다.','상대가 혼자 보내고 싶은 시간과 함께 보내고 싶은 시간을 구분해 물어보세요.'],
    겁재:['주변 사람과 연애 사이의 경계를 정하는 이야기에 초점이 갑니다.','친구나 모임 일정이 겹칠 때 무엇을 우선할지 이야기해보세요.'],
    식신:['편안하게 함께 보내는 일상이 대화의 출발점입니다.','함께 즐기고 싶은 식사나 취미 하나를 구체적으로 제안해보세요.'],
    상관:['속에 있던 말을 어떻게 전달하느냐가 중요한 주제입니다.','서운한 일을 말할 때 원하는 해결 방식부터 확인해보세요.'],
    편재:['새로운 사람이나 활동에 관심을 넓히는 소재가 있습니다.','새 만남에서는 끌리는 점보다 실제로 맞는 생활 리듬을 물어보세요.'],
    정재:['관계에 쓰는 시간과 비용을 현실적으로 맞추는 주제입니다.','데이트 비용과 만남 빈도에 대한 기준을 서로 말해보세요.'],
    편관:['관계의 압박과 속도 차이를 살펴볼 필요가 있습니다.','부담스럽게 느껴지는 일정이나 기대가 있는지 직접 확인해보세요.'],
    정관:['연락보다 약속과 책임을 어떻게 지키는지가 주제입니다.','연락 시간과 다음 만남의 약속을 분명하게 맞춰보세요.'],
    편인:['상대의 말을 혼자 해석하기보다 확인하는 방식이 주제입니다.','의도를 짐작하게 만든 말이 있다면 무슨 뜻이었는지 물어보세요.'],
    정인:['서로 바라는 배려와 도움을 이야기할 소재가 있습니다.','상대가 힘들 때 어떤 말과 행동이 도움이 되는지 물어보세요.']
  };
  function loveReading(chart,t){
    const [theme,action]=loveThemes[t.god]||['관계에서 중요하게 여기는 기준을 살펴볼 수 있습니다.','상대에게 중요한 기준을 직접 물어보세요.'];
    const status=chart.input.relationshipStatus;
    let headline=theme,reason='이번 달 중심 글자가 이 주제를 나타내지만, 관계 자리와 직접 맞물리는 뚜렷한 합·충은 없습니다.',next=action;
    if(t.clash){
      headline='관계의 방식이 바뀌는 문제를 먼저 점검할 달입니다.';
      reason='태어난 날의 관계 자리와 이번 달 글자가 충(서로 부딪히는 관계)을 이룹니다. 변화의 단서이지 이별 확정은 아닙니다.';
      next=status==='dating'?'만나는 횟수나 거리 때문에 불편했던 점을 하나씩 말해보세요.':'새 만남이라면 생활 리듬과 원하는 관계 속도를 먼저 확인해보세요.';
    }else if(t.partner&&t.stemJoin){
      headline='새 만남보다 관계의 조건과 약속을 맞추는 쪽에 무게가 실립니다.';
      reason='이번 달 글자가 전통적인 배우자 관련 상징이며, 태어난 날의 중심 글자와 합(서로 연결되는 관계)을 이룹니다.';
      next=status==='dating'?'함께할 일정과 돈 문제 중 아직 맞추지 않은 한 가지를 이야기해보세요.':'호감이 생겼다면 연락보다 생활 방식과 약속을 지키는 태도를 확인해보세요.';
    }else if(t.branchJoin){
      headline='멀어진 대화를 다시 이어가거나 친밀감을 확인할 소재가 있습니다.';
      reason='태어난 날의 관계 자리와 이번 달 글자가 육합(서로 연결되는 관계)을 이룹니다. 실제 화해나 만남을 보장하지는 않습니다.';
      next=status==='dating'?'최근 고마웠던 행동 하나를 구체적으로 말하고 다음 약속을 잡아보세요.':'상대와 편하게 나눴던 대화를 이어갈 질문 하나를 골라보세요.';
    }else if(t.stemJoin){
      headline='관심사를 연결해 볼 단서는 있지만 관계의 결과까지 알 수는 없습니다.';
      reason='태어난 날의 중심 글자와 이번 달 글자가 합(서로 연결되는 관계)을 이룹니다. 관계 자리의 변화와는 구분해서 봅니다.';
    }else if(t.trine){
      headline='관계의 방향을 서서히 맞춰볼 소재가 있습니다.';
      reason=`태어난 날의 관계 자리와 이번 달 글자가 삼합의 일부(같은 흐름으로 묶이는 조합)를 이룹니다. 단독으로 관계 진전을 뜻하지는 않습니다. 이번 달 중심 글자는 ${t.god==='편인'?'혼자 해석하기보다 확인하기':t.god==='정인'?'배려를 주고받기':t.god==='편재'?'새 만남의 취향':t.god==='비견'?'각자의 속도': '관계의 기준'}를 주제로 삼습니다.`;
    }else if(t.newConnection){
      headline='새 사람을 알아보는 대화 소재가 눈에 띕니다.';
      reason='이번 달 글자가 전통적인 만남·호감의 상징에 해당하지만, 관계 자리와 직접 맞물리는 합은 없습니다.';
    }else if(t.partner){
      headline='관계를 현실적으로 살펴볼 주제가 있습니다.';
      reason='이번 달 글자가 전통적인 배우자 관련 상징에 해당하지만, 관계 자리와 직접 맞물리는 합은 없습니다.';
    }else{
      reason=`이번 달 중심 글자는 ${t.god==='정관'?'약속과 책임':t.god==='정인'?'도움과 안정':t.god==='편인'?'혼자 생각하는 방식':t.god==='비견'?'독립적인 선택':t.god==='겁재'?'주변과의 거리':t.god==='식신'?'일상과 취미':t.god==='상관'?'표현 방식':t.god==='정재'?'현실적인 계획':'관계의 기준'}을 가리킵니다. 관계 자리와 직접 맞물리는 합·충은 없습니다.`;
    }
    return [`핵심 · ${headline}`,`근거 · ${reason}`,`대화 · ${next}`];
  }
  function makeQuickSummary(chart,year,month,game){
    const t=window.sajuRelationshipTransit(chart,year,month);
    const label=`${year}년 ${month}월`;
    const commitment=t.commitment>=4, change=t.change>=4;
    const ix=(month-1)%12, other=(ix+6)%12;
    const [,marriage,partner,money,work,health]=monthLens[t.god]||monthLens.default;
    const categories=[
      ['연애',...loveReading(chart,t)],
      ['결혼',`${commitment?'미래 계획을 말로 맞춰볼 소재가 있어요.':'결혼 시기보다 서로의 준비를 확인해보세요.'} ${marriageChecks[ix]}부터 이야기해보세요.`,marriage,`${t.branchJoin?'함께 살 때의 모습을 그려보세요.':t.clash?'큰 결정 전 생활의 변화를 확인해보세요.':'각자의 속도를 맞춰보세요.'} ${marriageChecks[other]}도 빼놓지 마세요.`],
      ['연인',`${change?'생활 방식이 달라질 때 대화가 필요해요.':'서로 지키기 쉬운 약속을 맞춰보세요.'} ${partnerChecks[ix]}부터 확인해보세요.`,partner,`${t.clash?'평소와 다른 선택이라면 서로의 뜻을 물어보세요.':'상대의 생각을 직접 확인해보세요.'} ${partnerChecks[other]}도 함께 이야기해보세요.`],
      ['자산·소비',`${/재/.test(t.god)?'수입과 지출의 균형을 점검해보세요.':'큰 지출 전 예산을 살펴보세요.'} 이번 점검 항목은 ${budgetChecks[ix]}입니다.`,money,`${budgetChecks[other]}도 꼭 쓸 돈과 선택해서 쓸 돈으로 나눠보세요.`],
      ['일·사업',`${/관|식|상/.test(t.god)?'일의 역할과 표현 방식을 살펴보세요.':'지금 맡은 일에서 바꾸고 싶은 것을 골라보세요.'} 이번 주제는 ${workChecks[ix]}입니다.`,work,`${workChecks[other]}에 관해 함께 일하는 사람과 기대를 맞춰보세요.`],
      ['건강·컨디션',health,`이번 달에는 ${restChecks[ix]} 항목을 살펴보세요.`,`다음 일정 전 ${restChecks[other]} 항목도 점검해보세요.`]
    ];
    const lines=[];
    for(const [category,...sentences] of categories)for(const sentence of sentences)lines.push({category,text:sentence});
    lines.push({category:'자리 게임',text:`${game.direction} 자리에 앉은 사람과 취향 질문 한 번! 연인 여부는 직접 대화해보세요.`});
    lines.push({category:'자리 게임',text:`${game.accessory}에게 좋아하는 데이트 코스를 물어보세요. 무작위 질문입니다.`});
    return {label,lines};
  }
  let current=null;
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
  function showQuickSummary(){
    if(!current)return;
    const [year,month]=$('summaryMonth').value.split('-').map(Number);
    const {label,lines}=makeQuickSummary(current,year,month,gameCards(year,month,gameTurn));
    if(lastSummary&&lastSummary.label!==label){
      $('monthChange').textContent=`${lastSummary.label} → ${label}: 새 달의 계산 단서를 반영했습니다. 근거가 같은 내용은 그대로 표시합니다.`;
    }else if(!lastSummary){$('monthChange').textContent='다른 달을 고르면 아래 문장들이 새롭게 바뀝니다.';}
    lastSummary={label,lines};
    $('quickTitle').textContent=`${label}, 무엇이 궁금하세요?`;
    const list=$('quickSummary');list.replaceChildren();
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
      if(index===7)button.addEventListener('click',()=>{detailReturnFocus=null;dialog.showModal();});
      else button.addEventListener('click',()=>openTopic(card,index===6?lines.slice(18):lines.slice(index*3,index*3+3),label,button));
    }
    renderReport(current,year,month);
  }
  const dialog=$('detailDialog');
  $('closeTopic').addEventListener('click',()=>topicDialog.close());
  topicDialog.addEventListener('click',event=>{if(event.target===topicDialog)topicDialog.close();});
  topicDialog.addEventListener('close',()=>{if(!topicGoingToDetails)detailReturnFocus=null;});
  $('topicFullDetails').addEventListener('click',()=>{topicGoingToDetails=true;topicDialog.close();dialog.showModal();});
  $('openDetails').addEventListener('click',()=>{if(current){detailReturnFocus=null;dialog.showModal();}});
  $('closeDetails').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{topicGoingToDetails=false;if(detailReturnFocus?.isConnected)detailReturnFocus.focus();detailReturnFocus=null;});
  $('summaryMonth').addEventListener('change',()=>{gameTurn=0;showQuickSummary();});
  $('rerollGame').addEventListener('click',()=>{gameTurn++;showQuickSummary();$('monthChange').textContent='자리 게임 질문을 다시 뽑았습니다.';});
  function renderReport(chart,year,month){
    const report=$('report');report.replaceChildren();
    if (!window.makeFullSajuReport) throw new Error('상세 분석 파일을 불러오지 못했습니다. 새로고침해주세요.');
    const detailed=window.makeFullSajuReport(chart,{year,month});
    const overview=add(report,'section','report-card report-overview','');
    add(overview,'h3','','30줄 핵심 요약');
    add(overview,'p','',`${year}년 ${month}월을 기준으로 계산한 요약입니다. 아래 12개 분야에서 근거와 한계를 확인하세요.`);
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
    $('question').textContent=topics[dayElement];
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
  window.makeQuickSajuSummary=makeQuickSummary;
})();
