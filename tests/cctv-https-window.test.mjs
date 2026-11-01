import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness({ query='',origin='https://funjeju.com',topLevel=true,server=false }={}) {
  let search=query;const location={origin};const self={};const window={self,top:topLevel?self:{},location};
  const jsx=(type,props,key)=>({type,props,key});
  const deps={
    'react/jsx-runtime':{jsx,jsxs:jsx},
    react:{Suspense:'Suspense',useSyncExternalStore:(_subscribe,get,getServer)=>server?getServer():get()},
    'next/navigation':{useSearchParams:()=>new URLSearchParams(search)},
    '@/components/cctv/HlsPlayer':{HlsPlayer:'HlsPlayer'},
    '@/components/cctv/VurixLaunch':{VurixLaunch:'VurixLaunch'},
  };
  const code=ts.transpileModule(readFileSync(new URL('../components/cctv/HttpsCameraWindow.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const mod={exports:{}};
  vm.runInNewContext(code,{module:mod,exports:mod.exports,window,URL,URLSearchParams,require:name=>{assert.ok(name in deps,name);return deps[name]},fetch:()=>{throw Error('No source request permitted in test')}});
  return {render(camera){const boundary=mod.exports.HttpsCameraWindow(camera);assert.equal(boundary.type,'Suspense');const inner=boundary.props.children;return inner.type(inner.props)},setSearch:s=>{search=s},location,window};
}
const camera={id:'jeju_airport',name:'제주공항',originUrl:'http://existing.test/camera.m3u8',proxyUrl:'https://approved-proxy.example.test/cctv/jeju_airport'};
const nodes=v=>!v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children)];

test('normal detail launches separate window and does not mount proxy player',()=>{
  const all=nodes(harness().render(camera));assert.equal(all.some(n=>n.type==='HlsPlayer'),false);assert.ok(all.some(n=>n.type==='VurixLaunch'&&n.props.originUrl===camera.originUrl));
});
test('approved top-level watch mode uses original HTTPS proxy without popup recursion',()=>{
  for(const origin of ['https://funjeju.com','https://www.funjeju.com','https://funjejuv2.vercel.app']){
    const all=nodes(harness({query:'watch=1',origin}).render(camera));const player=all.find(n=>n.type==='HlsPlayer');assert.ok(player);assert.equal(player.props.proxyUrl,camera.proxyUrl);assert.equal(player.props.cctvId,camera.id);assert.equal(all.some(n=>n.type==='VurixLaunch'),false);
  }
});
test('preview/lookalike/insecure origins and embedded frames never request the proxy',()=>{
  for(const options of [{origin:'https://preview.vercel.app'},{origin:'https://funjeju.com.evil.test'},{origin:'http://funjeju.com'},{topLevel:false}]){
    const all=nodes(harness({query:'watch=1',...options}).render(camera));assert.equal(all.some(n=>n.type==='HlsPlayer'),false);assert.ok(all.some(n=>n.type==='VurixLaunch'));
  }
});
test('absent insecure or credential-bearing proxy shows error rather than raw-source fallback',()=>{
  for(const proxyUrl of [null,'http://proxy.example.test/camera','https://user:secret@proxy.example.test/camera','bad']){
    const all=nodes(harness({query:'watch=1'}).render({...camera,proxyUrl}));assert.equal(all.some(n=>n.type==='HlsPlayer'),false);assert.equal(all.some(n=>n.type==='VurixLaunch'),false);assert.ok(all.some(n=>n.props?.role==='status'));
  }
});
test('watch query cannot override server-selected media; ordinary queries remain launch-only',()=>{
  const h=harness({query:'watch=1&url=https://attacker.test&source=http://attacker.test'});assert.equal(nodes(h.render(camera)).find(n=>n.type==='HlsPlayer').props.proxyUrl,camera.proxyUrl);
  for(const query of ['watch=true','watch=0','url=https://attacker.test','']){h.setSearch(query);assert.equal(nodes(h.render(camera)).some(n=>n.type==='HlsPlayer'),false)}
});
test('server snapshot avoids browser access and defers playback until approved hydration',()=>{
  const all=nodes(harness({query:'watch=1',server:true}).render(camera));assert.equal(all.some(n=>n.type==='HlsPlayer'),false);
});
test('source/proxy changes remount but metadata edits preserve the player identity',()=>{
  const h=harness({query:'watch=1'});const key=c=>nodes(h.render(c)).find(n=>n.type==='HlsPlayer').key;
  assert.equal(key(camera),key({...camera,name:'Updated label'}));assert.notEqual(key(camera),key({...camera,originUrl:'http://existing.test/other'}));assert.notEqual(key(camera),key({...camera,proxyUrl:'https://approved-proxy.example.test/other'}));
});
