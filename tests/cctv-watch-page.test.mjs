import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const jsx=(type,props,key)=>({type,props,key});
function load(path,deps,env={}){
 const mod={exports:{}};const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{module:mod,exports:mod.exports,process:{env},require:name=>{assert.ok(name in deps,name);return deps[name]}});return mod.exports;
}
const nodes=v=>!v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children)];
const entry={id:'test_camera',name:'Test camera',active:true,originUrl:'http://source.example.test/private'};
function route(result={state:'found',entry},allowed=true){
 let reads=0;
 const mod=load('../app/cctv/watch/[id]/page.tsx',{'react/jsx-runtime':{jsx,jsxs:jsx},'@/lib/firestore-cctv-server':{lookupCctvById:async()=>{reads++;return result}},'@/lib/cctv-review':{cctvSourceRevision:()=> 'hash'},'@/lib/cctv-playback-target':{requiresDirectHttpViewer:c=>c.id==='legacy'},'@/lib/cctv-launch-policy':{isLaunchCameraVisible:async()=>allowed},'@/components/cctv/PublicPlaybackBoundary':{PublicPlaybackBoundary:'PublicPlaybackBoundary'},'@/components/cctv/HttpsCameraWindow':{HttpsCameraWindow:'HttpsCameraWindow'}},{NEXT_PUBLIC_WORKER_URL:'https://proxy.example.test'});
 return {render:(id='test_camera')=>mod.default({params:Promise.resolve({id})}),reads:()=>reads};
}
test('dedicated route selects authoritative server proxy, never serializes raw source or query overrides',async()=>{
 const r=route();const all=nodes(await r.render());const player=all.find(n=>n.type==='HttpsCameraWindow');assert.ok(player);
 assert.equal(player.props.proxyUrl,'https://proxy.example.test/cctv/test_camera');assert.equal(player.props.dedicated,true);assert.equal(player.props.playbackAllowed,true);assert.equal('originUrl' in player.props,false);assert.equal(r.reads(),1);
 const boundary=all.find(n=>n.type==='PublicPlaybackBoundary');assert.equal(boundary.props.id,entry.id);assert.equal(boundary.props.sourceRevision,'hash');assert.equal('originUrl' in boundary.props,false);
});
test('gate deny stays false; unavailable missing inactive and legacy never get player surface',async()=>{
 assert.equal(nodes(await route(undefined,false).render()).find(n=>n.type==='HttpsCameraWindow').props.playbackAllowed,false);
 for(const result of [{state:'missing'},{state:'unavailable'},{state:'found',entry:{...entry,active:false}},{state:'found',entry:{...entry,id:'legacy'}},{state:'found',entry:{...entry,youtubeId:'video'}}])assert.equal(nodes(await route(result).render()).some(n=>n.type==='HttpsCameraWindow'),false);
 const r=route();await r.render('../bad');assert.equal(r.reads(),0);
});
test('watch AppShell has no site header, chat, navigation or weather surface',()=>{
 const deps={'react/jsx-runtime':{jsx,jsxs:jsx},'next/navigation':{usePathname:()=>'/cctv/watch/test_camera'},'@/hooks/usePageViewTracker':{usePageViewTracker:()=>{}},'@/lib/i18n':{LangProvider:'LangProvider'},'@/constants/public-features':{CCTV_FOCUSED_PUBLIC:true}};
 for(const name of ['Sidebar','AppHeader','BottomNavigation','FloatingChat','ServiceNoticePopup','CctvHeader'])deps[`@/components/common/${name}`]={[name]:name};
 const mod=load('../components/common/AppShell.tsx',deps);const all=nodes(mod.AppShell({children:'video'}));
 assert.ok(all.some(n=>n.type==='main'));assert.equal(all.some(n=>['Sidebar','AppHeader','BottomNavigation','FloatingChat','ServiceNoticePopup','CctvHeader'].includes(n.type)),false);
});
