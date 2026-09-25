import { createRequire } from 'node:module';
const { Solar, Lunar } = createRequire(import.meta.url)('lunar-javascript');

const elementOfStem = Object.fromEntries([...['甲','乙'].map(x=>[x,'목']),...['丙','丁'].map(x=>[x,'화']),...['戊','己'].map(x=>[x,'토']),...['庚','辛'].map(x=>[x,'금']),...['壬','癸'].map(x=>[x,'수'])]);
const elementOfBranch = Object.fromEntries([...['寅','卯'].map(x=>[x,'목']),...['巳','午'].map(x=>[x,'화']),...['辰','戌','丑','未'].map(x=>[x,'토']),...['申','酉'].map(x=>[x,'금']),...['亥','子'].map(x=>[x,'수'])]);
const koreanGod = {'比肩':'비견','劫财':'겁재','食神':'식신','伤官':'상관','偏财':'편재','正财':'정재','七杀':'편관','正官':'정관','偏印':'편인','正印':'정인','日主':'일간'};
const koreanStage = {'长生':'장생','沐浴':'목욕','冠带':'관대','临官':'건록','帝旺':'제왕','衰':'쇠','病':'병','死':'사','墓':'묘','绝':'절','胎':'태','养':'양'};
const godMeaning = {
  비견:'자기 주도와 동료',겁재:'경쟁과 자원 공유',식신:'꾸준한 표현과 생산',상관:'틀을 바꾸는 표현',
  편재:'기회와 외부 자원',정재:'계획적인 자원 관리',편관:'압박 속 실행',정관:'규칙과 책임',
  편인:'독자적인 학습',정인:'학습과 지원'
};
const elementTopics={목:'새로운 걸 시작할 때 어떤 방식이 편한가요?',화:'요즘 가장 신나게 이야기할 수 있는 건 뭔가요?',토:'쉬는 날 안정감을 느끼는 루틴이 있나요?',금:'결정을 내릴 때 가장 중요하게 보는 기준은 뭔가요?',수:'호기심이 생기면 바로 알아보는 편인가요?'};
const error=(message)=>{throw Object.assign(new Error(message),{status:400});};
const translated=(value,map)=>map[value] || value;
const kstYear=()=>Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date()));

export function calculateManse(input) {
  const date=String(input.date || '');const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if(!match) error('생년월일을 YYYY-MM-DD로 입력해주세요.');
  const [year,month,day]=match.slice(1).map(Number);
  if(year<1900 || year>2050 || month<1 || month>12 || day<1 || day>31) error('지원 범위는 1900~2050년의 실제 날짜입니다.');
  const calendar=input.calendar==='lunar'?'lunar':'solar';
  const time=String(input.time || '');
  if(time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) error('출생시각을 HH:MM으로 입력해주세요.');
  const known=!!time;const [hour,minute]=known?time.split(':').map(Number):[12,0];
  const gender=['male','female'].includes(input.gender)?input.gender:null;
  if(calendar==='solar' && (new Date(Date.UTC(year,month-1,day)).toISOString().slice(0,10)!==date || input.leapMonth)) error('양력 날짜 또는 윤달 설정을 확인해주세요.');
  let solar;
  try {solar=calendar==='lunar'?Lunar.fromYmdHms(year,input.leapMonth?-month:month,day,hour,minute,0).getSolar():Solar.fromYmdHms(year,month,day,hour,minute,0);}
  catch {error('음력 날짜와 윤달 여부를 확인해주세요.');}
  const eight=solar.getLunar().getEightChar();
  const keys=['Year','Month','Day','Time'];
  const names=['년주','월주','일주','시주'];
  const pillars=keys.map((key,i)=>{
    if(key==='Time'&&!known)return {name:names[i],unknown:true};
    const hanja=eight['get'+key]();
    return {name:names[i],hanja,stem:hanja[0],branch:hanja[1],elementStem:elementOfStem[hanja[0]],elementBranch:elementOfBranch[hanja[1]],tenGod:translated(eight['get'+key+'ShiShenGan'](),koreanGod),hiddenStems:eight['get'+key+'HideGan'](),hiddenGods:eight['get'+key+'ShiShenZhi']().map(x=>translated(x,koreanGod)),stage:translated(eight['get'+key+'DiShi'](),koreanStage)};
  });
  const elements=Object.fromEntries(['목','화','토','금','수'].map(x=>[x,0]));
  for(const p of pillars){if(p.unknown)continue;elements[p.elementStem]++;elements[p.elementBranch]++;}
  const dayStem=pillars[2].stem;
  const warnings=[];
  if(!known)warnings.push('출생시각이 없어 시주와 정확한 대운 시작 시점은 표시하지 않았습니다.');
  if(!gender)warnings.push('대운 순·역행 계산에 필요한 전통 명리 기준값을 선택하지 않아 대운을 표시하지 않았습니다.');
  if(known && ([0,1,22,23].includes(hour)||minute<=40 && hour%2===1||minute>=20 && hour%2===0))warnings.push('출생시각이 시주·날짜 경계에 가까울 수 있습니다. 출생지 보정과 자시(23시) 기준에 따라 다른 결과가 나올 수 있습니다.');
  let luck=null;
  if(known&&gender){const yun=eight.getYun(gender==='male'?1:0);luck={direction:yun.isForward()?'순행':'역행',start:{years:yun.getStartYear(),months:yun.getStartMonth(),days:yun.getStartDay()},periods:yun.getDaYun(9).filter(d=>d.getIndex()>0).map(d=>({startYear:d.getStartYear(),endYear:d.getEndYear(),startAge:d.getStartAge(),ganZhi:d.getGanZhi()}))};}
  const chart={version:'manse-v1',basis:'한국 현지 표준시 입력, 시간 보정 없음, 자시 00:00 일주 교체 기본값',input:{calendar,date,time:known?time:null,gender,leapMonth:!!input.leapMonth},solarDate:solar.toYmd(),traditionalAge:kstYear()-solar.getYear()+1,pillars,elements,dayMaster:{stem:dayStem,element:elementOfStem[dayStem]},luck,warnings};
  return chart;
}

