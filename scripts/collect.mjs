import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {API,kstDate,receive} from '../dist/core.mjs';
const path=new URL('../dist/observations.json',import.meta.url);
let store={version:1,records:[],lastAttempt:null};
try {store=JSON.parse(await readFile(path,'utf8'));} catch(e) {if(e.code!=='ENOENT') throw e;}
const now=new Date();
const last=store.records.at(-1)?.value ?? null;
const result=await receive(fetch,'live',now,last);
store.lastAttempt={at:now.toISOString(),kstDate:kstDate(now),ok:result.ok,reason:result.ok?null:result.reason};
if(result.ok && !store.records.some(r=>r.kstDate===kstDate(now))) {
  store.records.push({kstDate:kstDate(now),collectedAt:now.toISOString(),source:API,value:result.data,sha256:createHash('sha256').update(JSON.stringify(result.data)).digest('hex')});
  store.records.sort((a,b)=>a.kstDate.localeCompare(b.kstDate));
}
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
await writeFile(path,JSON.stringify(store,null,2)+'\n');
console.log(result.ok?`Real observation saved or preserved: ${kstDate(now)}`:`Collection failed (${result.reason}); previous records preserved.`);
if(!result.ok) process.exitCode=1;
