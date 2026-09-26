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

test('all short summaries use everyday Korean instead of unexplained chart labels',()=>{
  const chart=window.calculateStaticManse({calendar:'solar',date:'950228',time:'1245',gender:'male',leapMonth:false,relationshipStatus:'single'});
  for(let month=1;month<=12;month++){
    const {lines}=window.makeQuickSajuSummary(chart,2026,month,{direction:'정면',accessory:'아이폰 사용자'});
    assert.equal(lines.length,20);
    assert.doesNotMatch(lines.map(item=>item.text).join(' '),/십성|재성|정관|편관|정재|편재|비견|겁재|식신|상관|편인|정인|일간|일지|[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]/);
  }
});

test('changing month changes the substance of every category, not just its heading',()=>{
  const chart=window.calculateStaticManse({calendar:'solar',date:'950228',time:'1245',gender:'male',leapMonth:false,relationshipStatus:'single'});
  const game={direction:'정면',accessory:'아이폰 사용자'};
  for(let month=1;month<12;month++){
    const before=window.makeQuickSajuSummary(chart,2026,month,game).lines;
    const after=window.makeQuickSajuSummary(chart,2026,month+1,game).lines;
    for(let section=0;section<6;section++){
      const current=before.slice(section*3,section*3+3).map(x=>x.text).join(' ');
      const next=after.slice(section*3,section*3+3).map(x=>x.text).join(' ');
      assert.notEqual(current,next,`${month}월에서 ${month+1}월 사이 ${before[section*3].category} 내용이 반복됨`);
    }
  }
});
