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
  function render(chart) {
    const {input,solarDate,pillars,elements,luck,warnings,dayElement}=chart;
    $('chartMeta').textContent=`${input.calendar==='lunar'?'음력':'양력'} ${input.date}${input.leapMonth?' · 윤달':''} · 양력 환산 ${solarDate}${input.time?' · '+input.time:''}`;
    if(!window.renderVisualManse) throw new Error('만세력 표 파일을 불러오지 못했습니다. 새로고침해주세요.');
    window.renderVisualManse(chart);
    $('elements').textContent='보이는 글자 기준 오행 · '+Object.entries(elements).map(([e,n])=>`${e} ${n}`).join('  /  ');
    $('luck').textContent=luck?`대운 ${luck.direction} · 출생 후 ${luck.start[0]}년 ${luck.start[1]}개월 ${luck.start[2]}일 시작 (대운수 약 ${luck.periods[0].startAge-1}세) · ${luck.periods.slice(0,5).map(p=>`${p.startYear}년 ${p.ganZhi}`).join(' → ')}`:'대운 · 출생 시각과 계산 기준 선택 시 표시';
    $('warnings').textContent=warnings.join(' ');
    const report=$('report');report.replaceChildren();
    if (!window.makeSajuReport) throw new Error('분석 규칙 파일을 불러오지 못했습니다. 새로고침해주세요.');
    for (const section of window.makeSajuReport(chart)) {
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
    $('question').textContent=topics[dayElement];
    $('output').hidden=false;
    $('output').scrollIntoView({behavior:'smooth',block:'start'});
  }

  form.elements.calendar.addEventListener('change',()=>{$('leapField').hidden=form.elements.calendar.value!=='lunar'; if(form.elements.calendar.value!=='lunar')form.elements.leapMonth.checked=false;});
  let current=null;
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
})();
