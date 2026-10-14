import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
const root=resolve('dist');
createServer(async(req,res)=>{try {const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);return res.end();}const file=path===root?resolve(root,'index.html'):path;const body=await readFile(file);res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(body);}catch{res.writeHead(404);res.end('Not found');}}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
