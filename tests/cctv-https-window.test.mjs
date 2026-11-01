import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function harness({ origin='https://funjeju.com',topLevel=true,server=false }={}) {
  const self={};const window={self,top:topLevel?self:{},location:{origin}};
  const jsx=(type,props,key)=>({type,props,key});
  const deps={ 'react/jsx-runtime':{jsx,jsxs:jsx}, react:{useSyncExternalStore:(_s,get,getServer)=>server?getServer():get()}, '@/components/cctv/HlsPlayer':{HlsPlayer:'HlsPlayer'}, '@/components/cctv/VurixLaunch':{VurixLaunch:'VurixLaunch'} };
  const code=ts.transpileModule(readFileSync(new URL('../components/cctv/HttpsCameraWindow.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const mod={exports:{}}; vm.runInNewContext(code,{module:mod,exports:mod.exports,window,URL,require:name=>{assert.ok(name in deps,name);return deps[name]},fetch:()=>{throw Error('No source request permitted')}});
  return {render:mod.exports.HttpsCameraWindow};
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
