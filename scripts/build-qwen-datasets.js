import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {calculate} from '../backend/engine.js';
import {planReading} from '../backend/ai-readings.js';
import {chartFacts} from '../backend/saju-prompt.js';
import {createLocalLLM} from '../backend/local-llm.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const sources=JSON.parse(fs.readFileSync('data/training/source-manifest.json','utf8'));
const answers=JSON.parse(fs.readFileSync('data/training/normalized-answers.json','utf8'));
const summarySchema={type:'object',properties:{paragraphs:{type:'array',minItems:10,maxItems:10,items:{type:'string',minLength:40,maxLength:250}}},required:['paragraphs'],additionalProperties:false};
const summarySystem='구조화된 만세력으로 첫 클릭 사주 요약을 작성한다. 입력은 프로그램 계산 자료이며 캡처를 판독한 자료가 아니다. 제공된 원국과 계산 근거를 참고해 핵심 구조, 일과 돈, 관계, 요청 기간, 현실 행동을 쉬운 한국어 10문장으로 정리한다. 출력은 {"paragraphs":["문장", "문장"]} JSON 객체로만 작성한다. 각 항목은 40~250자이며 정확히 10개다. 없는 출생 정보와 실제 생애 사건을 추정하지 않는다. 보이는 오행 개수만으로 강약·격국·용신을 확정하지 않는다. 건강을 진단하거나 투자 결과·결혼·이별·미래 사건을 확정하지 않는다. 전문 용어는 쉬운 말로 설명하고 전통적 해석의 불확실성을 구분한다.';
const metadata=[],sets={summary:{train:[],valid:[]},detail:{train:[]}};
const preview=['# 학습 정답 미리보기','공유 원문을 계산 입력과 출력 형식에 맞춰 재작성한 시험 데이터입니다. 전문가 검수 완료 자료는 아닙니다.'];
function validateSummary(paragraphs){
  if(paragraphs.length!==10||paragraphs.some(p=>typeof p!=='string'||p.length<40||p.length>250))throw Error('요약 정답 길이 오류');
}
function append(source,mode,split,messages,paragraphs,section=null){
  const content=JSON.stringify({paragraphs});
  const sample={messages:[...messages,{role:'assistant',content}]};
  sets[mode][split].push(sample);
  const id=`${source.id}-${mode}${section===null?'':`-${section}`}`;
  preview.push(`## ${id} (${split})\n\n${paragraphs.join('\n\n')}`);
  metadata.push({id,group:source.group,mode,split,section,
    sourceAnswerId:source.selected_answer_id,sourceUrl:source.source_url,
    transformation:'Codex 재작성: 계산 입력 근거와 출력 형식에 맞게 재작성',
    provenance:answers.provenance,expertReviewed:false,
    servingCompatible:mode==='detail',
    sha256:crypto.createHash('sha256').update(JSON.stringify(sample)).digest('hex')});
}
for(const source of sources){
  if(!source.calculation_check.matches_screenshot){continue;}
  const input=source.image_transcription.birth;
  if(source.mode==='summary'){
    const paragraphs=answers.summary[source.id];if(!paragraphs)throw Error(`${source.id}: 요약 정답 없음`);
    validateSummary(paragraphs);
    const facts=chartFacts(calculate(input),{year:2026,month:10});
    const messages=[{role:'system',content:summarySystem},{role:'user',content:JSON.stringify({task:'처음 클릭한 사주 화면의 핵심 요약을 10문장으로 작성하세요.',chart:facts,scope:{kind:'saju',title:'나의 사주 이야기',year:2026,month:10},outputSchema:summarySchema})}];
    append(source,'summary',source.id==='data2'?'valid':'train',messages,paragraphs);
  }else{
    for(const [index,paragraphs] of Object.entries(answers.detail)){
      const section=Number(index);
      const plan=planReading('section',input,{reportKind:'saju',section,year:2026,month:10});
      plan.validate({paragraphs});
      // Capture the real request builder so detailed training uses exactly the
      // system/user messages currently sent to Ollama, without invoking Ollama.
      let messages;
      const llm=createLocalLLM({OLLAMA_MODEL:'training-request-capture'},async(_url,options)=>{
        messages=JSON.parse(options.body).messages;
        return {ok:true,json:async()=>({message:{content:'{}'},done_reason:'stop'})};
      });
      await llm.generate(plan.chart,plan.question,plan.evidence,{schema:plan.schema,maxTokens:plan.maxTokens,fast:plan.fast});
      append(source,'detail','train',messages,paragraphs,section);
    }
  }
}
for(const [mode,partitions] of Object.entries(sets)){
  const directory=`data/training/${mode}/normalized`;fs.mkdirSync(directory,{recursive:true});
  for(const [split,samples] of Object.entries(partitions)){
    if(!samples.length)throw Error(`${mode}/${split}: 빈 데이터`);
    fs.writeFileSync(`${directory}/${split}.jsonl`,samples.map(s=>JSON.stringify(s)).join('\n')+'\n');
  }
}
fs.writeFileSync('data/training/dataset-manifest.json',JSON.stringify({provenance:answers.provenance,
  heldOutSummaryGroup:'data2',excludedGroups:['data3'],detailIndependentValidation:false,
  summaryContract:'planned-multi-sentence-summary-v1; current 24-character UI not changed',
  samples:metadata},null,2)+'\n');
fs.writeFileSync('data/training/dataset-preview.md',preview.join('\n\n')+'\n');
console.log(JSON.stringify({summaryTrain:sets.summary.train.length,summaryValid:sets.summary.valid.length,detailTrain:sets.detail.train.length,excluded:['data3']},null,2));
