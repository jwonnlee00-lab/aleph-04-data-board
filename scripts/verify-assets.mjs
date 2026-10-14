import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../assets/studio-task-assets/t04-real-information-board/',import.meta.url);
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await readFile(new URL('asset-manifest.json',root),'utf8'));
const files=[];
for(const entry of manifest.files){const bytes=await readFile(new URL(entry.path,root));files.push({path:entry.path,expected:entry.sha256,actual:hash(bytes),expectedBytes:entry.bytes,actualBytes:bytes.length,pass:hash(bytes)===entry.sha256&&bytes.length===entry.bytes});}
const supplied=[];
for(const name of ['README.md','public-contract.json','asset-manifest.json']){const external=await readFile(new URL('file:///C:/Users/User/Downloads/'+name));const bundled=await readFile(new URL(name,root));supplied.push({path:name,sha256:hash(external),matchesBundled:external.equals(bundled)});}
const archive=await readFile('C:/Users/User/Downloads/t04-real-information-board-public-v1.zip');
const report={package_id:manifest.package_id,checkedAt:new Date().toISOString(),manifestSelfExcluded:manifest.self_excluded,zip:{name:'t04-real-information-board-public-v1.zip',sha256:hash(archive),note:'ZIP hash recorded only; manifest intentionally has no expected ZIP hash.'},files,supplied,pass:files.every(x=>x.pass)&&supplied.every(x=>x.matchesBundled)};
await writeFile(new URL('../evidence/card-3-hashes.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({package_id:report.package_id,manifestFiles:files.length,matchedFiles:files.filter(x=>x.pass).length,suppliedMatched:supplied.every(x=>x.matchesBundled),zip:report.zip.sha256,pass:report.pass}));
if(!report.pass)process.exitCode=1;
