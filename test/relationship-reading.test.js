import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import lunar from 'lunar-javascript';

const {Solar,LunarUtil}=lunar;
const window={Solar,LunarUtil};
const context=vm.createContext({window,Intl,Date});
vm.runInContext(readFileSync(new URL('../reading-rules.js',import.meta.url),'utf8'),context);

function fixture(date,time,gender,luck=null){
  const [y,m,d]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
  const e=Solar.fromYmdHms(y,m,d,hour,minute,0).getLunar().getEightChar();
  const pillars=['Year','Month','Day','Time'].map(key=>{
    const gz=e['get'+key]();return {stem:gz[0],branch:gz[1],hanja:gz};
  });
  return {pillars,input:{date,time,gender,relationshipStatus:'dating'},solarDate:date,luck};
}

test('reference chart ties July to spouse stem combination and August to day-branch clash',()=>{
  const c=fixture('1995-02-28','12:45','male',{periods:[{startYear:2023,endYear:2032,ganZhi:'乙亥'}]});
  const july=window.sajuRelationshipTransit(c,2026,7),aug=window.sajuRelationshipTransit(c,2026,8);
  assert.equal(july.gz,'乙未');assert.equal(july.meeting,5);assert.equal(july.commitment,5);
  assert.ok(july.evidence.some(x=>x.includes('庚乙')));
  assert.equal(aug.gz,'丙申');assert.equal(aug.change,5);
  assert.ok(aug.evidence.some(x=>x.includes('寅')&&x.includes('申')&&x.includes('2곳')));
  const report=window.makeSajuReport(c,{year:2026,month:9});
  assert.equal(report[1].table.rows.length,7);
  assert.equal(report[3].table.rows.length,3);
  assert.match(report[4].paragraphs[2],/결혼 논의|이사/);
  assert.equal(window.sajuRelationshipTransit(c,2027).commitment,5);
  assert.equal(window.sajuRelationshipTransit(c,2028).change,5);
});

test('different birth chart and omitted gender do not reuse reference-specific spouse claims',()=>{
  const other=fixture('2000-06-15','08:30','female');
  const sample=fixture('1995-02-28','12:45','male');
  const a=window.sajuRelationshipTransit(other,2026,8),b=window.sajuRelationshipTransit(sample,2026,8);
  assert.notEqual(other.pillars[2].branch,sample.pillars[2].branch);
  assert.notEqual(a.evidence.join(' '),b.evidence.join(' '));
  other.input.gender='';other.luck=null;
  const report=window.makeSajuReport(other,{year:2026,month:9});
  assert.match(report[0].paragraphs[0],/추가 점수는 적용하지 않았습니다/);
  assert.match(report[0].paragraphs[1],/없는 값을 추정하지 않았습니다/);
});
