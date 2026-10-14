import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024});
const rules=[
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['openai-key',/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/g],
  ['github-key',/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})\b/g],
  ['aws-key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['google-key',/\bAIza[A-Za-z0-9_-]{30,}\b/g],
  ['jwt',/\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/g],
  ['literal-secret',/(?:api[_-]?key|secret|password|access[_-]?token|authorization)\s*[=:]\s*["'](?:Bearer\s+)?[A-Za-z0-9_+/=-]{16,}["']/gi],
  ['url-credential',/https?:\/\/[^\s/@:]+:[^\s/@]+@/g],
  ['url-key',/[?&](?:api[_-]?key|token|secret|access_token)=[A-Za-z0-9_+/-]{12,}/gi]
];
function inspect(text,location){const hits=[];for(const [rule,regex] of rules){regex.lastIndex=0;const matches=[...text.matchAll(regex)];if(matches.length)hits.push({location,rule,count:matches.length});}return hits;}
const report={checkedAt:new Date().toISOString(),inspectedSourceHead:git('rev-parse','HEAD').trim(),scope:'Keyless JPY/KRW public data board',rules:rules.map(([name])=>name),trackedFiles:0,gitObjects:0,archiveEntries:0,findings:[],network:[],limitations:['Pattern-based inspection cannot prove absence of every possible unknown secret format.','Network evidence below is anonymous HTTP request/response inspection, not a browser DevTools HAR capture.']};
for(const file of git('ls-files','-z').split('\0').filter(Boolean)){
  report.trackedFiles++;report.findings.push(...inspect(await readFile(file,'utf8'),file));
}
const objects=git('cat-file','--batch-all-objects','--batch-check=%(objectname) %(objecttype)').trim().split('\n');
for(const row of objects){const [sha,type]=row.trim().split(' ');if(!['blob','commit','tag'].includes(type))continue;report.gitObjects++;report.findings.push(...inspect(git('cat-file',type,sha),`git:${sha}`));}
for(const file of ['.git/config','.git/logs/HEAD']){try{report.findings.push(...inspect(await readFile(file,'utf8'),file));}catch{}}
const archive=process.argv.slice(2).find(arg=>!arg.startsWith('--'));
if(archive){
 const entries=execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).split('\n').map(x=>x.trim()).filter(x=>x&&!x.endsWith('/'));
 for(const entry of entries){report.archiveEntries++;const text=execFileSync('tar',['-xOf',archive,entry],{encoding:'utf8',maxBuffer:32*1024*1024});report.findings.push(...inspect(text,`deployment:${entry}`));}
}
if(process.argv.includes('--network')){
const origin='https://honest-daily-board-krw-20261014.jwonnlee00.chatgpt.site';
const urls=[origin+'/',...['app.mjs','core.mjs','style.css','observations.json'].map(x=>origin+'/'+x),'https://api.frankfurter.dev/v2/providers/ecb/rate/JPY/KRW','https://raw.githubusercontent.com/jwonnlee00-lab/aleph-04-data-board/main/dist/observations.json','https://github.com/jwonnlee00-lab/aleph-04-data-board'];
for(const url of urls){try{const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15000)});const body=await response.text();const headers=JSON.stringify(Object.fromEntries(response.headers));report.findings.push(...inspect(body,`response-body:${url}`),...inspect(headers,`response-headers:${url}`));report.network.push({url,finalURL:response.url,status:response.status,credentialsSent:false,requestAuthorization:false,requestCookie:false,responseSecretMatches:inspect(body+headers,url).length,...(url.includes('/rate/JPY/KRW')?{rawResponse:body}:{})});}catch(error){report.network.push({url,error:error.name});}}
}
report.pass=report.findings.length===0;
await writeFile('evidence/card-2-search-results.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({trackedFiles:report.trackedFiles,gitObjects:report.gitObjects,archiveEntries:report.archiveEntries,secretFindings:report.findings.length,network:report.network.map(x=>({url:x.url,status:x.status,error:x.error})),report:'evidence/card-2-search-results.json'},null,2));
if(!report.pass)process.exitCode=1;
