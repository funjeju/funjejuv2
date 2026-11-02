import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import crypto from 'node:crypto';
export function compile(path,deps={},globals={}) {
 const mod={exports:{}};const code=ts.transpileModule(readFileSync(new URL('../../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module:mod,exports:mod.exports,URL,TextDecoder,Uint8Array,...globals,require:name=>{if(!(name in deps))throw Error('unexpected import '+name);return deps[name]}});return mod.exports;
}
export function model(){const direct=compile('lib/cctv-direct-link.ts');return compile('lib/cctv-directory.ts',{'node:crypto':crypto,'@/lib/cctv-direct-link':direct});}
export const legacy=(id='a',data={})=>({id,version:'1:0',data:{name:'Camera',originUrl:'http://8.8.8.8/live.m3u8',active:false,...data}});
export function database(initial={}) {
 const records=new Map(Object.entries(initial));let version=10,reads=0;const writes=[];
 const ref=path=>({path,id:path.split('/').at(-1),collection:name=>collection(path+'/'+name),get:async()=>snap(path)});
 const collection=path=>({path,doc:id=>ref(path+'/'+id),get:async()=>query(path)});
 const snap=path=>({id:path.split('/').at(-1),exists:records.has(path),data:()=>records.get(path)?.data,updateTime:records.has(path)?{seconds:records.get(path).version,nanoseconds:0}:undefined});
 const query=path=>({docs:[...records.keys()].filter(k=>k.startsWith(path+'/')&&k.split('/').length===path.split('/').length+1).map(snap)});
 const db={collection,runTransaction:async fn=>{const pending=[];const tx={get:async target=>{reads++;if(pending.length)throw Error('read after write');return target.doc?query(target.path):snap(target.path)},create:(target,data)=>{if(records.has(target.path))throw Error('duplicate');pending.push({path:target.path,data})},set:(target,data)=>pending.push({path:target.path,data})};const result=await fn(tx);for(const w of pending){writes.push(w);records.set(w.path,{data:w.data,version:version++});}return result;}};
 return {db,records,writes,get reads(){return reads}};
}
export function server(fake,m=model()) {return compile('lib/cctv-directory-server.ts',{'server-only':{},'@/lib/firebase-admin':{getAdminDb:()=>fake.db},'@/lib/cctv-directory':m});}
export function routes(backend,{secret='configured',cookie='configured',writesEnabled='true'}={}) {
 const m=model();const response={json:(body,options={})=>({body,status:options.status??200,headers:options.headers??{}})};
 const deps={'next/server':{NextResponse:response},'next/headers':{cookies:async()=>({get:()=>cookie?{value:cookie}:undefined})},'@/lib/cctv-directory-server':backend,'@/lib/cctv-directory':m};
 return {admin:compile('app/api/admin/cctv-directory/route.ts',deps,{process:{env:{ADMIN_SECRET:secret,CCTV_DIRECTORY_WRITES_ENABLED:writesEnabled}}}),public:compile('app/api/cctv-directory/route.ts',deps),m};
}
export function request(body,headers={}){const req=new Request('https://preview.vercel.app/api/admin/cctv-directory',{method:'POST',headers:{origin:'https://preview.vercel.app','content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});req.nextUrl=new URL(req.url);return req;}
