import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as viewerPolicy from '../lib/cctv-viewer-policy.ts';
function harness({ origin='https://funjeju.com',topLevel=true,server=false,now=Date.now() }={}) {
  const timers=new Map(), listeners=new Map();let nextTimer=0,subscribe,notifications=0;
  const self={};const window={self,top:topLevel?self:{},location:{origin},
    setTimeout:(callback,delay)=>{timers.set(++nextTimer,{callback,delay});return nextTimer},clearTimeout:id=>timers.delete(id),
    addEventListener:(event,callback)=>listeners.set(`window:${event}`,callback),removeEventListener:event=>listeners.delete(`window:${event}`)};
  const document={addEventListener:(event,callback)=>listeners.set(`document:${event}`,callback),removeEventListener:event=>listeners.delete(`document:${event}`)};
  const jsx=(type,props,key)=>({type,props,key});
  const deps={ 'react/jsx-runtime':{jsx,jsxs:jsx}, react:{useSyncExternalStore:(s,get,getServer)=>{subscribe=s;return server?getServer():get()}}, '@/components/cctv/HlsPlayer':{HlsPlayer:'HlsPlayer'}, '@/components/cctv/VurixLaunch':{VurixLaunch:'VurixLaunch'},'@/lib/cctv-viewer-policy':viewerPolicy };
  const code=ts.transpileModule(readFileSync(new URL('../components/cctv/HttpsCameraWindow.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const mod={exports:{}}; vm.runInNewContext(code,{module:mod,exports:mod.exports,window,document,Date:class extends Date{static now(){return now}},URL,require:name=>{assert.ok(name in deps,name);return deps[name]},fetch:()=>{throw Error('No source request permitted')}});
  return {render:mod.exports.HttpsCameraWindow,timers,listeners,setNow:value=>{now=value},mount:()=>subscribe(()=>notifications++),notifications:()=>notifications};
}
const camera={id:'jeju_airport',name:'제주공항',sourceRevision:'revision-a',proxyUrl:'https://approved-proxy.example.test/cctv/jeju_airport',dedicated:true,playbackAllowed:true};
const nodes=v=>!v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children)];
test('legacy detail remains launch-only; query params cannot activate the player',()=>{
  const all=nodes(harness().render({...camera,dedicated:false}));assert.equal(all.some(n=>n.type==='HlsPlayer'),false);assert.ok(all.some(n=>n.type==='VurixLaunch'));
  assert.doesNotMatch(readFileSync(new URL('../components/cctv/HttpsCameraWindow.tsx',import.meta.url),'utf8'),/useSearchParams|watch=1/);
});
test('approved top-level dedicated surface uses only server proxy when gate allows',()=>{
  for(const origin of ['https://funjeju.com','https://www.funjeju.com','https://funjejuv2.vercel.app']){
    const all=nodes(harness({origin}).render(camera));const player=all.find(n=>n.type==='HlsPlayer');assert.ok(player);assert.equal(player.props.proxyUrl,camera.proxyUrl);assert.equal(all.some(n=>n.type==='VurixLaunch'),false);
  }
});
test('preview/insecure/lookalike/frame never mounts player or redirects to legacy production',()=>{
  for(const options of [{origin:'https://preview.vercel.app'},{origin:'https://funjeju.com.evil.test'},{origin:'http://funjeju.com'},{topLevel:false}]){
    const all=nodes(harness(options).render(camera));assert.equal(all.some(n=>n.type==='HlsPlayer'||n.type==='VurixLaunch'||n.type==='a'),false);assert.ok(all.some(n=>n.props?.['data-watch-state']==='awaiting-approved-origin'));
  }
});
test('unverified and unavailable proxy inputs fail closed even at approved origin',()=>{
  for(const playbackAllowed of [undefined,false])assert.equal(nodes(harness().render({...camera,playbackAllowed})).some(n=>n.type==='HlsPlayer'),false);
  for(const proxyUrl of [null,'http://proxy.example.test/camera','https://user:secret@proxy.example.test/camera','https://proxy.example.test/camera?url=evil','bad'])assert.equal(nodes(harness().render({...camera,proxyUrl})).some(n=>n.type==='HlsPlayer'),false);
});
test('server snapshot never mounts media; source revision changes remount but labels do not',()=>{
  assert.equal(nodes(harness({server:true}).render(camera)).some(n=>n.type==='HlsPlayer'),false);
  const h=harness(),key=c=>nodes(h.render(c)).find(n=>n.type==='HlsPlayer').key;
  assert.equal(key(camera),key({...camera,name:'Updated'}));assert.notEqual(key(camera),key({...camera,sourceRevision:'revision-b'}));
});
test('explicit live exact-host QA approval mounts only verified HTTPS media and omits event/session identity',()=>{
  const now=Date.now(),origin='https://qa-build.example.vercel.app';
  // Nested/unrelated suffixes are not accepted as a Vercel deployment hostname.
  assert.equal(nodes(harness({origin,now}).render({...camera,previewApproval:{origin,approvedAt:now-1,expiresAt:now+1000}})).some(n=>n.type==='HlsPlayer'),false);
  const approvedOrigin='https://qa-build-project.vercel.app',approval={origin:approvedOrigin,approvedAt:now-1,expiresAt:now+1000};
  const h=harness({origin:approvedOrigin,now});
  const player=nodes(h.render({...camera,previewApproval:approval})).find(n=>n.type==='HlsPlayer');
  assert.ok(player);assert.equal(player.props.proxyUrl,camera.proxyUrl);assert.equal(player.props.cctvId,undefined);assert.equal(player.props.cctvName,undefined);assert.equal(player.props.verificationMode,true);
  for(const options of [{origin:'https://other-build.vercel.app',now},{origin:approvedOrigin,topLevel:false,now},{origin:approvedOrigin,server:true,now}])assert.equal(nodes(harness(options).render({...camera,previewApproval:approval})).some(n=>n.type==='HlsPlayer'),false);
  for(const override of [{playbackAllowed:false},{proxyUrl:'http://proxy.example.test/camera'},{proxyUrl:'https://proxy.example.test/camera?source=other'}])assert.equal(nodes(h.render({...camera,previewApproval:approval,...override})).some(n=>n.type==='HlsPlayer'),false);
  assert.equal(nodes(harness({now}).render(camera)).find(n=>n.type==='HlsPlayer').props.cctvId,camera.id);
  assert.equal(nodes(harness({now}).render(camera)).find(n=>n.type==='HlsPlayer').props.verificationMode,false);
});
test('an open QA viewer expires without a rerender trigger and removes timers/listeners on cleanup',()=>{
  const now=Date.now(),origin='https://qa-build-project.vercel.app';
  const previewApproval={origin,approvedAt:now-100,expiresAt:now+1000};
  const h=harness({origin,now});assert.ok(nodes(h.render({...camera,previewApproval})).some(n=>n.type==='HlsPlayer'));
  const cleanup=h.mount();assert.equal(h.timers.size,1);assert.equal(h.listeners.size,2);
  const timer=[...h.timers.values()][0];assert.equal(timer.delay,1001);
  h.setNow(now+1001);timer.callback();assert.equal(h.notifications(),1);
  assert.equal(nodes(h.render({...camera,previewApproval})).some(n=>n.type==='HlsPlayer'),false);
  cleanup();assert.equal(h.timers.size,0);assert.equal(h.listeners.size,0);
});
