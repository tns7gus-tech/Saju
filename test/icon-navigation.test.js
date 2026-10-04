import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import lunar from 'lunar-javascript';
test('icons request only preview; chart icon shows calculation; detail button opens catalog',async()=>{
 const nodes=new Map();
 class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.listeners={};this.elements={};this.value='';this.open=false;this.hidden=false;this.dataset={};}
  addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}async fire(name,event={}){for(const fn of this.listeners[name]||[])await fn(event);await new Promise(r=>setImmediate(r));}
  append(node){this.children.push(node);}replaceChildren(...children){this.children=children;}setAttribute(){}removeAttribute(){}scrollIntoView(){}focus(){}querySelector(selector){return get(selector);}showModal(){this.open=true;}close(){this.open=false;for(const fn of this.listeners.close||[])fn();}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};const form=get('manseForm');
 for(const [name,value] of Object.entries({calendar:'solar',date:'20000615',time:'0930',gender:'male',relationshipStatus:'',nickname:'',leapMonth:''})){form.elements[name]=new Element('input');form.elements[name].value=value;}
 const requests=[];
 const api={production:true,reading:async(kind,chart,params)=>{requests.push({kind,params});if(kind==='catalog')return {sections:[]};return {label:'2026년 10월',question:'짧은 이야기',paragraphs:['짧은 미리보기입니다.']};}};
 const window={Solar:lunar.Solar,Lunar:lunar.Lunar,LunarUtil:lunar.LunarUtil,SaiDemoAPI:api,SaiLoading:{mount:()=>({dispose(){},updateText(){}})},matchMedia:()=>({matches:false}),renderVisualManse(){}};
 const document={getElementById:get,createElement:tag=>new Element(tag),querySelectorAll:()=>[],documentElement:{dataset:{}},dispatchEvent(){}};
 const context=vm.createContext({window,document,Intl,Date,CustomEvent:class{},localStorage:{getItem(){},setItem(){}},setTimeout});
 for(const name of ['insight-engine.js','pages.js'])vm.runInContext(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'),context);
 await form.fire('submit',{preventDefault(){}});assert.deepEqual(requests.map(r=>r.kind),['quick']);
 const cards=get('quickSummary').children.filter(n=>n.tag==='button');assert.equal(cards.length,8);
 await cards[0].fire('click');assert.deepEqual(requests.map(r=>r.kind),['quick','topic']);assert.equal(requests.at(-1).params.topic,'연애');
 await cards[7].fire('click');assert.equal(requests.length,2);assert.equal(get('detailDialog').open,true);assert.equal(get('report').hidden,true);
 await get('openDetails').fire('click');assert.equal(requests.at(-1).kind,'catalog');assert.equal(get('report').hidden,false);assert.ok(requests.every(r=>r.kind!=='section'));
});
