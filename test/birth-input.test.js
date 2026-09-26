import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import lunar from 'lunar-javascript';

const nodes=new Map();
const node=()=>({addEventListener(){},setAttribute(){},textContent:'',elements:{}});
const form=node();
for(const key of ['calendar','date','time','gender','leapMonth','nickname','relationshipStatus'])form.elements[key]=node();
nodes.set('manseForm',form);
const document={getElementById:id=>nodes.get(id)||node(),querySelectorAll:()=>[],documentElement:{dataset:{}}};
const window={Solar:lunar.Solar,Lunar:lunar.Lunar,matchMedia:()=>({matches:false})};
const context=vm.createContext({document,window,Intl,Date,localStorage:{getItem:()=>null}});
vm.runInContext(readFileSync(new URL('../pages.js',import.meta.url),'utf8'),context);
const calculate=window.calculateStaticManse;
const base={calendar:'solar',gender:'male',leapMonth:false,relationshipStatus:''};

test('six and eight digit dates and compact time produce the same pillars',()=>{
  const short=calculate({...base,date:'950228',time:'1245'});
  const long=calculate({...base,date:'1995-02-28',time:'12:45'});
  assert.equal(short.input.date,'1995-02-28');
  assert.equal(short.input.time,'12:45');
  assert.deepEqual(short.pillars.map(x=>x.hanja),long.pillars.map(x=>x.hanja));
});

test('invalid day, leap day, future birth date and hour are rejected',()=>{
  const nextYear=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date()))+1;
  assert.throws(()=>calculate({...base,date:'950230',time:'1245'}),/존재하지 않는 양력 날짜/);
  assert.throws(()=>calculate({...base,date:'010229',time:'1245'}),/존재하지 않는 양력 날짜/);
  if(nextYear<=2050)assert.throws(()=>calculate({...base,date:`${nextYear}0101`,time:'1245'}),/미래의 출생 날짜/);
  assert.throws(()=>calculate({...base,date:'950228',time:'2560'}),/출생 시각을 확인/);
  assert.throws(()=>calculate({...base,date:'abc950228',time:'1245'}),/출생 날짜를 숫자로/);
});
