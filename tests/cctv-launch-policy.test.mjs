import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const camera = { id:'observed', active:true, originUrl:'http://source.example.test/live.m3u8' };
const revision = createHash('sha256').update(JSON.stringify([camera.originUrl,''])).digest('hex');
const observation = { id:camera.id, sourceRevision:revision, observedAt:'2026-11-01T16:32:47.392Z' };
function compile(path, stubs, globals={}) {
 const mod={exports:{}};const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{module:mod,exports:mod.exports,TextEncoder,Uint8Array,crypto:webcrypto,require:name=>{assert.ok(name in stubs,name);return stubs[name]},...globals});return mod.exports;
}
function policy(globals={}) { return compile('../lib/cctv-launch-policy.ts',{'../constants/cctv-launch-observations':{CCTV_LAUNCH_OBSERVATIONS:[observation]}},globals); }

test('launch selection requires prior observed page AND exact current stored-source digest',async()=>{
 const p=policy();assert.equal(await p.isLaunchCameraVisible(camera),true);
 for(const edit of [{id:'unknown'},{active:false},{originUrl:'http://source.example.test/replaced'},{youtubeId:'failed-video'},{proxySyncPending:true},{originUrl:null},{originUrl:{bad:true}}])assert.equal(await p.isLaunchCameraVisible({...camera,...edit}),false);
 assert.equal(await p.isLaunchCameraVisible({...camera,name:'Renamed metadata'}),true);
 assert.equal(await policy({crypto:undefined}).isLaunchCameraVisible(camera),false);
});
test('public filtering does not mutate or delete retained inventory',async()=>{
 const rows=[camera,{...camera,id:'unverified'},{...camera,id:'youtube',youtubeId:'failed'}];const snapshot=JSON.stringify(rows);
 assert.deepEqual(Array.from(await policy().filterLaunchCameras(rows),c=>c.id),['observed']);assert.equal(JSON.stringify(rows),snapshot);
});
test('release evidence has 12 dated frame/time observations, no origin addresses or failed YouTube IDs',()=>{
 const m=compile('../constants/cctv-launch-observations.ts',{});const rows=m.CCTV_LAUNCH_OBSERVATIONS;
 assert.equal(rows.length,12);assert.equal(new Set(rows.map(r=>r.id)).size,12);
 for(const row of rows){assert.match(row.sourceRevision,/^[a-f0-9]{64}$/);assert.ok(row.width>0&&row.height>0&&row.timeAdvancedSeconds>0);assert.ok(Date.parse(row.observedAt)>=Date.parse('2026-11-01T16:31:00Z'));assert.equal(row.pageUrl,`https://funjeju.com/cctv/${row.id}`);assert.equal('originUrl' in row,false)}
 assert.ok(!rows.some(row=>['sungsan','nonjitmul','gimnyeong'].includes(row.id)));
});

function hookHarness() {
 let inventory={cctvs:[camera],loading:false,error:null};let state=new Map(),effect,cleanup,deps;
 const p=policy();const hook=compile('../hooks/usePublicCctvs.ts',{
  react:{useState:()=>[state,v=>{state=v}],useEffect:(fn,next)=>{if(!deps||next.some((v,i)=>v!==deps[i])){deps=next;effect=fn}}},
  '@/hooks/useCctvs':{useCctvs:()=>inventory},'@/lib/cctv-launch-policy':p,
 });
 const render=()=>{const result=hook.usePublicCctvs();if(effect){cleanup?.();cleanup=effect();effect=undefined}return result};
 return {render,update:(next)=>{inventory={...inventory,...next}},flush:async()=>{await new Promise(resolve=>setTimeout(resolve,15))},dispose:()=>cleanup?.()};
}
test('public hook fails closed before digest and on source edits, preserves metadata-only eligibility',async()=>{
 const h=hookHarness();assert.equal(h.render().cctvs.length,0);await h.flush();assert.equal(h.render().cctvs.length,1);
 h.update({cctvs:[{...camera,name:'Metadata rename'}]});assert.equal(h.render().cctvs.length,1);
 h.update({cctvs:[{...camera,originUrl:'http://other.example.test/new'}]});assert.equal(h.render().cctvs.length,0);
 await h.flush();assert.equal(h.render().cctvs.length,0);
 h.update({cctvs:[{...camera,active:false}]});assert.equal(h.render().cctvs.length,0);h.dispose();
});
test('stale async digest results cannot restore a source after newer inventory/error',async()=>{
 const h=hookHarness();h.render();h.update({cctvs:[],error:'unavailable'});h.render();await h.flush();const out=h.render();assert.equal(out.cctvs.length,0);assert.equal(out.error,'unavailable');h.dispose();
});
test('admin tools retain raw inventory hook; every public listing uses filtered hook',()=>{
 for(const name of ['app/admin/cardnews/page.tsx','app/admin/cctv-seo/page.tsx'])assert.match(readFileSync(new URL('../'+name,import.meta.url),'utf8'),/hooks\/useCctvs/);
 for(const name of ['components/cctv/CctvExplorer.tsx','app/cctv/multiview/page.tsx','components/legacy/LegacyCctvPage.tsx','components/cctv/PublicRegionCctvs.tsx'])assert.match(readFileSync(new URL('../'+name,import.meta.url),'utf8'),/hooks\/usePublicCctvs/);
});
test('cached detail player boundary requires current visible ID and matching observation revision',()=>{
 let state={cctvs:[camera],loading:false,error:null};const jsx=(type,props)=>({type,props});
 const {PublicPlaybackBoundary:Boundary}=compile('../components/cctv/PublicPlaybackBoundary.tsx',{
  'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':{default:'Link'},'@/hooks/usePublicCctvs':{usePublicCctvs:()=>state},'@/lib/cctv-launch-policy':policy(),
 });
 const child={type:'video',props:{}};const props={id:camera.id,sourceRevision:revision,children:child};assert.equal(Boundary(props),child);
 assert.notEqual(Boundary({...props,sourceRevision:'old-revision'}),child);
 state={...state,cctvs:[]};assert.notEqual(Boundary(props),child);
 state={...state,cctvs:[camera],error:'unavailable'};assert.notEqual(Boundary(props),child);
});

