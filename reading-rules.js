/* Deterministic, auditable interpretation. No network request or model call. */
(() => {
  'use strict';
  const order=['목','화','토','금','수'];
  const clashPairs=['子午','丑未','寅申','卯酉','辰戌','巳亥'];
  const meanings={비견:'동료·독립',겁재:'경쟁·자원 공유',식신:'꾸준한 생산·표현',상관:'새 방식의 표현',편재:'외부 기회·유동 자원',정재:'정기 수입·관리',편관:'압박 속 실행',정관:'규칙·책임',편인:'독자적 학습',정인:'학습·지원'};
  const labels={동료:'동료·경쟁',표현:'표현·성과',재물:'돈·교환',책임:'규칙·직무 책임',지원:'학습·지원'};
  const stemElements={甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'};
  const branchElements={寅:'목',卯:'목',巳:'화',午:'화',辰:'토',戌:'토',丑:'토',未:'토',申:'금',酉:'금',亥:'수',子:'수'};
  const relation=(day,other)=>['동료','표현','재물','책임','지원'][(order.indexOf(other)-order.indexOf(day)+5)%5];
  const collides=(a,b)=>clashPairs.some(pair=>pair.includes(a)&&pair.includes(b)&&a!==b);
  const nearest=(counts,type,day)=>({element:order[(order.indexOf(day)+({동료:0,표현:1,재물:2,책임:3,지원:4})[type])%5],count:counts[order[(order.indexOf(day)+({동료:0,표현:1,재물:2,책임:3,지원:4})[type])%5]]});
  const numbered=(lines)=>lines.map((x,i)=>`${i+1}. ${x}`).join('\n');

  function makeReport(chart) {
    const {pillars,elements,luck,solarDate,input}=chart;
    const day=pillars[2],month=pillars[1],others=pillars.filter(p=>!p.unknown&&p.name!=='일주');
    const godLines=others.map(p=>`${p.name} 천간 ${p.stem}의 십성은 ${p.tenGod}(${meanings[p.tenGod]||'일간과의 관계'})`).join('; ');
    const pair=others.filter(p=>collides(day.branch,p.branch)).map(p=>p.name);
    const wealth=nearest(elements,'재물',day.stemElement),career=nearest(elements,'책임',day.stemElement);
    const output=nearest(elements,'표현',day.stemElement),support=nearest(elements,'지원',day.stemElement);
    const peers=nearest(elements,'동료',day.stemElement);
    const relative=relation(day.stemElement,month.branchElement);
    const seasonal={寅:'봄',卯:'봄',辰:'봄',巳:'여름',午:'여름',未:'여름',申:'가을',酉:'가을',戌:'가을',亥:'겨울',子:'겨울',丑:'겨울'}[month.branch];
    const ageYear=Number(solarDate.slice(0,4));
    const sections=[];
    const add=(title,confidence,paragraphs,items=[])=>sections.push({title,confidence,paragraphs,items});
    const visible=Object.entries(elements).map(([e,n])=>`${e} ${n}`).join(' · ');
    const countText=(obj)=>`${obj.element} ${obj.count}개`;
    add('1. 만세력 판독 요약','계산값',[
      `입력: ${input.calendar==='lunar'?'음력':'양력'} ${input.date}${input.leapMonth?'(윤달)':''}, 양력 환산 ${solarDate}, ${input.time?'출생시각 '+input.time:'출생시각 미입력'}. ${input.gender?'대운 계산 기준 선택됨':'대운 계산 기준 미선택'}.`,
      `${pillars.map(p=>`${p.name} ${p.unknown?'미상':p.hanja}`).join(' / ')}. 일간(일주의 첫 글자, 해석의 기준)은 ${day.stem}(${day.stemElement})입니다. 보이는 글자의 오행은 ${visible}입니다.`,
      `${godLines||'일간과 비교할 글자가 없습니다.'}. ${others.map(p=>`${p.name} 지장간(지지 속에 포함된 글자) ${p.hiddenStems?.join('·')||'미확인'}, 12운성 ${p.stage||'미확인'}`).join('; ')}. 시주가 없으면 시주 기반 항목은 판정하지 않습니다.`
    ]);
    add('2. 원국 핵심 구조','관찰 + 조건부 해석',[
      `월지 ${month.branch}는 ${seasonal}의 자리이며 ${month.branchElement}에 해당합니다. 월지는 태어난 계절을 확인하는 중요한 기준입니다. 이 계절의 오행은 일간 ${day.stemElement}에 대해 ${labels[relative]} 관계입니다. 계절만으로 신강/신약(자기 기운의 강약)이나 용신(균형에 도움 되는 요소)을 확정할 수는 없습니다.`,
      `눈에 보이는 글자에서는 ${Object.entries(elements).sort((a,b)=>b[1]-a[1]).map(([e,n])=>`${e} ${n}개`).join(', ')} 순서입니다. 0개인 오행도 지장간에 있을 수 있습니다. 각 글자의 자리와 월지, 숨은 글자, 합충을 확인해야 과다·과소를 논할 수 있습니다.`,
      `${pair.length?`일지 ${day.branch}와 ${pair.join('·')}의 지지가 충(서로 부딪히는 관계)에 해당합니다. 관계나 일상의 변화에 관한 질문을 던지는 단서이지만 이별·사고를 예고하지 않습니다.`:'일지와 다른 보이는 지지 사이에 대표적인 육충(서로 마주 보는 여섯 지지의 충)은 확인되지 않습니다. 이것만으로 관계가 안정적이라고 판단하지 않습니다.'}`
    ]);
    const periods=luck?.periods||[];
    const periodSummary=periods.length?periods.slice(0,6).map(p=>`${p.startYear}~${p.endYear}년 ${p.ganZhi}: 천간 ${labels[relation(day.stemElement,stemElements[p.ganZhi[0]])]}`).join(' / '):'출생시각과 대운 계산 기준을 모두 입력하면 10년 흐름을 표시합니다.';
    add('3. 평생 총운','대운 배열 + 제한적 해석',[
      `대운(약 10년 단위로 바뀌는 간지)은 삶의 특정 사건을 확정하는 연대표가 아닙니다. ${periodSummary}`,
      `태어난 연도부터 10대·20대·30대·40대·50대·60대 이후에 해당하는 대운을 아래 10번 항목에서 확인하세요. 실제 이직·결혼·수입 시기는 당시 환경과 선택을 함께 봐야 합니다.${!luck?' 현재는 시각 또는 계산 기준이 없어 연령대별 대운을 특정할 수 없습니다.':''}`
    ]);
    add('4. 금전운','구조적 단서',[
      `재성(돈과 자원 관리에 비유하는 관계)은 일간 ${day.stemElement}이 제어하는 ${wealth.element}입니다. 보이는 글자 ${countText(wealth)}가 재성에 해당합니다. 이는 재물의 크기나 미래 소득이 아니라 사주 내 해당 오행의 표시 개수입니다.`,
      `식상(생산과 표현에 비유하는 관계)은 ${countText(output)}입니다. 산출물을 만들고 거래로 연결하는 방식을 검토할 때 재성과 함께 살핍니다. ${wealth.count===0?'재성 글자가 표면에 보이지 않아도 돈을 못 번다는 뜻은 아닙니다. 숨은 글자와 운, 실제 역량을 따로 봐야 합니다.':'재성이 보여도 투자 수익이나 부자가 될 시기를 보장하지 않습니다.'}`,
      `현실 전략: 직장 수입·부업·사업 중 수입원별 기록을 남기고, 투자와 대출의 한도를 먼저 정하세요. 사주만으로 투기 적성이나 부동산 매수 시점을 지정하지 않습니다.`
    ]);
    add('5. 직업운','구조적 단서',[
      `관성(규칙·책임·조직의 요구에 비유하는 관계)은 ${countText(career)}, 인성(학습·지원에 비유하는 관계)은 ${countText(support)}, 식상(결과물·표현)은 ${countText(output)}입니다. 이 세 관계를 비교해 조직의 규칙, 학습, 결과물 중 무엇을 일에서 자주 쓰는지 돌아볼 수 있습니다.`,
      `천간 기준 ${godLines}. 십성 한 종류만으로 적합 직업·승진·퇴사 시기를 지정할 수 없습니다. 지금 맡는 업무가 원하는 성과와 맞는지, 준비한 기술이 이동 가능한지 확인하는 자료로 쓰세요.`
    ]);
    add('6. 연애운','관계 점검 질문',[
      `일지 ${day.branch}(${day.branchElement})는 전통적으로 가까운 관계를 살필 때 참고하는 자리입니다. 일지의 글자 하나만으로 상대의 성격이나 만날 연도를 알 수는 없습니다.`,
      `${pair.length?`원국에서 일지와 ${pair.join('·')} 사이에 충이 보입니다. 전통 해석에서는 관계의 변화나 생활 리듬의 마찰을 살필 수 있지만 반복 이별을 단정할 근거는 아닙니다.`:'원국의 보이는 지지에서 일지와 다른 지지 사이의 대표적인 충은 확인되지 않습니다. 갈등 가능성이 없다는 뜻은 아닙니다.'} 연애에서는 연락 빈도, 갈등 해결, 약속 이행처럼 관찰할 수 있는 행동을 먼저 비교하세요.`
    ]);
    add('7. 결혼운','미확정',[
      `배우자궁(배우자와 생활하는 방식을 비유하는 일지)은 ${day.branch}입니다. 이 한 글자로 배우자의 나이·직업·외모나 결혼 여부를 확정할 수 없습니다. ${pair.length?`일지와 ${pair.join('·')} 사이 충을 갈등 방식 점검에만 사용하세요.`:'일지와 보이는 원국 지지 사이에 대표적인 충은 없습니다.'}`,
      `결혼 시기·이혼 가능성·자녀 수를 숫자나 연도로 단정하는 규칙은 적용하지 않았습니다. 동거·가계 운영·갈등 해결 방식에 대한 실제 합의가 판단의 핵심입니다.`
    ]);
    add('8. 건강운','의학적 판정 불가',[
      `표시된 오행 분포 ${visible}는 신체 장기별 검사 결과가 아닙니다. 특정 질환, 수술, 수명, 우울·불안을 원국이나 세운으로 예측하지 않습니다.`,
      `수면·피로·스트레스의 반복 패턴을 기록하고 이상 증상이 지속되면 의료인에게 상담하세요. 대운·세운의 충도 사고나 질병을 확정하는 근거로 사용하지 않습니다.`
    ]);
    add('9. 인간관계·가족운','관계 점검 질문',[
      `비겁(동료·경쟁에 비유하는 관계)에 해당하는 보이는 ${countText(peers)}가 있습니다. 원국의 년주 ${pillars[0].hanja}, 월주 ${month.hanja}는 전통적으로 성장 배경과 가까운 환경을 살펴보는 자리지만, 부모와의 실제 관계를 판정하는 자료는 아닙니다.`,
      `자원 공유, 부탁을 거절하는 기준, 가족과의 역할 분담을 실제 경험에 비춰보세요. 귀인(도움을 주는 사람)이나 특정 가족의 미래 사건은 여기서 특정하지 않습니다.`
    ]);
    add('10. 대운 상세 해석','간지 배열 확인',[
      luck?`대운은 ${luck.direction}이며 출생 뒤 약 ${luck.start[0]}년 ${luck.start[1]}개월 ${luck.start[2]}일 이후 시작하는 것으로 계산됐습니다. 각 구간의 천간을 일간과 비교한 관계입니다. 지지·원국 전체의 상호작용은 아래 한 줄 분류에 반영하지 않았습니다.`:'출생시각과 남성/여성 전통 계산 기준이 모두 필요합니다. 입력하지 않은 값을 추정해서 대운을 채우지 않았습니다.'
    ],periods.map(p=>`${p.startYear}~${p.endYear}년 · ${p.startAge}세 시작 · ${p.ganZhi} · 천간 ${labels[relation(day.stemElement,stemElements[p.ganZhi[0]])]}${collides(p.ganZhi[1],day.branch)?` · 일지 ${day.branch}와 충(생활·관계 변화 점검)` : ''}. 일/돈/관계의 사건 발생을 확정하지 않습니다.`));
    const thisYear=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date()));
    const years=[];
    for(let y=thisYear;y<thisYear+6;y++){
      const gz=window.Solar.fromYmdHms(y,7,1,12,0,0).getLunar().getEightChar().getYear();
      const rel=relation(day.stemElement,stemElements[gz[0]]);
      years.push(`${y}년(세는나이 ${y-ageYear+1}세) ${gz}: 천간은 일간과 ${labels[rel]} 관계${collides(gz[1],day.branch)?`; 지지 ${gz[1]}는 일지 ${day.branch}와 충이라 가까운 관계·거처의 변화 가능성을 점검`:`; 지지 ${gz[1]}와 일지 ${day.branch} 사이에 대표적인 충은 없음`}. 실제 사건은 대운 및 현실 조건과 별도로 대조해야 합니다.`);
    }
    add('11. 세운 핵심 해석','연도별 간지 + 조건부',[
      `세운(한 해의 간지)은 입춘을 기준으로 바뀌므로 아래 간지는 각 연도 7월 1일 기준입니다. 해당 연도 초 입춘 전후 출생·사건은 별도로 확인해야 합니다. ${luck?'대운이 계산된 경우에도 아래 내용은 세운의 단순 비교입니다.':'대운 정보가 없어 세운과 대운의 교차 판단은 생략합니다.'}`
    ],years);
    add('12. 현실 조언 및 총평','계산 가능한 범위',[
      `현재 원국의 출발점은 일간 ${day.stem}(${day.stemElement}), 월지 ${month.branch}(${month.branchElement}), 보이는 재성 ${countText(wealth)}, 관성 ${countText(career)}입니다. 이것은 행동을 점검할 주제를 고르는 자료이지 개인의 평생 결론이 아닙니다.`,
      `먼저 확인할 세 가지: ① 출생시각과 양력/음력 기록의 정확도 ② 최근 2~3년의 실제 돈·일·관계 사건과 이 해석의 일치 여부 ③ 현재 통제 가능한 예산, 소통 방식, 수면·건강 습관. 결과가 실제 경험과 어긋나면 규칙 해석을 수정해야 합니다.`,
      `신강·용신·격국·신살·합충형파해의 전체 판정과 30년 경력 전문가 수준의 장문 상담은 검증된 규칙이 아직 없어 출력하지 않습니다. 시각, 출생지, 역사적 시간대·절입 경계에 따라 계산값이 달라질 수 있습니다.`
    ]);
    return sections;
  }
  window.makeSajuReport=makeReport;
})();