export function interpretRules(chart,{priority='연애',mode='solo'}={}){
  const {pillars,elements,dayMaster,luck,warnings}=chart;
  const available=pillars.filter(x=>!x.unknown);
  const sorted=Object.entries(elements).sort((a,b)=>b[1]-a[1]);
  const prominent=sorted[0];const absent=sorted.filter(([,n])=>n===0).map(([e])=>e);
  const gods=available.filter(x=>x.name!=='일주').map(x=>x.tenGod);
  const unique=[...new Set(gods)];
  const sections=[
    `1. 계산된 원국\n${available.map(x=>`${x.name} ${x.hanja} · 천간 ${x.elementStem} / 지지 ${x.elementBranch} · 십성 ${x.tenGod} · 지장간 ${x.hiddenStems.join('·')} · 12운성 ${x.stage}`).join('\n')}${pillars[3].unknown?'\n시주는 출생시각 미입력으로 계산하지 않았습니다.':''}\n오행(보이는 8글자 기준): ${Object.entries(elements).map(([k,v])=>`${k} ${v}`).join(', ')}.`,
    `2. 해석의 출발점\n일간은 ${dayMaster.stem}(${dayMaster.element})입니다. 일간은 십성을 비교할 때 기준으로 삼는 글자입니다. 화면에 보이는 ${available.length*2}글자에서는 ${prominent[0]} ${prominent[1]}개가 가장 많습니다. ${absent.length?`${absent.join('·')} 글자는 표시되지 않습니다.`:'다섯 오행이 모두 표시됩니다.'} 이 개수만으로 신강·용신·건강·돈의 크기를 확정할 수 없습니다. 월지의 계절성, 지장간, 합충을 검토해야 합니다.`,
    `3. 생활에 연결해 볼 단서\n${unique.map(g=>`${g}는 명리 용어로 ${godMeaning[g]||'일간과 다른 글자의 관계'}에 가까운 관계를 가리킵니다`).join('. ')}. 실제 생활에서 이런 모습이 있는지는 본인이 겪은 사건과 비교해 확인하세요. 같은 글자라도 원국 전체의 위치에 따라 의미가 달라집니다.`,
    `4. 대운과 시기\n${luck?`${luck.direction}으로 계산한 대운 시작 차이는 출생 후 ${luck.start.years}년 ${luck.start.months}개월 ${luck.start.days}일입니다. ${luck.periods.slice(0,5).map(p=>`${p.startYear}년 시작 ${p.ganZhi}`).join(', ')}. 이 배열은 10년 구간의 간지이며 실제 취업·결혼·수익 사건을 보장하지 않습니다.`:'정확한 대운 배열을 표시할 정보가 부족합니다.'}`,
    `5. ${priority}을(를) 살펴볼 때\n위의 원국은 주제를 살피기 위한 전통적 분류입니다. ${priority}에 관한 개인의 결과를 네 기둥의 오행 개수나 십성 한 개만으로 단정하지 않습니다. 현재 선택 가능한 행동, 상대의 실제 반응, 재정·건강 정보와 함께 판단하세요.`,
    `6. 대화 카드\n${mode==='date'?'처음 만나는 사람과는 사주를 판정 도구로 쓰기보다 서로 답할 수 있는 질문으로 시작해보세요.':'자기 탐색을 위한 질문입니다.'} ${elementTopics[dayMaster.element]}`,
    `계산 조건\n${chart.basis}. ${warnings.length?warnings.join(' '):'출생지와 역사적 시간대 보정은 적용하지 않았습니다.'} 신살·합충·용신·신강·세부 세운 판단은 아직 규칙 검증 전이라 출력하지 않습니다.`
  ];
  return sections.join('\n\n');
}
