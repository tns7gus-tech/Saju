/* Explainable relationship reading. Scores compare symbolic rules, not event probabilities. */
(() => {
  'use strict';
  const names={比肩:'비견',劫财:'겁재',食神:'식신',伤官:'상관',偏财:'편재',正财:'정재',七杀:'편관',正官:'정관',偏印:'편인',正印:'정인'};
  const stemPairs=['甲己','乙庚','丙辛','丁壬','戊癸'];
  const branchPairs=['子丑','寅亥','卯戌','辰酉','巳申','午未'];
  const clashes=['子午','丑未','寅申','卯酉','辰戌','巳亥'];
  const trines=['申子辰','亥卯未','寅午戌','巳酉丑'];
  const pair=(list,a,b)=>a!==b&&list.some(s=>s.includes(a)&&s.includes(b));
  const clamp=n=>Math.max(1,Math.min(5,n));
  const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
  const current=()=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'numeric'}).formatToParts(new Date());return {year:+p.find(x=>x.type==='year').value,month:+p.find(x=>x.type==='month').value};};

  function transit(chart,year,month){
    const e=window.Solar.fromYmdHms(year,month||7,15,12,0,0).getLunar().getEightChar();
    const gz=month?e.getMonth():e.getYear(),day=chart.pillars[2];
    const god=names[window.LunarUtil.SHI_SHEN[day.stem+gz[0]]]||'미확인';
    const partner=chart.input.gender==='male'&&god==='정재'||chart.input.gender==='female'&&god==='정관';
    const newConnection=chart.input.gender==='male'&&god==='편재'||chart.input.gender==='female'&&god==='편관';
    const stemJoin=pair(stemPairs,day.stem,gz[0]),branchJoin=pair(branchPairs,day.branch,gz[1]);
    const clash=pair(clashes,day.branch,gz[1]),trine=pair(trines,day.branch,gz[1])&&!clash;
    const repetition=chart.pillars.filter(p=>!p.unknown&&p.branch===day.branch).length;
    let meeting=2,commitment=2,change=2;
    const evidence=[`${gz[0]}의 ${god}(일간 ${day.stem}과의 관계)`];
    if(partner){meeting+=2;commitment+=2;change-=1;evidence.push(`${god}: 전통 명리에서 이 계산 기준의 배우자성`);}
    else if(newConnection){meeting+=2;change+=1;evidence.push(`${god}: 만남·호감의 소재`);}
    else if(god==='정관'){commitment++;evidence.push('정관: 약속·책임의 소재');}
    else if(god==='정인'){commitment++;evidence.push('정인: 지원·안정의 소재');}
    else if(god==='편관'){meeting++;change++;evidence.push('편관: 자극·현실 압력의 소재');}
    else if(god==='편인'||god==='비견'||god==='겁재'){change++;evidence.push(`${god}: 관계의 기존 방식 점검`);}
    if(stemJoin){meeting++;commitment++;evidence.push(`천간합 ${day.stem}${gz[0]}: 일간과 들어오는 글자의 결합`);}
    if(branchJoin){meeting+=2;commitment++;change--;evidence.push(`지지육합 ${day.branch}${gz[1]}: 일지(관계 자리)와의 결합`);}
    if(clash){meeting++;change+=3;evidence.push(`일지 ${day.branch}와 ${gz[1]}의 충: 관계 상태·생활방식 변화${repetition>1?` (원국에 ${day.branch} ${repetition}곳)`:''}`);}
    if(trine&&!branchJoin){commitment++;evidence.push(`일지 ${day.branch}와 ${gz[1]}의 삼합 일부`);}
    if(!month){
      const hidden=window.LunarUtil.ZHI_HIDE_GAN[gz[1]]||[];
      if(hidden.some(s=>chart.input.gender==='male'&&names[window.LunarUtil.SHI_SHEN[day.stem+s]]==='정재'||chart.input.gender==='female'&&names[window.LunarUtil.SHI_SHEN[day.stem+s]]==='정관')){
        meeting++;commitment++;evidence.push(`지지 ${gz[1]}의 지장간에 배우자성 포함`);
      }
      const p=chart.luck?.periods.find(x=>x.startYear<=year&&year<=x.endYear);
      if(p&&(chart.input.gender==='male'&&names[window.LunarUtil.SHI_SHEN[day.stem+p.ganZhi[0]]]==='정재'||chart.input.gender==='female'&&names[window.LunarUtil.SHI_SHEN[day.stem+p.ganZhi[0]]]==='정관')){
        meeting++;commitment++;evidence.push(`대운 ${p.ganZhi}의 천간에 배우자성 포함`);
      }
    }
    return {year,month,gz,day,god,meeting:clamp(meeting),commitment:clamp(commitment),change:clamp(change),partner,newConnection,stemJoin,branchJoin,clash,trine,evidence};
  }
  const luckAt=(c,y)=>c.luck?.periods.find(p=>p.startYear<=y&&y<=p.endYear);
  function scenario(t,status){
    if(t.clash)return `${status==='single'?'새로운 만남이나 관계 진전의 계기가 될 수도 있습니다.':'관계가 안정적이라면 결혼 논의·동거·이사처럼 구조를 바꾸는 쪽으로 나타날 수 있습니다.'} 이미 갈등이 쌓였다면 거리·직장·생활방식 문제가 드러나 관계를 재정비할 수 있습니다. 충은 이별 확정이 아닙니다.`;
    if(t.partner&&t.stemJoin)return '새 만남이라면 속도를 조절하면서 가치관을 확인하세요. 교제 중이라면 미래 계획과 경제·생활 조건을 구체적으로 맞춰볼 만합니다.';
    if(t.branchJoin)return '친밀감·관계 회복을 대화하기 좋은 해석 단서입니다. 합이 실제 화해나 결혼을 보장하지는 않습니다.';
    if(t.commitment>=4)return '관계를 공식화할지 약속을 어떻게 지킬지 대화해 보세요. 기존 문제가 크다면 관계를 정리하는 선택도 가능합니다.';
    if(t.meeting>=4)return '새 만남·호감의 소재는 있으나 실제 관계의 속도와 생활 조건을 따로 살펴보세요.';
    return '십성의 주제를 점검하되, 특정 관계 사건을 예측할 구조적 단서는 제한적입니다.';
  }

  function makeReport(chart,override){
    if(!window.Solar||!window.LunarUtil)throw new Error('달력 계산 파일을 불러오지 못했습니다.');
    const now=override||current(),day=chart.pillars[2],status=chart.input.relationshipStatus||'';
    const sections=[], add=(title,confidence,paragraphs,items=[],table=null)=>sections.push({title,confidence,paragraphs,items,table});
    const years=[0,1,2].map(i=>transit(chart,now.year+i));
    const firstMonth=now.month>=6?Math.max(6,now.month-3):1;
    const months=Array.from({length:13-firstMonth},(_,i)=>transit(chart,now.year,firstMonth+i));
    const active=luckAt(chart,now.year);
    add('1. 관계 분석의 출발점','원국 계산값 + 명시된 해석 규칙',[
      `일간 ${day.stem}·일지 ${day.branch} 기준입니다. 일지(가까운 관계를 읽는 자리)를 매년·매월 들어오는 지지와 비교합니다. ${chart.input.gender?'배우자성은 전통적인 남성/여성 계산 기준의 상징으로만 사용합니다.':'남성/여성 계산 기준을 선택하지 않아 배우자성에 따른 추가 점수는 적용하지 않았습니다.'}`,
      active?`현재 대운(약 10년 흐름)은 ${active.startYear}~${active.endYear}년 ${active.ganZhi}입니다. 세운·월운과 함께 볼 배경이며 대운 하나로 사건을 확정하지 않습니다.`:'대운은 정확한 출생 시각과 남성/여성 전통 계산 기준이 있어야 확인할 수 있습니다. 없는 값을 추정하지 않았습니다.',
      '별점은 각 항목 2점에서 시작해 배우자성(+2 만남·공식화), 천간합(+1 만남·공식화), 일지육합(+2 만남·+1 공식화), 일지충(+3 변동) 등 명시된 규칙을 적용하고 1~5점으로 제한합니다. 연운은 지장간·해당 대운의 배우자성도 반영합니다. 이는 상대 지표이며 통계적인 결혼·이별 확률이 아닙니다.'
    ]);
    add(`2. ${now.year}년 월별 연애·결혼·관계 변동`,'월주: 각 월 15일, 절입 기준',[
      `${firstMonth}월부터 12월까지 비교합니다. 월주는 매월 1일이 아니라 절입 시각에 바뀌므로 절입 전후의 날짜는 다시 확인하세요.`
    ],[],{headers:['월','월운','만남·연애','결혼·공식화','갈등·변동','원국과의 근거'],rows:months.map(t=>[`${t.month}월`,t.gz,stars(t.meeting),stars(t.commitment),stars(t.change),t.evidence.slice(1).join(' · ')||t.evidence[0]])});
    const caution=[...months].sort((a,b)=>b.change-a.change||a.month-b.month)[0];
    const promising=[...months].sort((a,b)=>(b.meeting+b.commitment-b.change)-(a.meeting+a.commitment-a.change)||a.month-b.month)[0];
    add('3. 가장 눈에 띄는 달','간지·합충·두 갈래 해석',[
      `${promising.year}년 ${promising.month}월 ${promising.gz}: 연애 ${stars(promising.meeting)}, 공식화 ${stars(promising.commitment)}. 근거: ${promising.evidence.join(' / ')}. ${scenario(promising,status)}`,
      `${caution.year}년 ${caution.month}월 ${caution.gz}: 관계 변동 ${stars(caution.change)}. 근거: ${caution.evidence.join(' / ')}. ${scenario(caution,status)}`,
      `두 달을 비교할 때 일간 ${day.stem}과 천간의 관계, 일지 ${day.branch}와 지지의 합·충을 각각 확인하세요. 좋은 시기 뒤에 변동 시기가 와도 그것이 관계 종료를 뜻하지는 않습니다.`
    ]);
    add(`4. ${now.year}~${now.year+2}년 연도별 비교`,'세운: 입춘 기준',[
      '연도 간지는 매년 입춘에 바뀝니다. 표는 입춘 이후의 간지이며 1~2월 경계일의 사건에는 이전 간지가 적용될 수 있습니다.'
    ],[],{headers:['연도','세운','만남·연애','결혼·공식화','갈등·변동','원국과의 근거'],rows:years.map(t=>[`${t.year}년`,t.gz,stars(t.meeting),stars(t.commitment),stars(t.change),t.evidence.slice(1).join(' · ')||t.evidence[0]])});
    add('5. 연도별 흐름과 갈림길','대운 + 세운 + 관계 조건',years.map(t=>{
      const p=luckAt(chart,t.year);
      return `${t.year}년 ${t.gz} (세는나이 ${t.year-Number(chart.solarDate.slice(0,4))+1}세): ${t.evidence.join(' / ')}. ${scenario(t,status)}${p?` 이 해의 대운은 ${p.ganZhi}(${p.startYear}~${p.endYear}년)입니다.`:''}`;
    }));
    const all=[...months];for(let y=now.year+1;y<=now.year+2;y++)for(let m=1;m<=12;m++)all.push(transit(chart,y,m));
    const rank=(metric)=>[...all].sort((a,b)=>b[metric]-a[metric]||a.year-b.year||a.month-b.month).slice(0,5).map(t=>`${t.year}년 ${t.month}월 ${t.gz} ${stars(t[metric])} (${t.evidence.slice(1).join(' / ')||t.evidence[0]})`);
    add('6. 관계 흐름 비교 TOP 5','지난 달 포함 · 동점 시 빠른 달부터',[
      `만남·연애: ${rank('meeting').join(' | ')}`,
      `결혼·공식화: ${rank('commitment').join(' | ')}`,
      `갈등·변화 점검: ${rank('change').join(' | ')}`,
      '지난 달도 비교를 위해 포함했습니다. TOP 5는 명리 규칙의 상대 순위이며, 특정 날짜의 실제 만남·혼인·이별이 일어날 확률 순위가 아닙니다.'
    ]);
    add('7. 현실적인 관계 전략','해석의 한계와 실제 선택',[
      '변동성이 큰 달·해에는 연락 빈도, 거리, 돈, 생활방식을 말로 확인하세요. 안정적인 관계라면 같은 변화가 이사나 결혼 논의로 나타날 수 있습니다.',
      '합하는 달·해에는 미래를 이야기해 볼 만하지만 합만으로 상대의 의사나 신뢰도를 알 수 없습니다. 결정은 상대가 지키는 약속과 실제 행동을 기준으로 하세요.',
      '출생시각·출생지 보정·절입 경계가 불명확하면 계산값이 달라질 수 있습니다. 이 점수는 건강·재정·법률상 중요한 결정을 대신하지 않습니다.'
    ]);
    return sections;
  }
  window.makeSajuReport=makeReport;
  window.sajuRelationshipTransit=transit;
})();
