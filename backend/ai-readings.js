import {REPORT_TITLES,chartFacts,SAJU_PROMPT_HASH,SAJU_PREVIEW_HASH} from './saju-prompt.js';
import {calculate,insights,today} from './engine.js';
export const PROMPT_VERSION='fast-preview-v8-'+SAJU_PROMPT_HASH+'-'+SAJU_PREVIEW_HASH;
const categories=['연애','결혼','연인','자산·소비','일·사업','건강·컨디션','자리 게임'];
const period=p=>{const [y,m]=today().split('-').map(Number),year=Number(p.year??y),month=Number(p.month??m);if(!Number.isInteger(year)||year<1900||year>2100||!Number.isInteger(month)||month<1||month>12)throw Error('연도와 월을 확인해주세요.');return {year,month};};
const schema={type:'object',properties:{paragraphs:{type:'array',minItems:1,maxItems:1,items:{type:'string',minLength:1,maxLength:24}}},required:['paragraphs'],additionalProperties:false};
export function planReading(kind,input,params={}){
 const chart=calculate(input),{year,month}=period(params),frame=insights.frame(chart,year,month);
 let selectedTable,selectedDate,selectedLuck,candidateDates=[],analysisMonth=month,resultEvidence=chart.warnings;
 let reference,title=`${year}년 ${month}월의 이야기`,sections=[];
 const sourceKind=['section','catalog'].includes(kind)?params.reportKind:kind;
 if(kind==='quick'){reference={theme:frame.theme,tension:frame.tension,action:frame.theme.action};}
 else if(kind==='topic'){
  if(!categories.includes(params.topic))throw Error('주제를 확인해주세요.');title=params.topic;
  reference=params.topic==='자리 게임'?insights.quick(chart,year,month,{direction:['왼쪽','오른쪽','정면','뒤쪽'].includes(params.direction)?params.direction:'정면',accessory:['안경 쓴 사람','아이폰 사용자','갤럭시폰 사용자'].includes(params.accessory)?params.accessory:'안경 쓴 사람'}).lines.slice(18):insights.domain(frame,params.topic,chart.input.relationshipStatus);
 }else if(kind==='daily'){const [y,m,d]=today().split('-').map(Number),f=insights.frame(chart,y,m,d);title='오늘의 이야기';resultEvidence=chart.warnings;reference={theme:f.theme,tension:f.tension,action:f.theme.action};}
 else if(kind==='compatibility'){if(!['연인','친구','가족','동료'].includes(params.relation||'연인'))throw Error('관계 종류를 확인해주세요.');const other=calculate(params.other);title='두 사람의 이야기';reference=insights.compatibility(chart,other,params.relation||'연인');}
 else {
  const report=insights.full(chart,{year,month});
  if(['full','saju'].includes(sourceKind)){sections=REPORT_TITLES.map((title,index)=>({title:`${index+1}. ${title}`,paragraphs:[],items:[],...(index===0?{table:report.sections[0].table}:{})}));title='나의 사주 이야기';}
  else if(sourceKind==='decade'){if(!chart.luck)throw Error('대운은 출생 시각과 대운 계산 기준이 필요합니다.');sections=chart.luck.periods.map(p=>({title:`${p.startYear}~${p.endYear}년 · ${p.ganZhi} 대운`,paragraphs:[],items:[],luck:p}));title='나의 대운 이야기';}
  else if(sourceKind==='annual'){sections=Array.from({length:12},(_,i)=>{const f=insights.frame(chart,year,i+1);return {title:`${i+1}월`,paragraphs:insights.domain(f,'일·사업',chart.input.relationshipStatus),items:f.evidence};});title=`${year}년의 이야기`;}
  else if(sourceKind==='dates'){sections=insights.dates(chart,String(params.start||''),String(params.end||''),params.purpose).map(d=>({title:d.date,paragraphs:[d.reason,d.action],items:[]}));candidateDates=sections.map(s=>s.title);title='날짜 후보 이야기';}
  else throw Error('지원하지 않는 해석입니다.');
  if(kind==='section'){const index=params.section;if(!Number.isInteger(index)||index<0||index>=sections.length)throw Error('상세 항목을 확인해주세요.');const selected=sections[index];selectedTable=selected.table;selectedLuck=selected.luck;if(sourceKind==='annual')analysisMonth=index+1;if(sourceKind==='dates')selectedDate=selected.title;title=selected.title;reference={title,paragraphs:selected.paragraphs.slice(0,2),items:selected.items.slice(0,2)};sections=[];}
  else reference={theme:frame.theme,topics:sections.map(s=>({title:s.title,reference:s.paragraphs[0]}))};
 }
 const previewQuestion=`'${title}' 주제의 이번 달 실천 한 문장만 8~14자의 완결 문장, 최대 24자로 답하세요. 반드시 하세요 또는 해보세요로 끝내세요. 긴 분석은 상세보기에서 따로 요청합니다.`+(params.topic==='자리 게임'?' 상대를 판정하지 않는 가벼운 대화 놀이만 제안하세요.':'');
 const detailed=kind==='section';
 const outputSchema=detailed?{type:'object',properties:{paragraphs:{type:'array',minItems:3,maxItems:24,items:{type:'string',minLength:80,maxLength:3000}}},required:['paragraphs'],additionalProperties:false}:schema;
 const question=detailed?`기본 분석 지침에서 '${title}' 항목을 담당하세요. 다른 항목으로 넘어가지 말고 이 항목을 최소 3~6문단 이상 길고 자세히 서술하세요. 먼저 제공된 만세력의 판독 가능한 정보와 누락 정보를 구분하고, 명리 구조의 근거 → 쉬운 설명 → 삶에서 나타날 수 있는 양상 순서로 설명하세요. 신뢰 수준과 불확실성을 구분하세요. 자료가 없는 사건이나 연도를 사실처럼 만들어내지 마세요. 해당 항목의 모든 세부 요구사항을 다루고 중복 요약으로 분량을 채우지 마세요.`:previewQuestion+' 이 요청은 상세 보고서를 열기 전의 짧은 첫 화면 미리보기입니다. 상세 보고서는 항목별로 따로 요청됩니다.';
 const validate=data=>{
  if(!Array.isArray(data?.paragraphs)||data.paragraphs.length<(detailed?3:1)||data.paragraphs.length>(detailed?24:1)||data.paragraphs.some(p=>typeof p!=='string'||!p.trim()||(detailed&&p.trim().length<80)||p.length>(detailed?3000:24)||(detailed?/paragraphs|num_predict|outputSchema/:/JSON|스키마|paragraphs|num_predict|outputSchema/).test(p))||new Set(data.paragraphs.map(p=>p.replace(/\s/g,''))).size!==data.paragraphs.length)throw Error('AI 답변 형식 오류');
  return {title,label:`${year}년 ${month}월`,paragraphs:data.paragraphs,overview:data.paragraphs,...(kind==='quick'?{question:data.paragraphs[0]}:{}),...(kind==='daily'?{day:today(),evidence:resultEvidence}:{}),...(sections.length?{sections:sections.map((s,index)=>({title:s.title,index,lazy:true,paragraphs:[],items:[]}))}:{}),...(selectedTable?{table:selectedTable}:{})};
 };
 return {catalog:{title,sections:sections.map((s,index)=>({title:s.title,index,lazy:true,paragraphs:[],items:[]}))},chart,question,evidence:{facts:chartFacts(chart,{year,month:analysisMonth,longTerm:detailed&&(sourceKind==='decade'||sourceKind==='annual'||(['full','saju'].includes(sourceKind)&&[2,9,10,11].includes(params.section)))}),scope:{kind,title,year,month:analysisMonth,...(selectedDate?{selectedDate}:{}),...(selectedLuck?{selectedLuck}:{})},...(kind==='compatibility'?{other:chartFacts(calculate(params.other),{year,month}),relation:params.relation||'연인'}:{}),...(sourceKind==='dates'?{candidateDates,purpose:params.purpose}:{}),...(params.topic==='자리 게임'?{game:reference}: {})},schema:outputSchema,fast:!detailed,maxTokens:detailed?5000:96,validate};
}
export async function generateReading(llm,env,kind,input,params={},onDelta){
 const plan=planReading(kind,input,params);
 if(kind==='catalog')return {...plan.catalog,source:'calculation',promptVersion:PROMPT_VERSION};
 try{const data=await llm.generate(plan.chart,plan.question,plan.evidence,{schema:plan.schema,maxTokens:plan.maxTokens,onDelta,fast:plan.fast});return {...plan.validate(data),source:'local-llm',model:env.OLLAMA_MODEL,promptVersion:PROMPT_VERSION};}
 catch(e){if(e.status)throw e;throw Object.assign(Error('AI 응답 형식이 올바르지 않아 표시하지 않았습니다. 다시 시도해주세요.'),{status:503});}
}
