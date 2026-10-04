// Synthetic input only; confirm the expert prompt produces a validated detailed response.
import {createLocalLLM} from '../backend/local-llm.js';
import {generateReading} from '../backend/ai-readings.js';
import fs from 'node:fs';
const started=performance.now();let first,raw='';
let result;try{result=await generateReading(createLocalLLM(process.env),process.env,'section',{calendar:'solar',date:'2000-06-15',time:'09:30',gender:'male'},{year:2026,month:10,reportKind:'full',section:0},text=>{raw+=text;if(first===undefined){first=(performance.now()-started)/1000;console.log(JSON.stringify({firstTokenSeconds:first}));}});}catch(error){fs.mkdirSync('data/home',{recursive:true});fs.writeFileSync('data/home/expert-failed-stream.txt',raw);let details;try{const data=JSON.parse(raw);details={paragraphCount:data.paragraphs?.length,lengths:data.paragraphs?.map(p=>p.length),containsInstructions:data.paragraphs?.map(p=>/paragraphs|num_predict|outputSchema/.test(p))};}catch{}console.error(JSON.stringify({error:error.message,details}));process.exit(1);}
fs.mkdirSync('data/home',{recursive:true});fs.writeFileSync('data/home/expert-smoke.json',JSON.stringify({firstTokenSeconds:first,completeSeconds:(performance.now()-started)/1000,result},null,2));
console.log(JSON.stringify({completeSeconds:(performance.now()-started)/1000,title:result.title,paragraphCount:result.paragraphs.length,characters:result.paragraphs.join('').length,promptVersion:result.promptVersion}));
