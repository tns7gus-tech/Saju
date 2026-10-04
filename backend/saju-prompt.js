import fs from 'node:fs';
import crypto from 'node:crypto';
import lunar from 'lunar-javascript';
export const SAJU_EXPERT_PROMPT=fs.readFileSync(new URL('./prompts/saju-expert.txt',import.meta.url),'utf8').trim();
export const SAJU_PROMPT_HASH=crypto.createHash('sha256').update(SAJU_EXPERT_PROMPT).digest('hex').slice(0,16);
export const REPORT_TITLES=['만세력 판독 요약','원국 핵심 구조','평생 총운','금전운','직업운','연애운','결혼운','건강운','인간관계/가족운','대운 상세 해석','세운 핵심 해석','현실 조언 및 총평'];
// Supply calculated facts, never a prewritten rule-engine interpretation or a claimed screenshot.
export function chartFacts(chart,{year,month,longTerm=false}={}){
 const birthYear=Number(chart.solarDate.slice(0,4));
 const missing=['만세력 캡처 이미지: 제공되지 않음','출생지: 입력받지 않음','출생시간 정확도: 확인되지 않음','12신살 및 귀인/살: 계산 자료에 없음','신강/신약·격국·용신/희신/기신/구신: 확정된 계산값 없음','실제 생애 사건 및 병력: 제공되지 않음'];
 if(!chart.input.time)missing.push('출생시각·시주: 미입력');if(!chart.input.gender)missing.push('성별·대운 계산 기준: 미선택');if(!chart.luck)missing.push('대운 시작 시점 및 배열: 계산 조건 부족');
 const annualLuck=Array.from({length:longTerm?81:5},(_,i)=>{const y=longTerm?birthYear+i:year-2+i;return {year:y,ageByBirthday:`${y-birthYear-1}~${y-birthYear}세 (생일 전후)`,ganZhi:lunar.Solar.fromYmd(y,7,1).getLunar().getEightChar().getYear()};});
 return {source:'프로그램에서 계산한 구조화된 만세력 데이터. 캡처를 판독한 자료가 아님.',birth:{...chart.input,solarDate:chart.solarDate},pillars:chart.pillars,elements:{visibleCharacterCounts:chart.elements,note:'보이는 천간·지지 글자 개수이며 계절과 지장간을 반영한 오행 강약 판정은 아님'},luck:chart.luck?{direction:chart.luck.direction,startAfterBirth:{years:chart.luck.start[0],months:chart.luck.start[1],days:chart.luck.start[2],meaning:'출생 후 경과 기간이며 각각 별개의 시작 나이가 아님'},periods:chart.luck.periods.map(p=>({ganZhi:p.ganZhi,startYear:p.startYear,endYear:p.endYear,startAgeInKoreanCounting:p.startAge,ageAtStartByBirthday:`${p.startYear-birthYear-1}~${p.startYear-birthYear}세`,ageConvention:'startAgeInKoreanCounting은 세는나이, ageAtStartByBirthday는 생일 전후 만 나이 범위'}))}:null,annualLuck,requestedPeriod:{year,month,monthlyGanZhi:lunar.Solar.fromYmd(year,month,15).getLunar().getEightChar().getMonth(),monthlyReferenceDate:`${year}-${String(month).padStart(2,'0')}-15`,note:'월운 간지는 표시한 기준일의 절기 기준 계산값. 출생지 및 역사적 시간대 보정 없음.'},calculationBasis:chart.warnings,missingInformation:missing};
}

// Fast icon previews use the relevant principles from the user's report prompt.
// The complete original prompt is reserved for explicitly requested detailed sections.
export const SAJU_PREVIEW_PROMPT='상세 사주 보고서 전의 짧은 미리보기다. 제공 자료만 참고하고 없는 내용은 추정하지 않는다. 질환·투자·미래 사건을 예언하지 않는다. 주제에 맞는 실천 행동 하나만 한국어 8~14자의 완결 문장으로 답한다. 반드시 하세요 또는 해보세요로 끝낸다. 월·근거·전문용어·수식어를 붙이지 않는다. 출력은 {"paragraphs":["한 문장"]} 형식이다. 최대 24자다.';
export const SAJU_PREVIEW_HASH=crypto.createHash('sha256').update(SAJU_PREVIEW_PROMPT).digest('hex').slice(0,12);
export function previewFacts(facts){return {
 pillars:facts.pillars.map(p=>p.unknown?{name:p.name,unknown:true}:{name:p.name,hanja:p.hanja,tenGod:p.tenGod,branchGod:p.branchGod}),
 elements:facts.elements.visibleCharacterCounts,
 period:{year:facts.requestedPeriod.year,month:facts.requestedPeriod.month,ganZhi:facts.requestedPeriod.monthlyGanZhi},
 note:'오행 개수는 강약 확정값이 아님. 시주가 unknown이면 추정 금지.'
};}
