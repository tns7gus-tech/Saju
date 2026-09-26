/* Structured, source-bound reading for the static preview. No medical or financial predictions. */
(() => {
  'use strict';
  const meaning={비견:'자기 기준·동료',겁재:'동료와 자원 배분',식신:'꾸준한 표현·생산',상관:'새 방식의 표현',편재:'유동적인 자원·기회',정재:'계획적인 자원 관리',편관:'압박·경쟁',정관:'규칙·책임',편인:'선택적인 학습',정인:'학습·지원'};
  const pairs={join:['子丑','寅亥','卯戌','辰酉','巳申','午未'],clash:['子午','丑未','寅申','卯酉','辰戌','巳亥'],trine:['申子辰','亥卯未','寅午戌','巳酉丑']};
  const relates=(list,a,b)=>a!==b&&list.some(p=>p.includes(a)&&p.includes(b));
  const signs=['목','화','토','금','수'];
  const yearAge=(chart,year)=>`${year}년 (세는나이 ${year-Number(chart.solarDate.slice(0,4))+1}세)`;
  const readable=(p)=>p.unknown?'미확인':`${p.hanja} (${p.stemElement}/${p.branchElement})`;
  const evidence=t=>t.evidence.slice(1).join(' · ')||`${t.gz[0]}와 일간 사이의 ${t.god} (${meaning[t.god]||'분류 확인 필요'})`;
  const periodAt=(chart,year)=>chart.luck?.periods.find(p=>p.startYear<=year&&year<=p.endYear);
  const tone=t=>t.clash?'관계 자리의 충은 생활 방식의 변화를 검토할 단서입니다. 혼인·이별을 판정하지 않습니다.':t.branchJoin?'관계 자리의 합은 가까워지는 방식에 관한 대화 소재입니다. 실제 만남을 보장하지 않습니다.':t.partner?'전통적 배우자성 단서가 있으나 상대의 의사와 현실 조건은 별도로 확인해야 합니다.':t.trine?'삼합의 일부만 성립합니다. 나머지 글자가 확인되지 않으면 완성된 결합으로 읽지 않습니다.':'이 글자만으로 특정 사건을 지목할 수 없습니다.';
  const add=(sections,title,paragraphs,items=[],table=null,confidence='명리 규칙에 따른 해석 · 사건 예측 아님')=>sections.push({title,confidence,paragraphs,items,table});

  function makeReport(chart,selected){
    if(!window.sajuRelationshipTransit)throw new Error('월별 계산 규칙을 불러오지 못했습니다.');
    const {pillars:p,elements,solarDate,luck,input,warnings}=chart;
    const year=selected?.year||new Date().getFullYear(),month=selected?.month||1;
    const day=p[2],born=Number(solarDate.slice(0,4)),known=!p[3].unknown;
    const missing=signs.filter(s=>elements[s]===0),many=signs.filter(s=>elements[s]>=3);
    const daySupport=elements[day.stemElement],same=Object.values(elements).reduce((a,b)=>a+b,0);
    const decade=periodAt(chart,year),transit=window.sajuRelationshipTransit;
    const annual=Array.from({length:9},(_,i)=>transit(chart,year+i));
    const monthly=Array.from({length:12},(_,i)=>transit(chart,year,i+1));
    const thisMonth=monthly[month-1];
    const portions=luck?.periods||[];
    const strongest=Object.entries(elements).sort((a,b)=>b[1]-a[1]);
    const section=[],basis=`${p.filter(x=>!x.unknown).map(x=>`${x.name} ${x.hanja}`).join(' · ')}${known?'':' · 시주 미확인'}`;
    const counted=`${signs.map(s=>`${s} ${elements[s]}`).join(' / ')} (${same}글자)`;
    const partner=input.gender==='male'?'재성(자원·돈을 뜻하는 전통적 분류)':'관성(규칙·책임을 뜻하는 전통적 분류)';
    const important=annual.filter(t=>t.clash||t.branchJoin||t.stemJoin||t.partner).slice(0,3);
    const turning=important.length?important:annual.slice(0,3);
    const uncertainty='이 판단은 계산된 간지 간 관계에 한정됩니다. 실제 사건, 성격, 수익, 건강 상태는 확인되지 않았습니다.';

    add(section,'1. 만세력 판독 요약',[
      `${input.calendar==='lunar'?'음력':'양력'} ${input.date}${input.leapMonth?' (윤달)':''}, 양력 환산 ${solarDate}, 출생시각 ${input.time||'미입력'}, 계산 기준 ${input.gender==='male'?'남성':input.gender==='female'?'여성':'선택 안 함'}.`,
      `원국: ${basis}. 일간(나를 나타내는 글자)은 ${day.stem}(${day.stemElement})입니다. 천간·지지에서 보이는 글자만 센 오행은 ${counted}입니다. 지장간까지 센 분포와는 다릅니다.`,
      luck?`대운은 ${luck.direction}, 출생 후 ${luck.start[0]}년 ${luck.start[1]}개월 ${luck.start[2]}일에 시작합니다. 표시 구간: ${portions.map(x=>`${x.startYear}년 ${x.ganZhi}`).join(' → ')}.`:'시각 또는 전통적 남성/여성 계산 기준이 없어 대운 시작 시점과 배열을 표시하지 않습니다.',
      `${warnings.join(' ')}. 절입 경계와 출생지 보정에 따라 다른 앱과 글자가 달라질 수 있습니다.`
    ],[],{headers:['구분','간지','천간 십성','지지 십성','지장간','12운성'],rows:p.map(x=>[x.name,readable(x),x.unknown?'미확인':x.tenGod,x.unknown?'미확인':x.branchGod,x.unknown?'미확인':x.hiddenStems.join('·'),x.unknown?'미확인':x.stage])},'계산값 · 출생 정보에 따름');

    add(section,'2. 원국 핵심 구조',[
      `월지 ${p[1].branch}(${p[1].branchElement})는 태어난 달의 계절 배경입니다. 일간 ${day.stem}(${day.stemElement})을 이 계절과 함께 읽되, 한 글자의 이미지로 성격을 확정하지 않습니다.`,
      `보이는 글자는 ${strongest.map(([k,v])=>`${k} ${v}`).join(', ')}입니다. ${missing.length?`${missing.join('·')}가 보이는 여덟 글자에는 없지만 지장간에도 없다는 뜻은 아닙니다.`:'보이는 다섯 오행이 모두 있습니다.'} ${many.length?`${many.join('·')}이 3개 이상으로 눈에 띕니다.`:'어느 한 오행도 보이는 글자만으로 3개 이상은 아닙니다.'}`,
      `일간과 같은 ${day.stemElement}이(가) 보이는 글자 ${daySupport}곳에 있습니다. 신강/신약(일간의 상대적인 힘)은 월지의 계절, 지지의 뿌리, 지장간, 천간의 지원을 함께 평가해야 합니다. 단순 개수만으로 중화·신강·신약을 확정하거나 용신(균형을 위해 중시하는 글자)을 지정하지 않습니다.`,
      `원국의 십성(일간과 다른 글자의 관계) 중 ${p.filter(x=>!x.unknown&&x.tenGod!=='일간').map(x=>`${x.name} ${x.tenGod}(${meaning[x.tenGod]||'의미 검토'})`).join(' · ')}이(가) 드러납니다. 생활에서는 실제로 맡은 역할과 반복되는 선택을 먼저 확인해야 합니다. ${uncertainty}`
    ]);

    const periodsForAge=(age)=>portions.find(x=>x.startAge<=age&&age<=x.startAge+9);
    const ages=[[0,9,'어린 시절'],[10,19,'10대'],[20,29,'20대'],[30,39,'30대'],[40,49,'40대'],[50,59,'50대'],[60,99,'60대 이후']];
    add(section,'3. 평생 총운',[
      '아래 나이 구간은 대운표와 실제 연령을 연결하기 위한 탐색 순서입니다. 생애 사건을 사주만으로 복원할 수 없으며, 각 시기의 실제 경험을 확인해야 해석을 조정할 수 있습니다.',
      luck?`선택한 계산 기준의 대운은 ${luck.direction}으로 흐릅니다. 시작 나이는 만 나이가 아니라 만세력의 대운 표기입니다. 대운이 시작되는 해의 절입 경계에서는 앱별 표시 차이가 있을 수 있습니다.`:'대운이 계산되지 않아 특정 나이대의 글자와 취업·결혼 같은 시기를 연결하지 않습니다.'
    ],ages.map(([a,b,label])=>{const y=born+a,k=periodsForAge(a)||periodsForAge(Math.max(a+5,1));return `${label} (${a}~${b}세): ${k?`${k.startYear}~${k.endYear}년 ${k.ganZhi} 대운과 겹칩니다. ${k.ganZhi[0]}·${k.ganZhi[1]}의 십성과 월지의 관계를 따로 확인해야 합니다.`:'표시 가능한 대운이 없어 세부 사건 시기를 판정하지 않습니다.'} 해당 시기의 돈·일·관계·건강 변화는 생애 사실과 대조하세요.`;}));

    add(section,'4. 금전운',[
      `재성(일간이 다루는 자원과 재화를 상징)은 원국의 ${p.filter(x=>!x.unknown&&/재/.test(x.tenGod)).map(x=>`${x.name} ${x.tenGod}`).join(', ')||'겉으로 드러난 천간에서 확인되지 않습니다'}. 이것은 실제 소득이나 재산 규모를 나타내는 수치가 아닙니다.`,
      `이번 달 ${thisMonth.gz}의 ${thisMonth.god}은(는) ${meaning[thisMonth.god]||'계산된 관계'}이라는 해석 소재입니다. ${/재/.test(thisMonth.god)?'새 제안이 있다면 기대 수익보다 계약 조건과 손실 한도를 먼저 확인하세요.':'돈을 벌거나 잃는 시기를 이 분류 하나만으로 정하지 마세요.'}`,
      `월급·사업·투자·부동산 중 어느 방식이 맞는지는 자본, 기술, 부채, 위험 감수 성향 같은 실제 자료가 필요합니다. 합·충이 있더라도 수익률이나 부자가 될 시기를 수치로 예측하지 않습니다.`
    ]);
    add(section,'5. 직업운',[
      `원국의 월주 ${p[1].hanja}는 직업을 살필 때 참고하는 계절·사회 환경의 단서이고, 이달 ${thisMonth.gz}의 ${thisMonth.god}은(는) ${meaning[thisMonth.god]||'분류 확인이 필요한 역할'}을(를) 가리킵니다. 이것만으로 공무원·IT·영업 등 특정 직업의 적성을 확정하지 않습니다.`,
      decade?`현재 대운 ${decade.startYear}~${decade.endYear}년 ${decade.ganZhi}와 올해 세운 ${annual[0].gz}을 함께 볼 수 있습니다. 역할이 바뀌는 제안은 연봉, 근무 조건, 배울 기술을 비교해 판단하세요.`:'대운 자료가 없어 현재 직업의 장기 흐름은 보류합니다.',
      '승진·이직·독립을 검토한다면 운세 문장보다 경력, 채용 조건, 현금흐름, 생활 제약을 먼저 비교하세요.'
    ]);
    add(section,'6. 연애운',[
      `일지 ${day.branch}는 명리학에서 가까운 관계를 읽는 자리입니다. 선택한 ${year}년 ${month}월 ${thisMonth.gz}과의 비교: ${evidence(thisMonth)}. ${tone(thisMonth)}`,
      `원국에서 상대에게 끌리는 유형, 집착·회피 성향이나 과거 이별 경험은 확인할 수 없습니다. 실제 연애에서는 연락, 시간, 돈, 거리 중 무엇이 갈등이었는지를 당사자에게 묻는 편이 정확합니다.`,
      `인연을 알아볼 때에는 ${thisMonth.god}(${meaning[thisMonth.god]||'이번 달의 소재'})을(를) 질문으로 바꿔보세요. 월운은 절입에 바뀌므로 ${month}월 초의 날짜는 전달 월주에 속할 수 있습니다.`
    ],monthly.map(t=>`${t.month}월 ${t.gz}: ${evidence(t)}. ${tone(t)}`));
    add(section,'7. 결혼운',[
      `${input.gender?`선택한 전통적 ${input.gender==='male'?'남성':'여성'} 계산 기준에서 배우자성은 ${partner}입니다.`:'계산 기준이 없어 배우자성 관련 판단을 생략합니다.'} 원국이나 세운의 한 글자로 결혼 적령기, 배우자의 외모·경제력, 이혼·재혼을 예측하지 않습니다.`,
      `올해 ${annual[0].gz}: ${evidence(annual[0])}. ${tone(annual[0])}`,
      `결혼을 고민한다면 주거, 부채, 가사, 가족과의 거리, 자녀 계획에 합의가 있는지 점검하세요. 원국의 오행만으로 자녀 수·성별·양육 적성을 단정하지 않습니다.`
    ]);
    add(section,'8. 건강운',[
      `오행 ${counted}은 만세력 글자 분포입니다. 보이는 ${missing.join('·')||'어느'} 기운의 부족이나 ${many.join('·')||'특정'} 기운의 집중을 질환, 사고, 수술 또는 체질과 연결할 의학적 근거로 사용할 수 없습니다.`,
      '건강 관련 결정을 할 때는 본인의 증상·검진·전문의 의견을 우선하세요. 과로·수면·운동·음주 습관을 점검하는 일반적인 질문은 가능하지만 질병이 생길 연도를 표시하지 않습니다.'
    ],[],null,'의학적 판독 불가');
    add(section,'9. 인간관계/가족운',[
      `원국에 비견·겁재(동료와 자원 배분을 상징) 단서가 ${p.filter(x=>!x.unknown&&['비견','겁재'].includes(x.tenGod)).length}곳 천간에 보입니다. 관계에서 내 기준과 상대의 요구가 어떻게 맞는지 이야기할 소재일 뿐 실제 부모·형제 관계는 알 수 없습니다.`,
      `올해 관계 자리와 세운의 단서는 ${evidence(annual[0])}입니다. ${tone(annual[0])}`,
      '돈을 빌려주거나 공동투자할 때는 사주보다 계약서, 채무 책임, 회수 계획을 확인하세요. 가족의 마음이나 행동을 출생 정보로 판정하지 않습니다.'
    ]);
    add(section,'10. 대운 상세 해석',[
      luck?`대운 ${luck.direction} · 출생 후 ${luck.start[0]}년 ${luck.start[1]}개월 ${luck.start[2]}일 시작. 아래의 연도는 대운 시작 연도이며, 연령은 원본 만세력의 표기값입니다.`:'출생시각과 계산 기준이 모두 있을 때만 대운을 표시합니다. 미입력 정보를 추정해 배열을 만들지 않았습니다.',
      '대운은 시기별 상징의 배경입니다. 각 대운을 곧바로 투자·직장·혼인 결과로 번역하면 근거가 부족합니다.'
    ],portions.map(x=>`${x.startYear}~${x.endYear}년 ${x.ganZhi} (대운표 ${x.startAge}세 시작): 천간 ${x.ganZhi[0]}와 지지 ${x.ganZhi[1]}이 원국 일지 ${day.branch}와 ${relates(pairs.clash,day.branch,x.ganZhi[1])?'충(방향 변화)':relates(pairs.join,day.branch,x.ganZhi[1])?'합(연결)':'직접적인 합·충 없이'} 만납니다. 일·돈·관계는 실제 환경과 선택에 따라 달라집니다.`));
    add(section,'11. 세운 핵심 해석',[
      `${year}년부터 ${year+8}년까지 입춘 이후의 간지를 비교합니다. 세운의 해 시작은 양력 1월 1일이 아니므로 절입 경계일을 구분해야 합니다.`,
      '아래의 변화 단서는 일지와 해의 글자 사이의 규칙입니다. 합이나 충이 실제 사고·합격·혼인·부동산 손익을 확정하지 않습니다.'
    ],annual.map(t=>`${yearAge(chart,t.year)} ${t.gz}${periodAt(chart,t.year)?` · 대운 ${periodAt(chart,t.year).ganZhi}`:''}: ${evidence(t)}. ${tone(t)}`));
    add(section,'12. 현실 조언 및 총평',[
      `핵심 구조: ${basis}. 보이는 오행 ${counted}. ${missing.length?`겉글자에 ${missing.join('·')}이(가) 없지만 내면의 지장간과 실제 행동의 결핍을 뜻하지는 않습니다.`:'다섯 오행이 겉글자에 모두 확인됩니다.'}`,
      `먼저 확인할 세 가지: ① 본인이 실제로 겪은 직업·관계의 변화, ② 현재 부채와 생활비, ③ 건강검진과 수면 상태. 출생 정보만으로 이를 채워 넣지 않습니다.`,
      `앞으로 비교할 시기: ${turning.map(t=>`${t.year}년 ${t.gz}(${t.clash?'충':t.branchJoin?'합':t.stemJoin?'천간합':t.partner?'배우자성':'십성'})`).join(' · ')}. 이는 다른 해보다 주목할 계산 단서이며, 사건 발생 확률의 순위가 아닙니다.`,
      '총평: 확인된 계산값을 자기 탐색의 질문으로 사용하세요. 일·돈·관계의 중요한 선택은 상대의 말과 행동, 계약 조건과 실제 자료로 검증해야 합니다.'
    ]);
    const overview=[
      `원국은 ${basis}입니다.`,`일간은 ${day.stem}(${day.stemElement})입니다.`,`오행은 ${counted}입니다.`,`태어난 달의 지지는 ${p[1].branch}(${p[1].branchElement})입니다.`,
      `${missing.length?`겉글자에 없는 오행은 ${missing.join('·')}입니다.`:'겉글자에 다섯 오행이 모두 있습니다.'}`,`${many.length?`3개 이상 보이는 오행은 ${many.join('·')}입니다.`:'겉글자에서 3개 이상인 오행은 없습니다.'}`,`지장간을 포함하면 오행 분포는 달라질 수 있습니다.`,`일지 ${day.branch}는 관계를 읽는 자리에 해당합니다.`,
      `${known?`시주 ${p[3].hanja}가 확인됩니다.`:'출생 시각이 없어 시주는 미확인입니다.'}`,`${luck?`대운은 ${luck.direction}입니다.`:'대운은 입력 부족으로 미확인입니다.'}`,`${luck?`첫 대운은 ${portions[0].startYear}년 ${portions[0].ganZhi}입니다.`:'첫 대운 시작 연도는 알 수 없습니다.'}`,`${decade?`올해의 대운은 ${decade.ganZhi}입니다.`:'올해 적용되는 대운은 계산할 수 없습니다.'}`,
      `${year}년 세운은 ${annual[0].gz}입니다.`,`올해 일지와 세운: ${evidence(annual[0])}.`,`선택한 ${month}월 월운은 ${thisMonth.gz}입니다.`,`선택한 달의 십성은 ${thisMonth.god}(${meaning[thisMonth.god]||'의미 확인 필요'})입니다.`,`선택한 달 관계 자리: ${evidence(thisMonth)}.`,
      `${thisMonth.clash?'이달 일지와 충이 있습니다.':'이달 일지와 충은 확인되지 않습니다.'}`,`${thisMonth.branchJoin?'이달 일지와 육합이 있습니다.':'이달 일지와 육합은 확인되지 않습니다.'}`,`${thisMonth.trine?'이달 일지와 삼합 일부가 있습니다.':'이달 삼합 일부 단서는 확인되지 않습니다.'}`,
      `${input.gender?`배우자성 판독에는 선택한 전통적 ${input.gender==='male'?'남성':'여성'} 기준을 사용합니다.`:'기준이 없어 배우자성 판독을 생략합니다.'}`,`관계 변동 지표는 실제 이별·결혼 확률이 아닙니다.`,`직업 적성은 간지만으로 확정할 수 없습니다.`,`수익과 자산 규모는 간지만으로 예측할 수 없습니다.`,`오행 개수로 질병이나 사고를 예측하지 않습니다.`,
      `${turning[0].year}년 ${turning[0].gz}을(를) 비교 시기 중 하나로 살펴볼 수 있습니다.`,`돈 거래 전 계약과 상환 조건을 확인하세요.`,`관계 변화는 상대의 실제 의사를 확인하세요.`,`월운은 매월 절입에 바뀝니다.`,`출생지·시간 경계에 따른 간지 차이를 확인하세요.`
    ];
    return {overview,sections:section};
  }
  window.makeFullSajuReport=makeReport;
})();
