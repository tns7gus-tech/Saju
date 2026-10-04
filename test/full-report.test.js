import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './helpers.js';
const {window,chart}=setup(),e=window.SajuInsights;
test('12 sections and 30 lines with actual chart facts',()=>{
 const c=chart('1991-06-20','21:00'),r=e.full(c,{year:2026,month:10});assert.equal(c.pillars.map(p=>p.hanja).join(' '),'辛未 甲午 辛酉 己亥');assert.equal(r.sections.length,12);assert.equal(r.overview.length,30);assert.equal(r.sections[5].items.length,12);assert.equal(r.sections[10].items.length,9);assert.match(r.sections[0].paragraphs[0],/己亥/);assert.match(r.sections[0].paragraphs[1],/수 1/);assert.doesNotMatch(JSON.stringify(r),/undefined|NaN/);
});
test('unknown time removes hour evidence and decade without fabrication',()=>{
 const c=chart('2000-06-15','',{gender:''}),r=e.full(c,{year:2026,month:9});assert.match(r.sections[0].paragraphs[0],/시각 미입력/);assert.equal(r.sections[9].items.length,0);assert.ok(!r.analysis.layers.some(l=>l.label==='대운'));assert.ok(r.analysis.profile.ranked.every(t=>t.evidence.every(x=>!x.includes('시주'))));
});
test('coexisting combinations and clashes retain both evidence',()=>{
 let found=false;for(let m=1;m<=12;m++){const f=e.frame(chart(),2026,m),links=f.layers.flatMap(l=>l.links);if(links.some(l=>l.kind.includes('합'))&&links.some(l=>l.kind==='충')){found=true;assert.match(f.tension,/연결과 조율/);}}assert.ok(found);
});
test('compatibility uses both charts; date candidates respect range',()=>{
 const a=chart(),b=chart('2001-03-21','15:30'),c=chart('1998-12-10','06:00');assert.notDeepEqual(e.compatibility(a,b,'친구'),e.compatibility(a,c,'친구'));const dates=e.dates(a,'2026-10-01','2026-10-12','work');assert.equal(dates.length,5);assert.ok(dates.every(d=>d.date>='2026-10-01'&&d.date<='2026-10-12'));assert.throws(()=>e.dates(a,'2026-10-02','2026-10-01','work'));assert.throws(()=>e.dates(a,'2026-02-30','2026-03-02','work'));assert.throws(()=>e.dates(a,'2026-01-01','2026-12-31','work'));assert.throws(()=>e.frame(a,NaN));
});
test('symbolic weights never presented as outcome probabilities or diagnosis',()=>{
 for(const d of ['1980-01-20','1992-11-04','2000-06-15','2001-03-21']){const r=e.full(chart(d),{year:2026,month:9});assert.doesNotMatch(JSON.stringify(r),/결혼 확률|이별 확률|수익률 \d|반드시 결혼|암에 걸/);assert.match(r.sections[7].items[0],/진단 자료가 아닙니다/);}
});
