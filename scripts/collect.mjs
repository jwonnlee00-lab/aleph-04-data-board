import {readFile,writeFile,mkdir,rename,open,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {kstDate,receive} from '../dist/core.mjs';
import {upsertDaily} from '../dist/daily.mjs';
const path=new URL('../dist/observations.json',import.meta.url);
const temp=new URL('../dist/.observations-next.json',import.meta.url);
const lockPath=new URL('../dist/.observations.lock',import.meta.url);
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
const lock=await open(lockPath,'wx');
try {
 let store={version:1,records:[],lastAttempt:null};
 try {store=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const last=store.records.at(-1)?.value??null;
 const result=await receive(fetch,'live',new Date(),last);
 const fetchedAt=new Date().toISOString();
 const before=store.records.length;
 if(result.ok){
   store=upsertDaily(store,result.data,fetchedAt,result.rawResponse);
   for(const record of store.records)record.sha256=createHash('sha256').update(JSON.stringify(record.value)).digest('hex');
 }
 store.lastAttempt={at:fetchedAt,kstDate:kstDate(new Date(fetchedAt)),ok:result.ok,reason:result.ok?null:result.reason};
 await writeFile(temp,JSON.stringify(store,null,2)+'\n');
 await rename(temp,path);
 console.log(result.ok?`Real KST record upserted: ${kstDate(new Date(fetchedAt))}; rows ${before} -> ${store.records.length}`:`Collection failed (${result.reason}); previous records preserved.`);
 if(!result.ok)process.exitCode=1;
} finally {await lock.close();await rm(lockPath,{force:true});await rm(temp,{force:true});}
