import { test } from 'node:test';
import assert from 'node:assert/strict';
import { model,legacy,database,server,routes,request } from './helpers/directory-harness.mjs';
const m=model();const fields=m.fieldsFromEntry(m.normalizeLegacy(legacy()));
const initial=()=>({'cctvs/a':{data:legacy().data,version:1},'cctvs/disabled':{data:{...legacy().data,privateNested:{token:'SECRET'},active:false},version:2}});
test('import is atomic, copies full unknown snapshot, never writes legacy and reruns idempotently',async()=>{
 const fake=database(initial()),s=server(fake);const pre=await s.listDirectory();assert.equal(pre.pendingImportCount,2);
 assert.deepEqual(JSON.parse(JSON.stringify(await s.importLegacyDirectory(pre.importRevision))),{imported:2,skipped:0});assert.equal(fake.writes.some(w=>w.path.startsWith('cctvs/')),false);
 assert.equal(fake.records.get('cctv_directory_v1/disabled').data.legacySnapshot.privateNested.token,'SECRET');
 const after=await s.listDirectory();assert.equal(after.pendingImportCount,0);assert.equal(JSON.stringify(after).includes('SECRET'),false);
 const again=await s.importLegacyDirectory(after.importRevision);assert.equal(again.imported,0);assert.equal(again.skipped,2);
});
test('stale import, late legacy changes and over-limit imports produce zero writes',async()=>{
 const fake=database(initial()),s=server(fake),pre=await s.listDirectory();fake.records.set('cctvs/a',{data:{...legacy().data,newPrivate:'changed'},version:3});await assert.rejects(()=>s.importLegacyDirectory(pre.importRevision),e=>e.status===409);assert.equal(fake.writes.length,0);
 const big=database(Object.fromEntries(Array.from({length:401},(_,i)=>['cctvs/id'+i,{data:legacy().data,version:1}]))),b=server(big);await assert.rejects(async()=>b.importLegacyDirectory((await b.listDirectory()).importRevision),e=>e.status===400);assert.equal(big.writes.length,0);
});
test('save copies unimported legacy, preserves immutable snapshot and history on every edit',async()=>{
 const fake=database(initial()),s=server(fake),pre=await s.listDirectory();
 const one=await s.saveDirectory({action:'save',id:'disabled',expectedRevision:pre.entries.find(e=>e.id==='disabled').revision,fields:{...fields,name:'First'}});assert.equal(one.revision,'stored:1');
 fake.records.set('cctvs/disabled',{data:{changed:'not original'},version:9});
 const two=await s.saveDirectory({action:'save',id:'disabled',expectedRevision:one.revision,fields:{...fields,name:'Second'}});assert.equal(two.revision,'stored:2');
 assert.equal(fake.records.get('cctv_directory_v1/disabled').data.legacySnapshot.privateNested.token,'SECRET');assert.equal(fake.records.get('cctv_directory_v1/disabled/revisions/stored-1').data.previous.name,'First');assert.ok(fake.records.has('cctv_directory_v1/disabled/revisions/legacy-original'));assert.equal(fake.writes.some(w=>w.path.startsWith('cctvs/')),false);
 await assert.rejects(()=>s.saveDirectory({id:'disabled',expectedRevision:one.revision,fields}),e=>e.status===409);
});
test('manual ids cannot overwrite legacy and unknown fields cannot inject stored audit data',async()=>{
 const fake=database(initial()),s=server(fake);await assert.rejects(()=>s.saveDirectory({id:'a',expectedRevision:'new',fields}),e=>e.status===409);
 await assert.rejects(()=>s.saveDirectory({id:'../bad',expectedRevision:'new',fields}),e=>e.status===400);
 await assert.rejects(()=>s.saveDirectory({id:'manual',expectedRevision:'new',fields:{...fields,legacySnapshot:{secret:'injection'}}}),e=>e.status===400);
 const result=await s.saveDirectory({id:'manual',expectedRevision:'new',fields:{...fields,sourceUrl:'http://8.8.4.4/manual.m3u8'}});assert.equal(result.origin,'manual');assert.equal(result.legacyId,null);assert.equal(result.revision,'stored:1');
});
test('admin authentication precedes parsing and DB access; blank secret is never authorization',async()=>{
 let calls=0;const backend={listDirectory:async()=>{calls++},saveDirectory:async()=>{calls++}};
 for(const opts of [{cookie:null},{cookie:'wrong'},{secret:'',cookie:''}]){const r=routes(backend,opts);assert.equal((await r.admin.GET()).status,401);assert.equal((await r.admin.POST(request('bad'))).status,401)}assert.equal(calls,0);
});
test('CSRF, content type, malformed/big bodies and unknown fields fail before backend',async()=>{
 let calls=0;const r=routes({saveDirectory:async()=>{calls++}});
 for(const origin of ['null','https://evil.test','https://preview.vercel.app/'])assert.equal((await r.admin.POST(request({}, {origin}))).status,403);
 for(const req of [request({}, {'content-type':'text/plain'}),request('invalid'),request(' '.repeat(25000)),request({}, {'content-length':'25000'}),request({}, {'content-length':'bad'}),request({action:'save',id:'a',fields,expectedRevision:'new',legacySnapshot:{}})])assert.equal((await r.admin.POST(req)).status,400);
 assert.equal(calls,0);
});
test('generic backend errors redact exceptions and public response filters invisible entries with 30s cache',async()=>{
 const bad=routes({listDirectory:async()=>{throw Error('SECRET credential/path')},saveDirectory:async()=>{throw Error('SECRET')}});
 for(const response of [await bad.admin.GET(),await bad.public.GET(),await bad.admin.POST(request({action:'save',id:'a',fields,expectedRevision:'new'}))]){assert.equal(response.status,503);assert.equal(JSON.stringify(response).includes('SECRET'),false);assert.equal(response.headers['Cache-Control'],'no-store')}
 const good=routes({listDirectory:async()=>({entries:[{id:'a',visible:true},{id:'b',visible:false}]})});const result=await good.public.GET();assert.equal(result.body.entries.length,1);assert.match(result.headers['Cache-Control'],/s-maxage=30/);assert.match(result.headers['Cache-Control'],/max-age=0/);for(const key of ['revision','origin','legacyId','importRevision'])assert.equal(key in result.body.entries[0],false);
});
test('admin responses distinguish conflict/invalid and successful actions without private payloads',async()=>{
 let failStatus=409;let r;
 r=routes({saveDirectory:async()=>{throw new r.m.DirectoryError(failStatus)},importLegacyDirectory:async()=>({imported:2,skipped:1}),listDirectory:async()=>({entries:[]})});
 assert.equal((await r.admin.POST(request({action:'save',id:'a',expectedRevision:'new',fields}))).status,409);
 failStatus=400;assert.equal((await r.admin.POST(request({action:'save',id:'a',expectedRevision:'new',fields}))).status,400);
 const result=await r.admin.POST(request({action:'import-legacy',expectedImportRevision:'a'.repeat(64)}));assert.equal(result.status,200);assert.equal(result.body.imported,2);assert.equal(result.headers['Cache-Control'],'no-store');
});
test('metadata-only edit of restricted legacy preserves exact secret snapshot but never emits it',async()=>{
 const raw={...legacy().data,originUrl:'http://8.8.8.8/a?token=SECRET',unknown:{nested:['keep',42]}};
 const fake=database({'cctvs/restricted':{data:raw,version:1}}),s=server(fake);const entry=(await s.listDirectory()).entries[0];
 const result=await s.saveDirectory({id:entry.id,expectedRevision:entry.revision,fields:{...m.fieldsFromEntry(entry),name:'Metadata edit'}});
 assert.equal(result.sourceRestricted,true);assert.equal(result.sourceUrl,'');assert.equal(JSON.stringify(result).includes('SECRET'),false);
 assert.equal(fake.records.get('cctv_directory_v1/restricted').data.legacySnapshot.originUrl,raw.originUrl);assert.deepEqual(fake.records.get('cctv_directory_v1/restricted').data.legacySnapshot.unknown,raw.unknown);
});
test('new and changed duplicate identities are rejected including hidden Vurix quality variants',async()=>{
 const source='http://8.8.8.8:8080/media/api/v1/hls/vurix/10/20/0/0/index.m3u8';
 const fake=database({'cctvs/legacy':{data:{...legacy().data,originUrl:source},version:1},'cctv_directory_v1/hidden':{data:{...fields,sourceUrl:'http://8.8.4.4/hidden.m3u8',visible:false,origin:'manual',revision:1},version:2}}),s=server(fake);
 await assert.rejects(()=>s.saveDirectory({id:'new',expectedRevision:'new',fields:{...fields,sourceUrl:'https://8.8.8.8:8080/media/api/v1/hls/vurix/10/20/9/alternate'}}),e=>e.status===409);
 await assert.rejects(()=>s.saveDirectory({id:'new',expectedRevision:'new',fields:{...fields,sourceUrl:'http://8.8.4.4/hidden.m3u8'}}),e=>e.status===409);
 const manual=await s.saveDirectory({id:'new',expectedRevision:'new',fields:{...fields,sourceUrl:'http://8.8.4.4/unique.m3u8'}});
 await assert.rejects(()=>s.saveDirectory({id:'new',expectedRevision:manual.revision,fields:{...fields,sourceUrl:source}}),e=>e.status===409);
});
test('existing duplicate legacy records retain metadata edits, and four new provider identities remain addable',async()=>{
 const source='http://8.8.8.8:8080/media/api/v1/hls/vurix/10/20/0/0/index.m3u8';
 const fake=database({'cctvs/a':{data:{...legacy().data,originUrl:source},version:1},'cctvs/b':{data:{...legacy().data,originUrl:source},version:2}}),s=server(fake);
 let entries=(await s.listDirectory()).entries;assert.equal(entries.length,2);
 const old=entries.find(e=>e.id==='a');await s.saveDirectory({id:'a',expectedRevision:old.revision,fields:{...m.fieldsFromEntry(old),name:'Metadata only'}});
 for(let i=0;i<4;i++)await s.saveDirectory({id:'new'+i,expectedRevision:'new',fields:{...fields,sourceUrl:`http://8.8.8.8:8080/media/api/v1/hls/vurix/10/${30+i}/0/index.m3u8`}});
 await s.saveDirectory({id:'otherauthority',expectedRevision:'new',fields:{...fields,sourceUrl:'http://8.8.4.4:8080/media/api/v1/hls/vurix/10/20/index.m3u8'}});
 for(let i=0;i<2;i++)await s.saveDirectory({id:'viewer'+i,expectedRevision:'new',fields:{...fields,sourceUrl:'',viewerUrl:'https://www.jeju.go.kr/tool/halla/cctv_01.html'}});
 entries=(await s.listDirectory()).entries;assert.equal(entries.length,9);assert.equal(fake.records.get('cctvs/a').data.originUrl,source);assert.equal(fake.records.get('cctv_directory_v1/a').data.legacySnapshot.originUrl,source);
});

test('directory writes default locked before parsing or DB access until explicit access-rule gate',async()=>{
 for(const writesEnabled of [null,'','false','TRUE']){
  let writes=0;const r=routes({listDirectory:async()=>({entries:[]}),saveDirectory:async()=>{writes++},importLegacyDirectory:async()=>{writes++}},{writesEnabled});
  const response=await r.admin.POST(request('malformed'));assert.equal(response.status,503);assert.match(response.body.error,/locked pending access-rule verification/);assert.equal(writes,0);
  assert.equal((await r.admin.GET()).body.writesEnabled,false);
 }
 const enabled=routes({listDirectory:async()=>({entries:[]})});assert.equal((await enabled.admin.GET()).body.writesEnabled,true);
 const unauth=routes({}, {cookie:null,writesEnabled:null});assert.equal((await unauth.admin.POST(request('malformed'))).status,401);
 const crossOrigin=routes({}, {writesEnabled:null});assert.equal((await crossOrigin.admin.POST(request('malformed',{origin:'https://evil.test'}))).status,403);
});
