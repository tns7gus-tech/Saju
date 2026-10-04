import vm from 'node:vm';
import fs from 'node:fs';
import lunar from 'lunar-javascript';
// Run the shared browser calculation code with inert UI bindings.
const node=()=>({addEventListener(){},setAttribute(){},textContent:'',elements:{}});
const form=node();
for(const k of ['calendar','date','time','gender','leapMonth','nickname','relationshipStatus'])form.elements[k]=node();
const window={Solar:lunar.Solar,Lunar:lunar.Lunar,LunarUtil:lunar.LunarUtil};
const document={getElementById:id=>id==='manseForm'?form:node(),querySelectorAll:()=>[],documentElement:{dataset:{}}};
const ctx=vm.createContext({window,document,Intl,Date});
for(const f of ['insight-engine.js','pages.js'])vm.runInContext(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),ctx);
export function calculate(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('출생 정보를 확인해주세요.');
  const clean={};
  for(const k of ['calendar','date','time','gender','nickname','relationshipStatus']){
    if(input[k]!=null&&typeof input[k]!=='string')throw Error('출생 정보를 확인해주세요.');
    clean[k]=input[k]||'';
    if(clean[k].length>40)throw Error('출생 정보를 확인해주세요.');
  }
  clean.leapMonth=input.leapMonth===true;
  if(!['solar','lunar'].includes(clean.calendar)||!['','male','female'].includes(clean.gender)||!['','single','dating'].includes(clean.relationshipStatus))throw Error('출생 정보를 확인해주세요.');
  return window.calculateStaticManse(clean);
}
export const insights=window.SajuInsights;
export function today(date=new Date()){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  return ['year','month','day'].map(k=>p.find(x=>x.type===k).value).join('-');
}
