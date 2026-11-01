import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { loadPlaybackTarget } from './helpers/load-playback-target.mjs';
const paths = { home:'../components/cctv/HomeCctvSection.tsx',mypage:'../app/mypage/page.tsx',map:'../components/biz/minihompy/JejuMap.tsx' };
const camera = {id:'allowed',name:'Allowed',active:true,originUrl:'http://source.example.test/a',category:'해변',region:'제주',lat:33.4,lng:126.5};
const nodes=v=>!v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children)];
function harness(kind, inventory, favorites=new Set(), initialState={}) {
 const source=readFileSync(new URL(paths[kind],import.meta.url),'utf8');const jsx=(type,props,key)=>({type,props,key});
 const state=[];let cursor=0,pending=false,subscriptions=0;
 const deps={};
 // Component imports are opaque leaves; no external library/network is executed.
 for(const match of source.matchAll(/import\s+\{([^}]+)\}\s+from\s+"([^"]+)"/g))deps[match[2]]=Object.fromEntries(match[1].split(',').map(n=>[n.trim(),n.trim()]));
 Object.assign(deps,{
  'react/jsx-runtime':{jsx,jsxs:jsx},
  react:{useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:()=>({current:null}),useState(initial){const i=cursor++;if(!(i in state))state[i]=i in initialState?initialState[i]:initial;return[state[i],next=>{const val=typeof next==='function'?next(state[i]):next;if(!Object.is(val,state[i])){state[i]=val;pending=true}}]}},
  'next/link':{default:'Link'},'leaflet/dist/leaflet.css':{},
  '@/hooks/usePublicCctvs':{usePublicCctvs:()=>{subscriptions++;return inventory}},
  '@/hooks/useCctvFavorite':{useCctvFavorite:()=>({favoriteIds:favorites})},
  '@/hooks/useAuth':{useAuth:()=>({user:{uid:'test',displayName:'Test'},loading:false})},
  '@/hooks/useMySpot':{useMySpot:()=>({spotIds:new Set()})},
  '@/lib/entitlements':{getEntitlements:()=>({planLabel:'Test'})},
  '@/lib/cctv-playback-target':loadPlaybackTarget(),
  './minimi-config':{MINIMI:{},MINIMI_ORDER:[],ROOM_CONCEPTS:{},ROOM_ORDER:[]},
 });
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const mod={exports:{}};vm.runInNewContext(code,{module:mod,exports:mod.exports,process:{env:{}},require:name=>{assert.ok(name in deps, name);return deps[name]}});
 return {render(props={}){let tree,attempts=0;do{assert.ok(attempts++<5);pending=false;cursor=0;tree=(mod.exports.default??mod.exports.HomeCctvSection??mod.exports.JejuMap)(props)}while(pending);return tree},subscriptions:()=>subscriptions,state};
}
for(const kind of ['home','mypage']) {
 test(`${kind}: only current public inventory reaches list; favorites remain intact`,()=>{
  const favorites=new Set(['allowed','hidden']);const app=harness(kind,{cctvs:[camera],loading:false,error:null},favorites);
  const all=nodes(app.render());const list=all.find(n=>n.type==='CctvList');assert.ok(list);assert.deepEqual(list.props.cctvs.map(c=>c.id),['allowed']);
  assert.equal(app.subscriptions(),1);assert.equal(favorites.size,2);assert.equal(favorites.has('hidden'),true);
  assert.equal(all.some(n=>n.type==='HlsMiniPlayer'),false);
  assert.equal(all.some(n=>n.props?.href==='/cctv/multiview'),false);
 });
 test(`${kind}: empty loading/error inventories never render mock or stale players`,()=>{
  for(const inventory of [{cctvs:[],loading:false,error:null},{cctvs:[camera],loading:true,error:null},{cctvs:[camera],loading:false,error:'unavailable'}]) {
   const all=nodes(harness(kind,inventory,new Set(['allowed'])).render());assert.equal(all.some(n=>n.type==='CctvList'||n.type==='HlsMiniPlayer'),false);assert.ok(all.some(n=>n.props?.role==='status'));
  }
 });
}
test('business map ignores hardcoded camera props; stale/HTTP selection cannot autoplay a mini player',()=>{
 for(const inventory of [{cctvs:[],loading:false,error:null},{cctvs:[camera],loading:false,error:null},{cctvs:[camera],loading:false,error:'bad'}]) {
  const app=harness('map',inventory,new Set(),{4:{kind:'cctv',id:'allowed',title:'Old',sub:'Old',href:'/cctv/allowed',cta:'Open'}});
  const all=nodes(app.render({cctv:[camera],food:[]}));assert.equal(all.some(n=>n.type==='HlsMiniPlayer'||n.type==='CameraDialog'),false);assert.equal(app.state[4],null);
 }
});
test('business map HTTPS selection uses current shared dialog while non-CCTV selection survives empty inventory',()=>{
 const https={...camera,originUrl:'https://source.example.test/a'};
 const selected={kind:'cctv',id:'allowed',title:'Old',sub:'Old',href:'/cctv/allowed',cta:'Open'};
 const app=harness('map',{cctvs:[https],loading:false,error:null},new Set(),{4:selected});
 assert.equal(nodes(app.render()).find(n=>n.type==='CameraDialog').props.camera.name,'Allowed');
 const food={kind:'food',title:'Restaurant',sub:'Address',href:'/food/test',cta:'Food'};
 const foodApp=harness('map',{cctvs:[],loading:false,error:null},new Set(),{4:food});
 const all=nodes(foodApp.render());assert.equal(foodApp.state[4],food);assert.ok(all.some(n=>n.type==='a'&&n.props.href==='/food/test'));
});
test('secondary public sources no longer import mock inventory or mini autoplay; map marker opens HTTP synchronously',()=>{
 for(const path of Object.values(paths)){const source=readFileSync(new URL(path,import.meta.url),'utf8');assert.match(source,/usePublicCctvs/);assert.doesNotMatch(source,/mockCctvs|HlsMiniPlayer|forcePlay/)}
 const map=readFileSync(new URL(paths.map,import.meta.url),'utf8');assert.match(map,/if \(requiresExternalPlayback\(c\)\) \{ setSel\(null\); openCameraWatch\(c\);/);
 assert.match(map,/href=\{cameraWatchUrl\(externalCamera\)\} target="_blank" rel="noopener noreferrer"/);
});
