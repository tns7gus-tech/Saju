import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import lunar from 'lunar-javascript';
export function setup(){
  const node=()=>({addEventListener(){},setAttribute(){},textContent:'',elements:{}}),form=node();
  for(const k of ['calendar','date','time','gender','leapMonth','nickname','relationshipStatus'])form.elements[k]=node();
  const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  let now='2026-09-28T03:00:00Z';
  class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return +new Date(now);}}
  const window={Solar:lunar.Solar,Lunar:lunar.Lunar,LunarUtil:lunar.LunarUtil,matchMedia:()=>({matches:false})};
  const document={getElementById:id=>id==='manseForm'?form:node(),querySelectorAll:()=>[],documentElement:{dataset:{}}};
  const context=vm.createContext({window,document,Intl,Date:Clock,localStorage:storage});
  for(const f of ['insight-engine.js','pages.js','demo-api.js'])vm.runInContext(readFileSync(new URL('../'+f,import.meta.url),'utf8'),context);
  return {window,storage,context,clock:v=>now=v,chart:(date='2000-06-15',time='09:30',extra={})=>window.calculateStaticManse({calendar:'solar',date,time,gender:'male',relationshipStatus:'single',leapMonth:false,...extra})};
}
