import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './helpers.js';
const {window,chart}=setup(),e=window.SajuInsights,game={direction:'정면',accessory:'안경 쓴 사람'};
test('existing 20-line six-topic contract and consistent summary/detail',()=>{
 const c=chart();for(let month=1;month<=12;month++){const q=window.makeQuickSajuSummary(c,2026,month,game);assert.equal(q.lines.length,20);assert.equal(q.lines.filter(l=>l.category==='자리 게임').length,2);assert.doesNotMatch(q.lines.slice(0,18).map(l=>l.text).join(' '),/[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]/);const full=e.full(c,{year:2026,month});assert.equal(q.lines[0].text,'핵심 · '+full.sections[5].paragraphs[0]);}
});
test('all six topic cards change by month and relationship month list matches the cards',()=>{
 const c=chart(),categories=['연애','결혼','연인','자산·소비','일·사업','건강·컨디션'];
 const monthly=Array.from({length:12},(_,i)=>e.quick(c,2026,i+1,game));
 for(const category of categories){
  const cores=monthly.map(q=>q.lines.find(x=>x.category===category).text);
  assert.ok(new Set(cores).size>=10,`${category} 핵심 문장이 월별로 구분되어야 합니다.`);
 }
 const items=e.full(c,{year:2026,month:1}).sections[5].items;
 for(let i=0;i<12;i++)assert.ok(items[i].includes(monthly[i].lines[0].text.replace(/^핵심 · /,'')),`${i+1}월 상세 풀이에 월별 카드 핵심 반영`);
});
test('same day pillar with different month/hour changes interpretation',()=>{
 const a=chart('2000-06-15','09:30'),b=chart('2000-08-14','21:30');assert.equal(a.pillars[2].hanja,b.pillars[2].hanja);assert.notDeepEqual(e.profile(a).ranked,e.profile(b).ranked);assert.notEqual(e.quick(a,2026,10,game).lines[0].text,e.quick(b,2026,10,game).lines[0].text);
});
test('month includes decade and annual layers while natal profile stays fixed',()=>{
 const c=chart(),a=e.frame(c,2026,1),b=e.frame(c,2026,9);assert.deepEqual(a.profile,b.profile);assert.ok(a.layers.some(l=>l.label==='대운'));assert.ok(a.layers.some(l=>l.label==='세운'));assert.notEqual(a.layers.at(-1).gz,b.layers.at(-1).gz);
});
test('relationship status changes relationship guidance but not chart',()=>{
 const a=chart(),b=chart(undefined,undefined,{relationshipStatus:'dating'});assert.equal(e.profile(a).signature,e.profile(b).signature);assert.match(e.quick(a,2026,9,game).lines[0].text,/새로 알아가는/);assert.match(e.quick(b,2026,9,game).lines[0].text,/교제 중/);
});
test('same request deterministic and calendar output unchanged',()=>{const c=chart(),before=JSON.stringify(c);assert.deepEqual(e.full(c,{year:2026,month:9}),e.full(c,{year:2026,month:9}));assert.equal(JSON.stringify(c),before);});
