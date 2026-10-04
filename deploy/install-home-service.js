// Run only after reviewing .env and approving installation of a login agent.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!fs.existsSync(path.join(root,'.env')))throw Error('Create .env first');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const dir=path.join(os.homedir(),'Library','LaunchAgents'),target=path.join(dir,'com.sai.home.plist');
if(fs.existsSync(target))throw Error('Existing agent found; review it before replacing');
fs.mkdirSync(path.join(root,'data','home'),{recursive:true,mode:0o700});fs.mkdirSync(dir,{recursive:true});
const template=fs.readFileSync(new URL('./com.sai.home.plist.example',import.meta.url),'utf8');
fs.writeFileSync(target,template.replaceAll('NODE_ABSOLUTE_PATH',escape(process.execPath)).replaceAll('PROJECT_ABSOLUTE_PATH',escape(root)),{mode:0o600});
execFileSync('plutil',['-lint',target],{stdio:'inherit'});
execFileSync('launchctl',['bootstrap',`gui/${process.getuid()}`,target],{stdio:'inherit'});
console.log('Installed login agent com.sai.home');
