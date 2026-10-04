/* SAI interpretation policy v2. Calendar output is read-only; weights are editorial,
   not validated probabilities or a claim of a universal traditional school. */
(() => {
  'use strict';
  const VERSION='sai-reading-2.0';
  const elements=['목','화','토','금','수'];
  const stems='甲乙丙丁戊己庚辛壬癸';
  const stemElement=s=>elements[Math.floor(stems.indexOf(s)/2)];
  const groups=['자율','표현','자원','책임','학습'];
  const gods=['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'];
  const joins=['子丑','寅亥','卯戌','辰酉','巳申','午未'];
  const clashes=['子午','丑未','寅申','卯酉','辰戌','巳亥'];
  const stemJoins=['甲己','乙庚','丙辛','丁壬','戊癸'];
  const trines=['申子辰','亥卯未','寅午戌','巳酉丑'];
  const match=(pairs,a,b)=>a!==b&&pairs.some(p=>p.includes(a)&&p.includes(b));
  // Each entry is a coherent strength -> cost -> scene -> response, not a random phrase.
  const traits={
    비견:{group:'자율',title:'내 기준이 있어야 움직이는 사람',strength:'남의 속도에 휩쓸리기보다 스스로 납득한 일을 오래 밀고 가는 힘',cost:'도움을 받아도 결정권을 빼앗긴 듯 느낄 수 있는 점',scene:'같이 정하자고 해놓고 이미 머릿속에는 내 답안지가 있는 모습',love:'호감이 생겨도 자기 생활의 리듬을 지키며 가까워지는 방식',work:'권한과 책임이 분명한 업무에서 스스로 방법을 찾는 방식',money:'남을 따라 소비하기보다 내가 중요하게 여기는 항목에 예산을 두는 방식',action:'내가 정할 부분 하나와 상대에게 맡길 부분 하나를 나눠보세요.',question:'함께 정할 때 꼭 직접 고르고 싶은 것은 뭐예요?'},
    겁재:{group:'자율',title:'사람 사이에서 추진력을 얻는 사람',strength:'경쟁과 협업 속에서 일을 시작하고 판을 넓히는 힘',cost:'상대의 속도나 평가를 내 기준으로 착각하기 쉬운 점',scene:'친구가 시작했다는 말에 나도 모르게 신청 버튼을 누르려는 모습',love:'함께 움직일 때 빠르게 친해지지만 주변 비교에 마음이 바빠지는 방식',work:'공동 목표가 있을 때 몰입하되 기여도 배분이 중요한 방식',money:'사람과 함께 쓰는 비용이 내 계획보다 커지기 쉬운 방식',action:'함께할 일의 비용과 역할을 시작 전에 한 줄씩 적어보세요.',question:'함께할 때 힘이 나는 순간과 혼자 있고 싶은 순간은 언제예요?'},
    식신:{group:'표현',title:'작은 즐거움을 꾸준한 결과로 만드는 사람',strength:'좋아하는 일을 반복하며 자기만의 결과물을 쌓는 힘',cost:'편안한 방식이 익숙해지면 새 시도를 늦출 수 있는 점',scene:'잘하는 메뉴는 계속 만들지만 새 레시피는 저장만 해두는 모습',love:'화려한 고백보다 함께 먹고 웃는 일상으로 마음을 보여주는 방식',work:'완성한 결과를 꾸준히 보여주며 신뢰를 얻는 방식',money:'손에 잡히는 결과와 생활의 만족에 비용을 쓰는 방식',action:'익숙한 일 하나에 작은 새 방법을 넣어 결과까지 만들어보세요.',question:'별것 아닌데 함께하면 유난히 좋은 일은 뭐예요?'},
    상관:{group:'표현',title:'다른 방법이 먼저 보이는 사람',strength:'당연한 규칙을 다시 묻고 새 표현을 만드는 힘',cost:'해결책이 너무 빨리 나와 상대의 감정을 지나칠 수 있는 점',scene:'상대는 위로를 기다리는데 내 입에서는 개선안 세 가지가 먼저 나오는 모습',love:'말과 재치로 가까워지지만 솔직함의 속도를 조절해야 하는 방식',work:'기존 방식의 빈틈을 발견하고 개선안을 제안하는 방식',money:'새롭고 매력적인 선택에 지출 이유를 빠르게 붙이는 방식',action:'의견을 말하기 전에 공감이 필요한지 해결책이 필요한지 물어보세요.',question:'속상할 때 같이 화내주는 사람과 해결해주는 사람 중 누가 좋아요?'},
    편재:{group:'자원',title:'기회를 발견하면 연결부터 하는 사람',strength:'낯선 제안과 사람을 연결해 선택지를 넓히는 힘',cost:'가능성을 넓히느라 마무리에 쓸 자원이 흩어질 수 있는 점',scene:'좋아 보이는 계획이 많아 달력보다 하고 싶은 목록이 더 긴 모습',love:'새로운 경험을 함께 제안하며 호감을 드러내는 방식',work:'사람·일정·기회를 연결하되 한 번에 맡는 범위가 중요한 방식',money:'유용한 기회를 놓치기 싫어 지출을 넓히는 방식',action:'새로 추가할 일 하나를 고르기 전에 내려놓을 일 하나를 정하세요.',question:'즉흥적으로 같이 해보고 싶은 일이 있나요?'},
    정재:{group:'자원',title:'작은 약속을 실제 생활로 만드는 사람',strength:'시간과 자원을 현실적인 계획으로 바꾸는 힘',cost:'예상 밖의 선택을 손해처럼 느끼며 여유가 줄 수 있는 점',scene:'즐거운 여행을 준비하다 어느새 이동 시간까지 분 단위로 맞추는 모습',love:'기억해둔 취향과 지키는 약속으로 마음을 보여주는 방식',work:'반복 업무와 자원 배분을 안정적으로 관리하는 방식',money:'목적을 정하고 차곡차곡 관리하는 방식',action:'꼭 지킬 기준 하나와 유연하게 바꿔도 될 기준 하나를 구분하세요.',question:'계획이 바뀌어도 괜찮은 것과 꼭 지키고 싶은 것은 뭐예요?'},
    편관:{group:'책임',title:'어려운 순간에 집중력이 켜지는 사람',strength:'압박이 있는 상황에서 우선순위를 잡고 움직이는 힘',cost:'급하지 않은 일까지 긴급 상황처럼 받아들일 수 있는 점',scene:'아무도 재촉하지 않았는데 혼자 마감 하루 전의 표정이 되는 모습',love:'확실한 태도에 끌리지만 관계의 속도를 빨리 정하려는 방식',work:'문제 해결과 긴급 대응에 집중하되 회복 간격이 필요한 방식',money:'불확실성을 줄이려 급하게 비용을 지출할 수 있는 방식',action:'오늘 처리할 일과 이번 주 안에 해도 되는 일을 나눠보세요.',question:'바쁠 때 어떤 도움을 받으면 정말 편해져요?'},
    정관:{group:'책임',title:'말보다 약속으로 신뢰를 쌓는 사람',strength:'역할과 기준을 지키며 주변에 안정감을 주는 힘',cost:'괜찮은 사람으로 보이려 원하지 않는 책임까지 맡을 수 있는 점',scene:'거절 문장을 쓰다가 결국 알겠습니다로 보내는 모습',love:'말의 온도보다 약속을 지키는 행동으로 진심을 전하는 방식',work:'기대와 책임 범위가 분명할 때 완성도를 높이는 방식',money:'미리 정한 기준 안에서 자원을 관리하는 방식',action:'새 부탁에 답하기 전에 가능한 범위와 어려운 범위를 같이 말하세요.',question:'상대가 지켜주면 유난히 고마운 작은 약속은 뭐예요?'},
    편인:{group:'학습',title:'자기만의 관점으로 깊이 파고드는 사람',strength:'낯선 정보를 연결해 독특한 해석을 만드는 힘',cost:'확인되지 않은 의미까지 혼자 읽으며 생각이 길어질 수 있는 점',scene:'짧은 메시지 한 줄을 보고 머릿속에서 해설집 한 권을 쓰는 모습',love:'깊은 대화에 끌리지만 혼자 해석할 시간이 길어지는 방식',work:'독립적인 탐색과 전문 지식의 연결에 집중하는 방식',money:'관심 분야의 자료와 도구에 선택적으로 비용을 쓰는 방식',action:'내가 확인한 사실 하나와 아직 추측인 부분 하나를 나눠 적으세요.',question:'혼자 깊이 빠져들어 이야기하고 싶은 주제가 있나요?'},
    정인:{group:'학습',title:'이해하고 나면 오래 품는 사람',strength:'배우고 정리하며 사람에게 필요한 지원을 건네는 힘',cost:'충분히 준비될 때까지 자기 결정을 미룰 수 있는 점',scene:'시작하려고 자료를 찾다가 북마크 폴더부터 완벽해지는 모습',love:'편하게 기대고 이야기할 수 있는 관계에서 마음을 여는 방식',work:'자료를 체계화하고 경험을 다른 사람에게 전달하는 방식',money:'안정과 배움에 필요한 기반을 먼저 갖추는 방식',action:'자료를 하나 더 찾기 전에 지금 아는 것으로 작은 결과를 내보세요.',question:'누군가 해준 말 중 오래 힘이 된 말은 뭐예요?'}
  };
  function god(day,other){
    const d=stems.indexOf(day),o=stems.indexOf(other);
    if(d<0||o<0)throw new Error('해석할 천간을 확인해주세요.');
    const relation=(Math.floor(o/2)-Math.floor(d/2)+5)%5;
    return gods[relation*2+(d%2===o%2?0:1)];
  }
  function links(chart,branch,stem){
    const out=[];
    chart.pillars.forEach((p,i)=>{
      if(p.unknown)return;
      if(match(joins,p.branch,branch))out.push({kind:'합',position:i,basis:`${p.name} ${p.branch}·${branch} 육합`});
      if(match(clashes,p.branch,branch))out.push({kind:'충',position:i,basis:`${p.name} ${p.branch}·${branch} 충`});
      if(stem&&match(stemJoins,p.stem,stem))out.push({kind:'천간합',position:i,basis:`${p.name} ${p.stem}·${stem} 천간합`});
    });
    const branches=new Set([...chart.pillars.filter(p=>!p.unknown).map(p=>p.branch),branch]);
    for(const set of trines)if([...set].every(b=>branches.has(b)))out.push({kind:'삼합 구성',position:-1,basis:`${set} 세 지지 확인 · 합화는 별도 판정`});
    return out;
  }
  function profile(chart){
    const day=chart.pillars[2];
    const scores=Object.fromEntries(gods.map(g=>[g,0]));
    const sources=Object.fromEntries(gods.map(g=>[g,[]]));
    const energy=Object.fromEntries(elements.map(e=>[e,0]));
    const add=(stem,w,basis)=>{const g=god(day.stem,stem);scores[g]+=w;energy[stemElement(stem)]+=w;sources[g].push(basis);};
    chart.pillars.forEach((p,i)=>{
      if(p.unknown)return;
      if(i!==2)add(p.stem,1,`${p.name} 천간 ${p.stem}의 ${god(day.stem,p.stem)}`);
      const hidden=p.hiddenStems?.length?p.hiddenStems:[p.stem];
      hidden.forEach((s,j)=>add(s,(i===1?1.5:1)*[1,.55,.3][Math.min(j,2)],`${p.name} 지장간 ${s}${i===1?' (월지 가중)':''}`));
    });
    const ranked=gods.map(g=>({god:g,score:+scores[g].toFixed(3),evidence:sources[g],...traits[g]})).sort((a,b)=>b.score-a.score||gods.indexOf(a.god)-gods.indexOf(b.god));
    const di=elements.indexOf(day.stemElement),support=(energy[elements[di]]+energy[elements[(di+4)%5]])/Object.values(energy).reduce((a,b)=>a+b,0);
    const roots=chart.pillars.filter(p=>!p.unknown&&p.hiddenStems?.some(s=>stemElement(s)===day.stemElement)).map(p=>p.name);
    const seasonSupport=[elements[di],elements[(di+4)%5]].includes(chart.pillars[1].branchElement);
    const strength=support>.6&&roots.length>=2&&seasonSupport?'지원 우세':support<.35&&!seasonSupport?'소모 우세':'지원·소모 혼재';
    const counter=ranked.find(t=>t.group!==ranked[0].group&&t.score>0)||ranked[1];
    const natal=[];
    chart.pillars.forEach((a,i)=>chart.pillars.forEach((b,j)=>{
      if(j<=i||a.unknown||b.unknown)return;
      if(match(joins,a.branch,b.branch))natal.push(`${a.name}·${b.name} ${a.branch}${b.branch} 합`);
      if(match(clashes,a.branch,b.branch))natal.push(`${a.name}·${b.name} ${a.branch}${b.branch} 충`);
    }));
    return {version:VERSION,ranked,top:ranked.slice(0,3),counter,energy,support,strength,roots,seasonSupport,natal,
      confidence:chart.pillars[3].unknown?'시주 제외 · 잠정 해석':'네 기둥 기반 · 전통 상징 해석',
      signature:chart.pillars.map(p=>p.unknown?'?':p.hanja).join('/')};
  }
  function frame(chart,year,month,date){
    if(!Number.isInteger(year)||year<1900||year>2100||month!=null&&(!Number.isInteger(month)||month<1||month>12))throw new Error('1900~2100년의 올바른 해석 기간을 골라주세요.');
    const p=profile(chart),S=window.Solar;
    if(!S)throw new Error('달력 자료를 불러온 뒤 다시 시도해주세요.');
    const e=S.fromYmdHms(year,month||7,date||15,12,0,0).getLunar().getEightChar();
    const period=chart.luck?.periods.find(x=>x.startYear<=year&&year<=x.endYear);
    const layers=[{label:'세운',gz:e.getYear(),weight:.6}];
    if(period)layers.unshift({label:'대운',gz:period.ganZhi,weight:.8});
    if(month)layers.push({label:'월운',gz:e.getMonth(),weight:1});
    if(date)layers.push({label:'일운',gz:e.getDay(),weight:1.2});
    const weighted=Object.fromEntries(p.ranked.map(t=>[t.god,t.score*.25]));
    for(const layer of layers){layer.god=god(chart.pillars[2].stem,layer.gz[0]);weighted[layer.god]+=layer.weight;
      const hidden=window.LunarUtil?.ZHI_HIDE_GAN[layer.gz[1]]||[];
      hidden.forEach((s,i)=>weighted[god(chart.pillars[2].stem,s)]+=layer.weight*[.5,.25,.1][Math.min(i,2)]);
      layer.links=links(chart,layer.gz[1],layer.gz[0]);
    }
    const focus=Object.entries(weighted).sort((a,b)=>b[1]-a[1]||gods.indexOf(a[0])-gods.indexOf(b[0]))[0][0];
    const last=layers.at(-1),near=last.links.filter(l=>l.position===2),joined=near.some(l=>l.kind.includes('합')),clashed=near.some(l=>l.kind==='충');
    const wholeJoin=layers.some(l=>l.links.some(x=>x.kind.includes('합'))),wholeClash=layers.some(l=>l.links.some(x=>x.kind==='충'));
    return {profile:p,layers,period,focus,theme:traits[focus],year,month,date,joined,clashed,
      tension:wholeJoin&&wholeClash?'연결과 조율이 함께 강조됩니다. 가까워질 계기와 바꿔야 할 생활 방식이 공존하는 흐름으로 읽습니다.':clashed?'가까운 관계에서 기존 방식의 조율이 강조됩니다. 변화를 대화의 계기로 쓰는 편이 좋겠습니다.':joined?'가까운 관계의 공통점을 찾는 흐름입니다. 잘 맞는 부분과 함께 지킬 약속을 연결해보세요.':`${traits[focus].group}에 관한 선택이 전면에 옵니다.`,
      evidence:layers.map(l=>`${l.label} ${l.gz} · ${l.god}${l.links.length?' · '+l.links.map(x=>x.basis).join(', '):''}`),
      window:date?`${year}-${String(month).padStart(2,'0')}-${String(date).padStart(2,'0')}`:month?`${year}년 ${month}월`:`${year}년`};
  }
  // Monthly advice follows the actual 월운 천간 and its relationship to the natal 일지.
  // The natal profile remains background context; it must not drown out month-to-month changes.
  const loveFocus={
    비견:'서로의 생활 리듬과 혼자만의 시간을 어떻게 나눌지',겁재:'친구·모임 일정과 둘만의 약속 사이의 우선순위',
    식신:'함께 반복하고 싶은 작고 편안한 일상',상관:'솔직한 의견을 전하기 전에 상대가 원하는 반응',
    편재:'새로운 장소나 활동을 함께 제안하는 방식',정재:'약속 시간과 데이트 비용을 현실적으로 맞추는 일',
    편관:'관계의 속도를 정할 때 서로 편안한 경계',정관:'말한 약속을 지키는 방식과 관계의 기대치',
    편인:'메시지의 의미를 짐작하기보다 직접 확인하는 대화',정인:'안심이 필요할 때 서로에게 건넬 수 있는 말'
  };
  const workFocus={비견:'일의 결정권과 각자의 담당 범위',겁재:'공동 업무의 기여도와 자원 배분',식신:'반복해서 완성할 수 있는 결과물',상관:'기존 절차에서 고칠 수 있는 한 가지',편재:'새 제안 중 실제로 연결할 기회',정재:'시간과 예산을 계획에 맞게 배치하는 일',편관:'긴급한 일과 기다려도 되는 일의 구분',정관:'완료 기준과 책임 범위의 합의',편인:'자료를 확인해 전문성을 쌓는 시간',정인:'배운 내용을 정리해 팀과 나누는 일'};
  const restFocus={비견:'내 일정에서 회복 시간을 먼저 확보하기',겁재:'약속을 연달아 잡지 않고 일정 사이에 여백 두기',식신:'식사·수면처럼 기본 생활 리듬을 일정하게 하기',상관:'화면과 알림에서 잠시 떨어지는 시간 만들기',편재:'새 일정을 더하기 전에 휴식 계획도 함께 고르기',정재:'무리 없는 취침·기상 시간을 정해 지키기',편관:'급하지 않은 일은 미루고 멈출 시각 정하기',정관:'해야 할 일의 범위를 정하고 끝난 뒤 쉬기',편인:'잠들기 전 생각과 정보를 짧게 정리하고 내려놓기',정인:'추가 자료를 찾기보다 익숙한 휴식 방법을 실천하기'};
  function monthly(f){
    const l=f.layers.find(x=>x.label==='월운'),godName=l?.god||f.focus,t={...traits[godName],god:godName};
    const dayLinks=(l?.links||[]).filter(x=>x.position===2),join=dayLinks.some(x=>x.kind.includes('합')),clash=dayLinks.some(x=>x.kind==='충'),stemJoin=dayLinks.some(x=>x.kind==='천간합');
    const relation=join?'일지와 지지 합 단서가 있어 익숙한 공통점을 함께 키워볼 수 있습니다.':clash?'일지와 지지 충 단서가 있어 약속·속도 차이를 구체적으로 조율하는 편이 좋습니다.':stemJoin?'일지와 천간 합 단서가 있어 먼저 말을 건네거나 생각을 나눌 기회를 만들기 좋습니다.':'일지와 직접 맞물리는 합·충은 두드러지지 않아, 이달의 주제를 대화로 확인하는 편이 좋습니다.';
    return {layer:l,trait:t,relation,join,clash,stemJoin};
  }
  function domain(f,category,status=''){
    const base=f.profile.top[0],t=f.theme,second=f.profile.counter,m=monthly(f),mt=m.trait;
    const bridge=`이달 월운의 ${mt.group} 주제는 ${mt.title}입니다.`;
    const context=status==='dating'?'교제 중이라면':status==='single'?'새로 알아가는 사이라면':'관계를 살펴볼 때';
    const scenes={
      '연애':[`${context} 이달은 ${loveFocus[mt.god]}을 살피고, 원국에서는 ${base.love}라는 기본 리듬이 읽힙니다.`,`${bridge} ${m.relation}`,`이번 주에 ${loveFocus[mt.god]}에 대해 먼저 한 가지 물어보세요.`],
      '연인':[`${context} ${mt.love}이라는 월운 주제가 들어옵니다.`,`${m.relation} 특히 ${loveFocus[mt.god]}을 두고 서로의 생각을 확인해보세요.`,`대화 질문: “${mt.question}”`],
      '결혼':[`${context} 공동생활에서 이달은 ${loveFocus[mt.god]}을 맞춰보기 좋습니다.`,`${bridge} ${m.relation} 원국의 기본 성향은 ${base.group}의 기준을 중요하게 읽습니다.`,`함께 ${loveFocus[mt.god]}에 대한 각자의 기준을 하나씩 말해보세요.`],
      '자산·소비':[`${mt.money}이 이달의 소비 점검 주제입니다.`,`원국에서는 ${base.money}이 기본 단서이며, 이번 달에는 ${mt.cost}이 선택에 더해질 수 있습니다.`,`이번 주 지출을 살필 때 ${workFocus[mt.god]}와 실제 예산을 함께 적어보세요.`],
      '일·사업':[`${mt.work}이 이달 업무에서 살펴볼 주제입니다.`,`원국의 ${base.work}과 월운의 ${workFocus[mt.god]}이 어떤 식으로 만나는지 확인해보세요.`,`이번 주 업무에서 ${workFocus[mt.god]}에 관한 구체적인 합의 하나를 남기세요.`],
      '건강·컨디션':[`건강 판단은 실제 몸 상태를 기준으로 하세요. 생활 리듬 점검으로는 ${restFocus[mt.god]}을 살펴볼 수 있습니다.`,`명식으로 질병이나 체질을 예측하지 않습니다. 이달의 생활 질문은 ${restFocus[mt.god]}을 실천할 여유가 있는지입니다.`,`이번 주 일정에 “${restFocus[mt.god]}”을 실행할 시간을 먼저 표시해두세요.`]
    };
    return scenes[category]||scenes['일·사업'];
  }
  function quick(chart,year,month,game){
    const f=frame(chart,year,month),lines=[];
    for(const c of ['연애','결혼','연인','자산·소비','일·사업','건강·컨디션'])domain(f,c,chart.input.relationshipStatus).forEach((text,i)=>lines.push({category:c,text:`${['핵심','장면','실천'][i]} · ${text}`}));
    lines.push({category:'자리 게임',text:`${game.direction} 자리에 있는 사람에게 “${f.theme.question}”`},{category:'자리 게임',text:`${game.accessory}에게 물어보세요. “${f.profile.top[0].question}” 대화용 게임이며 사주 판정이 아닙니다.`});
    return {label:f.window,lines,analysis:f};
  }
  function full(chart,selected={}){
    const year=selected.year||new Date().getFullYear(),month=selected.month||1,f=frame(chart,year,month),p=f.profile;
    const sections=[],add=(title,paragraphs,items=[],confidence=p.confidence,table=null)=>sections.push({title,paragraphs,items,confidence,table});
    const basis=chart.pillars.filter(x=>!x.unknown).map(x=>`${x.name} ${x.hanja}`).join(' · ');
    add('1. 만세력 판독 요약',[`원국: ${basis}. ${chart.pillars[3].unknown?'출생 시각 미입력으로 시주는 비워두었습니다.':'시주까지 반영했습니다.'}`,`보이는 오행: ${Object.entries(chart.elements).map(([e,n])=>`${e} ${n}`).join(' / ')}. 아래 해석은 이 개수와 별도로 지장간·계절·위치를 함께 읽습니다.`],chart.warnings||[],'기존 만세력 계산값', {headers:['기둥','간지','천간 십성','지장간'],rows:chart.pillars.map(x=>[x.name,x.unknown?'미확인':x.hanja,x.unknown?'미확인':x.tenGod,x.unknown?'미확인':x.hiddenStems.join('·')])});
    add('2. 원국 핵심 구조',p.top.map(t=>`${t.title}: ${t.strength}이 특징으로 읽힙니다. ${t.cost}도 같은 특징의 이면입니다. 근거: ${t.evidence.join(' · ')}.`),[
      `균형 참고: ${p.strength}. 월지 계절 지원 ${p.seasonSupport?'있음':'제한적'}, 같은 오행의 뿌리 ${p.roots.join('·')||'미확인'}. 이 편집 가중치는 정통 신강·용신 확정 판정을 대신하지 않습니다.`,
      `함께 볼 단서: ${p.counter.title}. ${p.counter.evidence.join(' · ')}.`,...p.natal]);
    add('3. 평생 총운',[`이 명식의 중심 이야기는 “${p.top[0].title}”입니다. ${p.top[1].group}과 ${p.top[2].group}의 주제가 함께 나타납니다.`,`한 가지 성격으로 고정하기보다 ${p.top[0].strength}을 어디에 쓰는지 보세요. ${p.counter.strength}은 다른 선택을 가능하게 하는 단서입니다.`],p.top.map(t=>`${t.scene}. 공감된다면: ${t.action}`));
    [['4. 금전운','자산·소비'],['5. 직업운','일·사업'],['6. 연애운','연애'],['7. 결혼운','결혼'],['8. 건강운','건강·컨디션']].forEach(([title,c])=>add(title,domain(f,c,chart.input.relationshipStatus),c==='연애'?Array.from({length:12},(_,i)=>{const mf=frame(chart,year,i+1),m=monthly(mf),d=domain(mf,'연애',chart.input.relationshipStatus);return `${i+1}월 · 월운 ${m.layer.gz} ${m.layer.god}: ${d[0]} ${d[1]} ${d[2]} 근거: ${m.layer.links.map(x=>x.basis).join(' · ')||'일지와 직접 합·충 없음'}`;}):c==='건강·컨디션'?['명식은 질병·체질 진단 자료가 아닙니다.']:[]));
    add('9. 인간관계/가족운',[`${p.top[0].strength}은 가까운 사람에게도 드러날 수 있습니다. 다만 ${p.top[0].cost}은 돌봄과 간섭의 경계를 흐릴 수 있어요.`,`반대편 단서인 ${p.counter.group}도 함께 있습니다. 상대가 원하는 도움과 내가 편한 도움을 구분해보세요.`,p.counter.action],['가족의 실제 구성이나 과거 사건은 출생 정보에서 추정하지 않습니다.']);
    const periods=chart.luck?.periods||[];
    add('10. 대운 상세 해석',periods.length?[`대운은 ${chart.luck.direction}입니다. 같은 성향도 시기별 역할과 환경에 따라 다르게 쓰일 수 있습니다.`]:['시각 또는 대운 계산 기준 미입력으로 배열을 만들지 않았습니다. 원국 해석은 계속 볼 수 있습니다.'],periods.map(d=>{const t=traits[god(chart.pillars[2].stem,d.ganZhi[0])];return `${d.startYear}~${d.endYear}년 ${d.ganZhi} · ${t.title}. 기본 성향의 ${p.top[0].group}과 이 시기의 ${t.group}이 만납니다. ${t.work}. ${t.action} ${links(chart,d.ganZhi[1],d.ganZhi[0]).map(x=>x.basis).join(' · ')}`;}));
    const years=Array.from({length:9},(_,i)=>frame(chart,year+i));
    add('11. 세운 핵심 해석',[`${year}~${year+8}년을 비교합니다. 연도 요약은 입춘 이후를 대표하며, 월별 요약은 해당 월 15일의 간지를 기준으로 합니다.`],years.map(a=>`${a.year}년 · ${a.theme.title}. ${a.tension} ${a.theme.action} 근거: ${a.evidence.join(' / ')}`));
    add('12. 현실 조언 및 총평',[`이번 달 핵심은 ${f.theme.group}입니다. ${f.tension}`,`강점은 ${p.top[0].strength}입니다. 특히 ${p.top[0].cost}을 알아차리면 같은 힘을 덜 지치게 쓸 수 있습니다.`,f.theme.action],f.evidence);
    const overview=[...p.top.map(t=>`${t.title} — ${t.strength}.`),...p.top.map(t=>`주의할 패턴: ${t.cost}.`),...p.top.map(t=>`생활 장면: ${t.scene}.`),...p.top.map(t=>t.action),
      ...['연애','결혼','연인','자산·소비','일·사업','건강·컨디션'].flatMap(c=>{const d=domain(f,c,chart.input.relationshipStatus);return [`${c}: ${d[0]}`,`${c} 실천: ${d[2]}`];}),
      `원국 근거: ${basis}.`,`보이는 오행: ${Object.entries(chart.elements).map(([e,n])=>`${e} ${n}`).join(' / ')}.`,`함께 볼 특징: ${p.counter.title}.`,`균형 참고: ${p.strength}.`,`${f.window}: ${f.tension}`,`이번 시기 근거: ${f.evidence.join(' / ')}.`];
    return {overview,sections,analysis:f,version:VERSION};
  }
  function compatibility(a,b,relation='연인'){
    const x=profile(a),y=profile(b),ab=links(a,b.pillars[2].branch,b.pillars[2].stem),ba=links(b,a.pillars[2].branch,a.pillars[2].stem);
    const shared=x.top.filter(t=>y.top.some(u=>u.group===t.group));
    return {title:`${relation} 궁합 · 닮은 점과 다른 리듬`,paragraphs:[`첫 번째 사람: ${x.top[0].title}. 두 번째 사람: ${y.top[0].title}.`,shared.length?`두 사람 모두 ${[...new Set(shared.map(t=>t.group))].join('·')}을 중요하게 읽는 단서가 있습니다. 공통 관심사를 시작점으로 삼아보세요.`:`첫 번째 사람의 ${x.top[0].group}과 두 번째 사람의 ${y.top[0].group}은 다른 우선순위를 만들 수 있습니다. 각자 중요하게 생각하는 순서를 말해보세요.`,`첫 번째 사람은 ${x.top[0].cost}, 두 번째 사람은 ${y.top[0].cost}에 주의해볼 만합니다.`,ab.some(t=>t.kind==='충')||ba.some(t=>t.kind==='충')?'두 명식 사이에 조율을 강조하는 충이 있습니다. 관계 실패 판정이 아니라, 다른 방식을 말로 맞춰볼 단서입니다.':'두 사람의 마음과 관계 결과는 명식만으로 판정하지 않습니다.',`함께할 실천: ${x.top[0].action} 이어서 ${y.top[0].action}`],items:[...ab.map(l=>`첫 사람 원국 ↔ 둘째 일주: ${l.basis}`),...ba.map(l=>`둘째 원국 ↔ 첫 사람 일주: ${l.basis}`),`첫 번째 근거: ${x.top[0].evidence.join(' · ')}`,`두 번째 근거: ${y.top[0].evidence.join(' · ')}`]};
  }
  function dates(chart,start,end,purpose){
    const parse=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v))throw new Error('택일 기간을 입력해주세요.');const d=new Date(v+'T00:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==v)throw new Error('올바른 날짜를 입력해주세요.');return d;};
    const a=parse(start),b=parse(end),days=Math.round((b-a)/86400000)+1;
    if(days<1||days>90)throw new Error('택일 기간은 시작일부터 최대 90일까지 선택해주세요.');
    const preferred={meeting:['표현','학습'],wedding:['책임','자원'],move:['자원','자율'],work:['표현','책임']}[purpose];
    if(!preferred)throw new Error('택일 목적을 선택해주세요.');
    const list=[];
    for(let i=0;i<days;i++){const d=new Date(+a+i*86400000),f=frame(chart,d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate()),last=f.layers.at(-1);const score=(preferred.includes(f.theme.group)?2:0)+last.links.filter(l=>l.kind.includes('합')).length-last.links.filter(l=>l.kind==='충').length;
      list.push({date:d.toISOString().slice(0,10),score,theme:f.theme.group,reason:`${last.gz} 일운 · ${f.theme.group} 주제${preferred.includes(f.theme.group)?'가 선택한 목적과 연결됩니다.':'를 함께 검토할 날입니다.'} ${last.links.map(l=>l.basis).join(' · ')||'원국과 직접적인 합·충 단서는 제한적입니다.'}`,action:f.theme.action});}
    return list.sort((a,b)=>b.score-a.score||a.date.localeCompare(b.date)).slice(0,5);
  }
  function consult(chart,question,day){
    const q=String(question).trim();if(q.length<5||q.length>500)throw new Error('고민을 5~500자로 적어주세요.');
    const [y,m,d]=day.split('-').map(Number),f=frame(chart,y,m,d);
    let category=/결혼|배우자|동거/.test(q)?'결혼':/연애|썸|고백|짝사랑|만남/.test(q)?'연애':/연인|이별|재회|남친|여친|싸움|연락/.test(q)?'연인':/돈|재물|소비|투자|주식|대출/.test(q)?'자산·소비':/건강|잠|수면|아프|피곤|스트레스/.test(q)?'건강·컨디션':/직장|취업|일|사업|이직|공부|진로/.test(q)?'일·사업':null;
    if(!category)return {category:'고민 정리',paragraphs:[`적어주신 고민은 현재 테스트 상담이 세부 의도를 구분하기 어려운 내용입니다. 고민을 임의로 다른 주제로 바꾸지 않았습니다.`,`원국에서 먼저 읽히는 특징은 “${f.profile.top[0].title}”입니다.`,f.profile.top[0].question],consumes:false};
    return {category,paragraphs:[`“${q}”라는 고민을 ${category} 관점에서 살펴볼게요.`,...domain(f,category,chart.input.relationshipStatus),`이 해석의 근거: ${f.profile.top[0].evidence.join(' · ')} / ${f.evidence.join(' / ')}.`],consumes:true};
  }
  window.SajuInsights={VERSION,profile,frame,domain,quick,full,compatibility,dates,consult,god};
  window.makeFullSajuReport=full;
})();
