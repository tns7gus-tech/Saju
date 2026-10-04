// Static preview, never a payment or authentication backend.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const allowed=new Set(['index.html','pages.css','experience.css','pages.js','ai-loading.js','reading-rules.js','insight-engine.js','demo-api.js','experience.js','manse-visual.js']);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp'};
http.createServer(async(req,res)=>{
  try{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    if(!allowed.has(name)&&!/^assets\/[a-z0-9-]+\.(png|webp)$/.test(name)&&name!=='vendor/lunar.js'){res.writeHead(404);res.end('Not found');return;}
    let data=await readFile(path.join(root,name));if(name==='index.html')data=Buffer.from(data.toString().replace('; upgrade-insecure-requests',''));res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`SAI static demo: http://127.0.0.1:${process.env.PORT||4173}`));
