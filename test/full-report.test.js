import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import lunar from 'lunar-javascript';

const {Solar,LunarUtil}=lunar;
const window={Solar,LunarUtil};
const context=vm.createContext({window,Intl,Date});
for(const path of ['reading-rules.js','full-report.js'])vm.runInContext(readFileSync(new URL('../'+path,import.meta.url),'utf8'),context);

function fixture(date,time='21:00',gender='male'){
  const [y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number);
  const e=Solar.fromYmdHms(y,m,d,h,min,0).getLunar().getEightChar();
  const stems={甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'};
  const branches={寅:'목',卯:'목',巳:'화',午:'화',辰:'토',戌:'토',丑:'토',未:'토',申:'금',酉:'금',亥:'수',子:'수'};
  const pillars=['Year','Month','Day','Time'].map((key,i)=>{
    const gz=e['get'+key]();return {name:['년주','월주','일주','시주'][i],hanja:gz,stem:gz[0],branch:gz[1],stemElement:stems[gz[0]],branchElement:branches[gz[1]],tenGod:'정인',branchGod:'정인',hiddenStems:e['get'+key+'HideGan'](),stage:'장생'};
  });
  const elements=Object.fromEntries(['목','화','토','금','수'].map(x=>[x,0]));
  pillars.forEach(p=>{elements[p.stemElement]++;elements[p.branchElement]++;});
  const yun=e.getYun(gender==='male'?1:0);
  const luck={direction:yun.isForward()?'순행':'역행',start:[yun.getStartYear(),yun.getStartMonth(),yun.getStartDay()],periods:yun.getDaYun(12).filter(p=>p.getIndex()>0).map(p=>({startYear:p.getStartYear(),endYear:p.getEndYear(),startAge:p.getStartAge(),ganZhi:p.getGanZhi()}))};
  return {pillars,elements,solarDate:date,input:{date,time,calendar:'solar',gender,relationshipStatus:'single'},luck,warnings:['한국 현지 표준시 기준']};
}

test('sample boundary birth uses computed hour and element count, not copied example assertions',()=>{
  const c=fixture('1991-06-20');
  const report=window.makeFullSajuReport(c,{year:2026,month:10});
  assert.equal(c.pillars.map(x=>x.hanja).join(' '),'辛未 甲午 辛酉 己亥');
  assert.equal(c.elements.수,1);
  assert.equal(report.sections.length,12);
  assert.equal(report.overview.length,30);
  assert.match(report.overview[0],/己亥/);
  assert.match(report.overview[2],/수 1/);
  assert.doesNotMatch(report.sections[0].paragraphs.join(' '),/수 0|시주 戊戌/);
  assert.equal(report.sections[10].items.length,9);
  assert.equal(report.sections[5].items.length,12);
});

test('selected month and absent birth time change detail without inventing hour pillar',()=>{
  const c=fixture('1995-02-28','12:45');
  const september=window.makeFullSajuReport(c,{year:2026,month:9});
  const october=window.makeFullSajuReport(c,{year:2026,month:10});
  assert.notEqual(september.sections[5].paragraphs[0],october.sections[5].paragraphs[0]);
  c.pillars[3]={name:'시주',unknown:true};c.luck=null;c.input.gender='';c.input.time='';
  const missing=window.makeFullSajuReport(c,{year:2026,month:10});
  assert.match(missing.sections[0].paragraphs[0],/미입력/);
  assert.match(missing.sections[9].paragraphs[0],/미입력 정보를 추정해 배열을 만들지/);
  assert.equal(missing.sections[9].items.length,0);
});