test('public Firestore subscription requires server-confirmed snapshots, including metadata-only changes',()=>{
 let snapshot,options,errorCallback;const emitted=[],errors=[];
 const client=compile('../lib/firestore-cctv.ts',{
  'firebase/firestore':{collection:()=>({}),query:()=>({}),where:()=>({}),orderBy:()=>({}),onSnapshot:(_q,opts,cb,err)=>{options=opts;snapshot=cb;errorCallback=err;return()=>{}}},
  '@/lib/firebase':{getFirebaseDb:()=>({})},'@/constants/cctv-directions':{getDirection:()=>'북'},
 },{process:{env:{}}});
 client.subscribeCctvs(rows=>emitted.push(rows),err=>errors.push(err),true);
 assert.equal(options.includeMetadataChanges,true);
 const docs=[{id:'observed',data:()=>camera}];
 snapshot({docs,metadata:{fromCache:true,hasPendingWrites:false}});assert.equal(emitted.length,0);assert.equal(errors.length,1);
 snapshot({docs,metadata:{fromCache:false,hasPendingWrites:true}});assert.equal(emitted.length,0);
 snapshot({docs,metadata:{fromCache:false,hasPendingWrites:false}});assert.equal(emitted.length,1);assert.equal(emitted[0][0].id,'observed');
 snapshot({docs,metadata:{fromCache:true,hasPendingWrites:false}});assert.equal(errors.length,3);assert.equal(emitted.length,1);
 errorCallback(new Error('denied'));assert.equal(errors.length,4);
});
test('raw administrative inventory keeps its existing cached-read behavior',()=>{
 let snapshot,options;const emitted=[];
 const client=compile('../lib/firestore-cctv.ts',{
  'firebase/firestore':{collection:()=>({}),query:()=>({}),where:()=>({}),orderBy:()=>({}),onSnapshot:(_q,opts,cb)=>{options=opts;snapshot=cb;return()=>{}}},
  '@/lib/firebase':{getFirebaseDb:()=>({})},'@/constants/cctv-directions':{getDirection:()=>'북'},
 },{process:{env:{}}});
 client.subscribeCctvs(rows=>emitted.push(rows));assert.equal(options.includeMetadataChanges,false);
 snapshot({docs:[{id:'held',data:()=>({...camera,proxySyncPending:true})}],metadata:{fromCache:true,hasPendingWrites:true}});
 assert.equal(emitted.length,1);assert.equal(emitted[0][0].proxySyncPending,true);
});

test('browser offline clears public inventory without waiting for a Firestore error callback',()=>{
 const values=[];let index=0,effect,callback,offline,removed=false,unsubscribed=false;
 const globals={window:{addEventListener:(type,fn)=>{assert.equal(type,'offline');offline=fn},removeEventListener:()=>{removed=true}},navigator:{onLine:true},queueMicrotask};
 const hook=compile('../hooks/useCctvs.ts',{
  react:{useState:initial=>{const i=index++;if(!(i in values))values[i]=initial;return[values[i],value=>{values[i]=value}]},useEffect:fn=>{effect=fn}},
  '@/lib/firestore-cctv':{subscribeCctvs:(cb,_err,server)=>{assert.equal(server,true);callback=cb;return()=>{unsubscribed=true}}},
 },globals);
 const render=()=>{index=0;return hook.useCctvs(true)};render();const cleanup=effect();
 callback([camera]);assert.equal(render().cctvs.length,1);
 globals.navigator.onLine=false;offline();assert.equal(render().cctvs.length,0);assert.ok(render().error);
 callback([camera]);assert.equal(render().cctvs.length,0);
 globals.navigator.onLine=true;callback([camera]);assert.equal(render().cctvs.length,1);
 cleanup();assert.equal(removed,true);assert.equal(unsubscribed,true);callback([]);assert.equal(render().cctvs.length,1);
});
