import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import lunar from 'lunar-javascript';

const node=()=>({addEventListener(){},setAttribute(){},textContent:'',elements:{}});
const form=node();
for(const key of ['calendar','date','time','gender','leapMonth','nickname','relationshipStatus'])form.elements[key]=node();
const document={getElementById:id=>id==='manseForm'?form:node(),querySelectorAll:()=>[],documentElement:{dataset:{}}};
const window={Solar:lunar.Solar,Lunar:lunar.Lunar,LunarUtil:lunar.LunarUtil,matchMedia:()=>({matches:false})};
const context=vm.createContext({document,window,Intl,Date,localStorage:{getItem:()=>null}});
for(const name of ['reading-rules.js','pages.js'])vm.runInContext(readFileSync(new URL(`../${name}`,import.meta.url),'utf8'),context);

test('each selected month returns exactly 20 compact points, with separate game prompts',()=>{
  const chart=window.calculateStaticManse({calendar:'solar',date:'950228',time:'1245',gender:'male',leapMonth:false,relationshipStatus:'single'});
  const game={direction:'왼쪽',accessory:'안경 쓴 사람'};
  const september=window.makeQuickSajuSummary(chart,2026,9,game);
  const october=window.makeQuickSajuSummary(chart,2026,10,game);
  assert.equal(september.lines.length,20);
  assert.equal(october.lines.length,20);
  assert.equal(september.label,'2026년 9월');
  assert.equal(october.label,'2026년 10월');
  assert.deepEqual([...new Set(september.lines.slice(0,18).map(line=>line.category))],['연애','결혼','연인','자산·소비','일·사업','건강·컨디션']);
  assert.equal(september.lines.slice(18).every(line=>line.category==='자리 게임'),true);
  assert.match(september.lines[18].text,/왼쪽/);
  assert.match(september.lines[19].text,/무작위 질문/);
});
