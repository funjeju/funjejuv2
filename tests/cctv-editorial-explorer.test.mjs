import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { filterCctvs } from '../lib/cctv-explorer.ts';
import { loadPlaybackTarget } from './helpers/load-playback-target.mjs';
const a={id:'a',name:'해변 A',region:'제주시',direction:'북',category:'해변',description:'바다',active:true};
const b={id:'b',name:'산 B',region:'서귀포시',direction:'남',category:'산',description:'한라산',active:true};
function harness(search='',state={cctvs:[a,b],loading:false,error:null}) {
 const jsx=(type,props)=>({type,props});let replaced;
 const stubs={'react/jsx-runtime':{jsx,jsxs:jsx},'next/navigation':{useSearchParams:()=>new URLSearchParams(search)},'next/image':{default:'image'},'next/link':{default:'link'},'lucide-react':new Proxy({},{get:(_,name)=>String(name)}),'@/components/cctv/CctvList':{CctvList:'list'},'@/components/cctv/CctvMap':{CctvMap:'map'},'@/hooks/useCctvs':{useCctvs:()=>state},'@/lib/cctv-explorer':{filterCctvs},'@/lib/cctv-playback-target':loadPlaybackTarget()};
 const code=ts.transpileModule(readFileSync(new URL('../components/cctv/CctvExplorer.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(code,{module:mod,exports:mod.exports,URLSearchParams,window:{history:{replaceState:(_a,_b,url)=>{replaced=url}},location:{pathname:'/cctv'},matchMedia:()=>({matches:true})},document:{getElementById:()=>({scrollIntoView:()=>{}})},require:name=>{assert.ok(name in stubs,`Unexpected ${name}`);return stubs[name]}});
 const tree=mod.exports.CctvExplorer();
 function nodes(value){if(!value||typeof value!=='object')return[];if(Array.isArray(value))return value.flatMap(nodes);return [value,...nodes(value.props?.children)]}
 return {all:nodes(tree),url:()=>replaced};
}
test('editorial launch preserves active inventory without requiring new health metadata',()=>{
 const h=harness('',{cctvs:[a,b,{...a,id:'disabled',active:false}],loading:false,error:null});
 assert.deepEqual(h.all.find(n=>n.type==='list').props.cctvs.map(c=>c.id),['a','b']);
});
test('search/direction remain URL-backed and preserve other filters',()=>{
 const h=harness('q=바다&view=map');const north=h.all.find(n=>n.type==='button'&&n.props['aria-pressed']===false&&n.props.children?.[0]?.props?.children==='북쪽');
 north.props.onClick();const url=new URL(h.url(),'https://example.test');assert.equal(url.searchParams.get('q'),'바다');assert.equal(url.searchParams.get('view'),'map');assert.equal(url.searchParams.get('direction'),'북');
});
test('map and list controls have accessible names independent of hidden mobile spans',()=>{
 const h=harness();for(const name of ['목록','지도']){const n=h.all.find(n=>n.type==='button'&&n.props['aria-label']===name);assert.ok(n);assert.equal(n.props.children[0].props['aria-hidden'],'true')}
});
test('map query renders map and filtered camera list only',()=>{
 const h=harness('view=map&direction=남');assert.equal(h.all.some(n=>n.type==='list'),false);assert.deepEqual(h.all.find(n=>n.type==='map').props.cctvs.map(c=>c.id),['b']);
});
test('inventory errors never render stale cameras and empty filters offer reset',()=>{
 const err=harness('',{cctvs:[a],loading:false,error:'offline'});assert.ok(err.all.some(n=>n.props?.role==='alert'));assert.equal(err.all.some(n=>n.type==='list'),false);
 const empty=harness('q=not-found');const reset=empty.all.find(n=>n.type==='button'&&n.props.children?.[0]==='전체 카메라 보기 ');assert.ok(reset);reset.props.onClick();assert.equal(empty.url(),'/cctv');
});
test('hero image explicitly distinguishes scenic photograph from current CCTV',()=>{
 const h=harness();assert.ok(h.all.some(n=>n.type==='p'&&n.props.children==='풍경 이미지 · 현재 CCTV 화면이 아닙니다'));
 const photo=h.all.find(n=>n.props?.src==='/cctv-editorial/seongsan-coast.jpg');assert.ok(photo.props.priority);assert.ok(h.all.some(n=>n.props?.href==='https://creativecommons.org/licenses/by-sa/4.0/'));
});
test('public explorer hides multiview promotion while retaining list and map',()=>{
 const h=harness();assert.equal(h.all.some(n=>n.props?.href==='/cctv/multiview'),false);
 assert.equal(h.all.some(n=>n.props?.className==='editorial-multiview'),false);
});
test('public header hides multiview without removing legacy route implementation',()=>{
 const jsx=(type,props)=>({type,props});
 const stubs={'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':{default:'link'},'next/navigation':{usePathname:()=>'/cctv'},'lucide-react':new Proxy({},{get:(_,name)=>String(name)}),'@/components/common/AuthButton':{AuthButton:'auth'},'@/components/common/LangSwitcher':{LangSwitcher:'language'}};
 const code=ts.transpileModule(readFileSync(new URL('../components/common/CctvHeader.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const mod={exports:{}};vm.runInNewContext(code,{module:mod,exports:mod.exports,require:name=>{assert.ok(name in stubs,name);return stubs[name]}});
 const nodes=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(nodes):[value,...nodes(value.props?.children)];
 const all=nodes(mod.exports.CctvHeader());
 assert.equal(all.some(n=>n.props?.href==='/cctv/multiview'),false);
 for(const href of ['/cctv','/cctv?view=map','/search'])assert.ok(all.some(n=>n.props?.href===href));
 assert.ok(all.some(n=>n.type==='auth'));assert.ok(all.some(n=>n.type==='language'));
 assert.ok(readFileSync(new URL('../app/cctv/multiview/page.tsx',import.meta.url),'utf8').includes('export default'));
});

test('quick links use only existing active ordinary-HTTP cameras and actual canonical new-window URLs',()=>{
 const airport={...a,id:'jeju_airport',name:'제주공항',originUrl:'http://example.test/a'};
 const summit={...b,id:'halla_baengnokdam',name:'백록담',originUrl:'http://example.test/b'};
 const state={cctvs:[airport,summit],loading:false,error:null};
 const h=harness('',state);const links=h.all.filter(n=>n.type==='a'&&n.props.href?.includes('?watch=1'));
 assert.deepEqual(links.map(n=>n.props.href),['https://funjeju.com/cctv/jeju_airport?watch=1','https://funjeju.com/cctv/halla_baengnokdam?watch=1']);
 for(const link of links){assert.equal(link.props.target,'_blank');assert.equal(link.props.rel,'noopener noreferrer')}
 for(const cctvs of [[],[{...airport,active:false}],[{...airport,youtubeId:'video'}],[{...airport,originUrl:'https://example.test/a'}]])assert.equal(harness('',{...state,cctvs}).all.some(n=>n.props?.href?.includes('?watch=1')),false);
 assert.equal(harness('q=바다',state).all.some(n=>n.props?.['aria-label']==='자주 찾는 풍경 새 창 보기'),false);
 assert.equal(harness('',{...state,error:'unavailable'}).all.some(n=>n.props?.href?.includes('?watch=1')),false);
});
