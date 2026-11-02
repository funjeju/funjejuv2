import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as direct from '../lib/cctv-direct-link.ts';
function load(path,deps,extra={}){
 const mod={exports:{}};const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module:mod,exports:mod.exports,require:n=>{assert.ok(n in deps,n);return deps[n]},...extra});return mod.exports;
}
const client=load('../lib/cctv-directory-client.ts',{'@/lib/cctv-direct-link':direct});
const base={visible:true,sourceUrl:'http://cctv.example.kr/live.m3u8',viewerUrl:'',youtubeId:''};
test('directory viewer chooses safe official page, YouTube then raw source without network or status gate',()=>{
 assert.equal(client.directoryViewerHref(base),base.sourceUrl);
 assert.equal(client.directoryViewerHref({...base,viewerUrl:'https://viewer.example.kr/watch'}),'https://viewer.example.kr/watch');
 assert.equal(client.directoryViewerHref({...base,youtubeId:'abcdefghijk'}),'https://www.youtube.com/watch?v=abcdefghijk');
 for(const playbackStatus of ['verified','unavailable','unverified'])assert.equal(client.directoryViewerHref({...base,playbackStatus}),base.sourceUrl);
 assert.equal(client.directoryViewerHref({...base,visible:false}),null);
});
test('directory viewer fails closed for invalid prioritized destination, secret parameters and missing sources',()=>{
 for(const url of ['javascript:alert(1)','http://127.0.0.1/watch','http://10.0.0.1/watch','https://viewer.example.kr/watch?token=secret','https://user:secret@viewer.example.kr/watch']){
  assert.equal(client.directoryViewerHref({...base,viewerUrl:url}),null,'must not fall back from invalid explicit viewer');
  assert.equal(client.directoryViewerHref({...base,sourceUrl:url}),null);
 }
 assert.equal(client.directoryViewerHref({...base,sourceUrl:''}),null);
 assert.equal(client.directoryViewerHref({...base,youtubeId:'invalid/?token'}),null);
 assert.equal(client.directoryViewerHref({...base,viewerUrl:'https://viewer.example.kr/watch',youtubeId:'invalid'}),'https://viewer.example.kr/watch');
});
test('directory status labels separate catalogue from playback and make no permanent LIVE claim',()=>{
 assert.equal(client.directoryStatusLabel('verified'),'관리자 재생 확인');
 assert.equal(client.directoryStatusLabel('unverified'),'재생 확인 필요');
 assert.equal(client.directoryStatusLabel('unavailable'),'현재 재생 불가');
 for(const status of ['verified','unverified','unavailable'])assert.doesNotMatch(client.directoryStatusLabel(status),/LIVE|실시간 재생 중|검증 완료/);
});
function hookHarness(){
 const state=[],requests=[],queue=[];let cursor=0,previousDeps,effect,cleanup,value;
 const react={useState:initial=>{const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],next=>{state[i]=typeof next==='function'?next(state[i]):next}]},useEffect:(fn,deps)=>{if(!previousDeps||deps.some((v,i)=>v!==previousDeps[i])){effect=fn;previousDeps=deps}}};
 const hook=load('../hooks/useCctvDirectory.ts',{react},{AbortController,fetch:(url,options)=>{requests.push({url,options});return queue.shift()()}});
 const render=()=>{cursor=0;value=hook.useCctvDirectory();if(effect){cleanup?.();const fn=effect;effect=undefined;cleanup=fn()}return value};
 return{queue,requests,render,stop:()=>cleanup?.(),flush:async()=>{await new Promise(r=>setImmediate(r));return render()}};
}
const response=(status,entries)=>({ok:status===200,json:async()=>entries});
test('directory hook reads one independent projection with all statuses and null coordinates intact',async()=>{
 const entries=Array.from({length:57},(_,i)=>({id:`place_${i}`,visible:true,playbackStatus:i%2?'unavailable':'unverified',lat:i<3?null:33.4,lng:i<3?null:126.5}));
 const h=hookHarness();h.queue.push(()=>Promise.resolve(response(200,{entries})));assert.equal(h.render().loading,true);const result=await h.flush();assert.equal(result.entries,entries);assert.equal(result.entries.length,57);assert.equal(result.entries.filter(e=>e.lat===null).length,3);assert.equal(result.error,null);assert.equal(result.loading,false);assert.equal(h.requests.length,1);assert.equal(h.requests[0].url,'/api/cctv-directory');assert.equal(h.requests[0].options.cache,'no-store');h.stop();assert.equal(h.requests[0].options.signal.aborted,true);
});
test('directory hook HTTP and malformed results clear entries and expose error; explicit refresh retries',async()=>{
 for(const reply of [response(503,{}),response(200,{entries:'wrong'})]){
  const h=hookHarness();h.queue.push(()=>Promise.resolve(reply));h.render();let result=await h.flush();assert.equal(result.entries.length,0);assert.ok(result.error);assert.equal(result.loading,false);
  h.queue.push(()=>Promise.resolve(response(200,{entries:[]})));result.refresh();result=h.render();assert.equal(result.loading,true);result=await h.flush();assert.equal(result.error,null);assert.equal(result.loading,false);assert.equal(h.requests.length,2);h.stop();
 }
});
test('directory hook ignores unmounted and superseded responses, preventing stale catalogue resurrection',async()=>{
 const h=hookHarness();let resolveOld;h.queue.push(()=>new Promise(resolve=>{resolveOld=resolve}));let value=h.render();h.queue.push(()=>Promise.resolve(response(200,{entries:[{id:'new'}]})));value.refresh();h.render();value=await h.flush();assert.equal(value.entries[0].id,'new');assert.equal(h.requests[0].options.signal.aborted,true);resolveOld(response(200,{entries:[{id:'stale'}]}));value=await h.flush();assert.equal(value.entries[0].id,'new');
 let resolveLast;h.queue.push(()=>new Promise(resolve=>{resolveLast=resolve}));value.refresh();h.render();h.stop();resolveLast(response(200,{entries:[{id:'after-unmount'}]}));value=await h.flush();assert.equal(value.entries.length,0);assert.equal(h.requests.at(-1).options.signal.aborted,true);
});
