/* GitHub Pages preview: all birth data stays in this browser. */
(() => {
  'use strict';
  const form = document.getElementById('manseForm');
  const $ = id => document.getElementById(id);
  const stems = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'};
  const branches = {寅:'목',卯:'목',巳:'화',午:'화',辰:'토',戌:'토',丑:'토',未:'토',申:'금',酉:'금',亥:'수',子:'수'};
  const topics = {목:'새로운 일을 시작할 때 먼저 계획하는 편인가요?',화:'요즘 가장 신나게 이야기할 수 있는 주제는 뭔가요?',토:'쉬는 날 안정감을 느끼는 루틴이 있나요?',금:'결정할 때 가장 중요하게 보는 기준은 뭔가요?',수:'호기심이 생기면 바로 알아보는 편인가요?'};
  const names = ['년주','월주','일주','시주'];
  const keys = ['Year','Month','Day','Time'];

  function calculate(input) {
    if (!window.Solar || !window.Lunar) throw new Error('달력 계산 파일을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해주세요.');
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date);
    if (!m) throw new Error('생년월일을 입력해주세요.');
    const [year, month, day] = m.slice(1).map(Number);
    if (year < 1900 || year > 2050 || month < 1 || month > 12 || day < 1 || day > 31) throw new Error('1900년부터 2050년 사이의 날짜를 입력해주세요.');
    const known = !!input.time;
    const [hour, minute] = known ? input.time.split(':').map(Number) : [12,0];
    if (known && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))) throw new Error('출생 시각을 확인해주세요.');
    if (input.calendar === 'solar' && (new Date(Date.UTC(year,month-1,day)).toISOString().slice(0,10) !== input.date)) throw new Error('존재하지 않는 양력 날짜입니다.');
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
    const eight = solar.getLunar().getEightChar();
    const pillars = keys.map((key,i) => {
      if (key === 'Time' && !known) return {name:names[i],unknown:true};
      const hanja = eight['get'+key]();
      return {name:names[i],hanja,stem:hanja[0],branch:hanja[1],stemElement:stems[hanja[0]],branchElement:branches[hanja[1]]};
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
      luck = {direction: yun.isForward() ? '순행' : '역행', start: [yun.getStartYear(),yun.getStartMonth(),yun.getStartDay()], periods:yun.getDaYun(9).filter(d=>d.getIndex()>0).map(d=>`${d.getStartYear()}년(${d.getStartAge()}세) ${d.getGanZhi()}`)};
    }
    return {input,solarDate:solar.toYmd(),pillars,elements,luck,warnings,dayElement:pillars[2].stemElement};
  }

  const add = (parent,tag,cls,value) => { const el=document.createElement(tag); if(cls)el.className=cls; el.textContent=value; parent.append(el); return el; };
  function render(chart) {
    const {input,solarDate,pillars,elements,luck,warnings,dayElement}=chart;
    $('chartMeta').textContent=`${input.calendar==='lunar'?'음력':'양력'} ${input.date}${input.leapMonth?' · 윤달':''} · 양력 환산 ${solarDate}${input.time?' · '+input.time:''}`;
    const wrap=$('pillars'); wrap.replaceChildren();
    for(const p of pillars){
      const card=add(wrap,'div','pillar','');
      add(card,'span','name',p.name);
      const blocks=add(card,'div','blocks','');
      if(p.unknown) add(blocks,'span','', '—');
      else { add(blocks,'span','pill-element-'+p.stemElement,p.stem);add(blocks,'span','pill-element-'+p.branchElement,p.branch); }
      add(card,'small','',p.unknown?'출생시각 필요':`${p.stemElement} / ${p.branchElement}`);
    }
    $('elements').textContent='보이는 글자 기준 오행 · '+Object.entries(elements).map(([e,n])=>`${e} ${n}`).join('  /  ');
    $('luck').textContent=luck?`대운 ${luck.direction} · 출생 후 ${luck.start[0]}년 ${luck.start[1]}개월 ${luck.start[2]}일 시작 · ${luck.periods.slice(0,5).join(' → ')}`:'대운 · 출생 시각과 계산 기준 선택 시 표시';
    $('warnings').textContent=warnings.join(' ');
    const high=Object.entries(elements).sort((a,b)=>b[1]-a[1])[0];
    $('reading').textContent=`일간은 ${pillars[2].stem}(${dayElement})입니다. 일간은 자신을 나타내는 기준 글자입니다. 표시된 ${input.time?'8':'6'}글자에서는 ${high[0]}이(가) ${high[1]}개로 가장 많습니다. 이 단순 개수만으로 성격이나 궁합, 건강, 재물의 결과를 단정할 수 없습니다. 월지의 계절, 숨은 글자, 합과 충을 함께 확인해야 합니다.`;
    $('question').textContent=topics[dayElement];
    $('output').hidden=false;
    $('output').scrollIntoView({behavior:'smooth',block:'start'});
  }

  form.elements.calendar.addEventListener('change',()=>{$('leapField').hidden=form.elements.calendar.value!=='lunar'; if(form.elements.calendar.value!=='lunar')form.elements.leapMonth.checked=false;});
  let current=null;
  form.addEventListener('submit',event=>{
    event.preventDefault();$('error').textContent='';
    try { current=calculate({calendar:form.elements.calendar.value,date:form.elements.date.value,time:form.elements.time.value,gender:form.elements.gender.value,leapMonth:form.elements.leapMonth.checked});render(current); }
    catch(err){ $('output').hidden=true; current=null; $('error').textContent=err.message; }
  });
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
    current.pillars.forEach((p,i)=>{
      const x=65+i*235;ctx.fillStyle='#fff';ctx.fillRect(x,200,215,220);
      ctx.fillStyle='#25392e';ctx.font='25px sans-serif';ctx.fillText(p.name,x+20,245);
      ctx.font='bold 67px sans-serif';ctx.fillText(p.unknown?'—':p.hanja,x+20,333);
      ctx.font='20px sans-serif';ctx.fillText(p.unknown?'시각 미입력':`${p.stemElement} / ${p.branchElement}`,x+20,385);
    });
    ctx.fillStyle='#25392e';ctx.font='24px sans-serif';ctx.fillText('오행  '+Object.entries(current.elements).map(([e,n])=>`${e} ${n}`).join('   '),65,485);
    ctx.font='20px sans-serif';ctx.fillText('계산 기준: 한국 현지 표준시 · 출생지 보정 없음 · 자정 일주 교체',65,550);
    ctx.fillText('사주 결과는 자기 탐색과 대화의 소재입니다.  SAI',65,600);
    const link=document.createElement('a');link.href=c.toDataURL('image/png');link.download='sai-manse.png';link.click();
  });
  window.calculateStaticManse=calculate;
})();
