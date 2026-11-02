import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { filterCctvs } from '../lib/cctv-explorer.ts';
import { loadPlaybackTarget } from './helpers/load-playback-target.mjs';
const a={id:'a',name:'해변 A',region:'제주시',direction:'북',category:'해변',description:'바다',active:true};
const b={id:'b',name:'산 B',region:'서귀포시',direction:'남',category:'산',description:'한라산',active:true};
function nodes(value){if(!value||typeof value!=='object')return[];if(Array.isArray(value))return value.flatMap(nodes);return[value,...nodes(value.props?.children)]}
function text(value){if(value==null||typeof value==='boolean')return'';if(typeof value!=='object')return String(value);if(Array.isArray(value))return value.map(text).join(' ');return text(value.props?.children)}
function harness(search='',state={cctvs:[a,b],loading:false,error:null},selected=null){
 const jsx=(type,props)=>({type,props});let replaced,selection=selected,scrolled,effect,effectDeps;const ref={current:null};
 const stubs={react:{useState:()=>[selection,v=>{selection=v}],useRef:()=>ref,useEffect:(fn,deps)=>{if(!effectDeps||deps.some((v,i)=>v!==effectDeps[i])){effectDeps=deps;effect=fn}}},'@/constants/cctv-launch-observations':{CCTV_LAUNCH_OBSERVATIONS:[{observedAt:'2026-11-01T16:32:47.392Z'}]},'react/jsx-runtime':{jsx,jsxs:jsx},'next/navigation':{useSearchParams:()=>new URLSearchParams(search)},'next/link':{default:'link'},'lucide-react':new Proxy({},{get:(_,name)=>String(name)}),'@/components/cctv/CctvList':{CctvList:'list'},'@/components/cctv/CctvMap':{CctvMap:'map'},'@/hooks/usePublicCctvs':{usePublicCctvs:()=>state},'@/lib/cctv-explorer':{filterCctvs},'@/lib/cctv-playback-target':loadPlaybackTarget()};
 const code=ts.transpileModule(readFileSync(new URL('../components/cctv/CctvExplorer.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const mod={exports:{}};vm.runInNewContext(code,{module:mod,exports:mod.exports,URLSearchParams,window:{history:{replaceState:(_a,_b,url)=>{replaced=url;search=url.split('?')[1]||''}},location:{pathname:'/cctv'},matchMedia:()=>({matches:true})},document:{getElementById:id=>({scrollIntoView:options=>{scrolled={id,...options}}})},require:name=>{assert.ok(name in stubs,`Unexpected ${name}`);return stubs[name]}});
 const render=()=>{const result=nodes(mod.exports.CctvExplorer());if(effect){const fn=effect;effect=undefined;fn()}return result};
 return{all:render(),render,url:()=>replaced,selection:()=>selection,scroll:()=>scrolled};
}
test('design3 renders compact list and real map together from one filtered public inventory',()=>{
 const h=harness('',{cctvs:[a,b,{...a,id:'disabled',active:false}],loading:false,error:null});const list=h.all.find(n=>n.type==='list'),map=h.all.find(n=>n.type==='map');
 assert.equal(list.props.variant,'compact');assert.equal(map.props.compact,true);assert.equal(list.props.cctvs,map.props.cctvs);assert.deepEqual(list.props.cctvs.map(c=>c.id),['a','b']);assert.ok(h.all.some(n=>n.type==='h1'&&text(n).includes('바람의 좌표')));assert.ok(h.all.some(n=>n.type==='aside'&&n.props['aria-label']==='지역 탐색'));
});
test('sidebar direction and search remain URL-backed and preserve other filters',()=>{
 const h=harness('q=바다&view=map');h.all.find(n=>n.type==='button'&&text(n).includes('NORTH')).props.onClick();const url=new URL(h.url(),'https://example.test');assert.equal(url.searchParams.get('q'),'바다');assert.equal(url.searchParams.get('view'),'map');assert.equal(url.searchParams.get('direction'),'북');h.all.find(n=>n.type==='input').props.onChange({target:{value:'제주'}});assert.equal(new URL(h.url(),'https://example.test').searchParams.get('q'),'제주');
});
test('view controls retain mobile names and scroll only after committed panel reorder',()=>{
 const h=harness();for(const label of ['목록','지도']){const n=h.all.find(n=>n.type==='button'&&n.props['aria-label']===label);assert.ok(n);assert.equal(n.props.children[0].props['aria-hidden'],'true')}
 h.all.find(n=>n.type==='button'&&n.props['aria-label']==='지도').props.onClick();assert.equal(h.url(),'/cctv?view=map');assert.equal(h.scroll(),undefined);h.render();assert.deepEqual(h.scroll(),{id:'wind-map-panel',behavior:'auto',block:'start'});
 const css=readFileSync(new URL('../app/cctv-wind.css',import.meta.url),'utf8');assert.match(css,/data-view="map"\]\s+\.wind-map-column\s*\{\s*order:\s*-1/);assert.doesNotMatch(css,/\.wind-map-column\s*\{[^}]*display:\s*none/);
});
test('map focus preserves both filtered panels and exposes chosen view',()=>{const h=harness('view=map&direction=남');assert.deepEqual(h.all.find(n=>n.type==='map').props.cctvs.map(c=>c.id),['b']);assert.ok(h.all.some(n=>n.type==='list'));assert.ok(h.all.some(n=>n.props?.['data-view']==='map'))});
test('loading/error/empty inventory never renders stale panels or quicklinks',()=>{
 for(const state of [{cctvs:[a],loading:false,error:'offline'},{cctvs:[a],loading:true,error:null},{cctvs:[],loading:false,error:null}]){const h=harness('',state);assert.equal(h.all.some(n=>['list','map'].includes(n.type)),false);assert.equal(h.all.some(n=>n.props?.href?.startsWith('/cctv/watch/')),false)}const h=harness('q=not-found');h.all.find(n=>n.type==='button'&&text(n).includes('전체 카메라 보기')).props.onClick();assert.equal(h.url(),'/cctv');
});
test('selection clears on filter/source removal and metadata callback preserves continuity',()=>{
 const h=harness();h.all.find(n=>n.type==='list').props.onCameraOpen(b);assert.equal(h.selection(),'b');h.all.find(n=>n.type==='map').props.onCameraOpen('a');assert.equal(h.selection(),'a');assert.equal(harness('direction=남',{cctvs:[a,b],loading:false,error:null},'a').selection(),null);assert.equal(harness('',{cctvs:[a],loading:false,error:'offline'},'a').selection(),null);assert.equal(harness('',{cctvs:[{...a,name:'rename'}],loading:false,error:null},'a').selection(),'a');
});
test('selected view panel mounts no inline media or raw source',()=>{
 const airport={...a,id:'jeju_airport',name:'공항',originUrl:'http://example.test/a'};const h=harness('',{cctvs:[airport],loading:false,error:null},airport.id);assert.equal(h.all.some(n=>['video','iframe','HlsPlayer','YoutubePlayer'].includes(n.type)),false);assert.ok(h.all.some(n=>n.props?.className==='wind-watch-link'&&n.props.href==='/cctv/watch/jeju_airport'));assert.ok(text(h.all).includes('목록 사진은 풍경 이미지이며 실시간 화면이 아닙니다.'));
});
test('header preserves authentication/language/search/favorites and hides multiview',()=>{
 const jsx=(type,props)=>({type,props});const stubs={'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':{default:'link'},'next/navigation':{usePathname:()=>'/cctv'},'lucide-react':new Proxy({},{get:(_,name)=>String(name)}),'@/components/common/AuthButton':{AuthButton:'auth'},'@/components/common/LangSwitcher':{LangSwitcher:'language'}};const code=ts.transpileModule(readFileSync(new URL('../components/common/CctvHeader.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;const mod={exports:{}};vm.runInNewContext(code,{module:mod,exports:mod.exports,require:name=>{assert.ok(name in stubs,name);return stubs[name]}});const all=nodes(mod.exports.CctvHeader());for(const href of ['/cctv','/cctv?view=map','/search','/mypage'])assert.ok(all.some(n=>n.props?.href===href));assert.equal(all.some(n=>n.props?.href==='/cctv/multiview'),false);assert.ok(all.some(n=>n.type==='auth'));assert.ok(all.some(n=>n.type==='language'));assert.match(readFileSync(new URL('../app/cctv-wind.css',import.meta.url),'utf8'),/@media\s*\(min-width:640px\).*?\.wind-language\s*\{\s*display:\s*inline-flex/s);
});
test('quicklinks only current active HTTP cameras, named even with blank metadata',()=>{
 const airport={...a,id:'jeju_airport',name:'  ',originUrl:'http://example.test/a'},summit={...b,id:'halla_baengnokdam',name:'',originUrl:'http://example.test/b'};const state={cctvs:[airport,summit],loading:false,error:null};const links=harness('',state).all.filter(n=>n.props?.className==='wind-quick-link');assert.deepEqual(links.map(n=>n.props.href),['/cctv/watch/jeju_airport','/cctv/watch/halla_baengnokdam']);assert.deepEqual(links.map(n=>n.props.children[0].props.children),['제주공항','한라산 백록담']);for(const l of links){assert.equal(l.props.target,'_blank');assert.equal(l.props.rel,'noopener noreferrer')}for(const cctvs of[[],[{...airport,active:false}],[{...airport,youtubeId:'failed'}],[{...airport,originUrl:'https://example.test/a'}]])assert.equal(harness('',{...state,cctvs}).all.some(n=>n.props?.className==='wind-quick-link'),false);assert.equal(harness('q=바다',state).all.some(n=>n.props?.className==='wind-quick-link'),false);
});
function contrast(fg,bg){const lum=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);const v=[lum(fg),lum(bg)].sort((a,b)=>b-a);return(v[0]+.05)/(v[1]+.05)}
test('quicklink colors defeat anchor reset and have AA contrast',()=>{
 const css=readFileSync(new URL('../app/cctv-wind.css',import.meta.url),'utf8');const normal=css.match(/\.wind-explorer a\.wind-quick-link,\s*\.wind-explorer a\.wind-quick-link:visited\s*\{([^}]+)\}/)[1];const hover=css.match(/\.wind-explorer a\.wind-quick-link:hover,\s*\.wind-explorer a\.wind-quick-link:focus-visible\s*\{([^}]+)\}/)[1];for(const rule of[normal,hover])assert.ok(contrast(rule.match(/(?:^|[;\s])color:\s*(#[a-f0-9]{6})/)[1],rule.match(/background:\s*(#[a-f0-9]{6})/)[1])>=4.5);assert.match(normal,/min-height:\s*44px/);
});
test('dated observation visible without permanent LIVE claim',()=>{const h=harness();assert.ok(h.all.some(n=>n.type==='time'&&n.props.dateTime==='2026-11-01T16:32:47.392Z'));assert.ok(text(h.all).includes('현재 재생은 달라질 수 있습니다.'))});
test('informative secondary labels and placeholder have normal-text AA contrast',()=>{
 const css=readFileSync(new URL('../app/cctv-wind.css',import.meta.url),'utf8');for(const [sel,bg]of[['.wind-results','#e8f2e9'],['.wind-footer','#e8f2e9'],['.wind-panel-heading > small','#e8f2e9'],['.wind-search input::placeholder','#fbfdf9']]){const rule=css.slice(css.indexOf(sel+' {')).split('}')[0];assert.ok(contrast(rule.match(/(?:^|[;\s])color:\s*(#[a-f0-9]{6})/)[1],bg)>=4.5,sel)}
});
test('forest sidebar focus outline outranks later global explorer focus reset',()=>{
 const css=readFileSync(new URL('../app/cctv-wind.css',import.meta.url),'utf8');assert.match(css,/\.wind-explorer\s+\.wind-sidebar\s+button:focus-visible\s*\{\s*outline-color:\s*#e3efdc/);assert.match(css,/\.wind-explorer\s+\.wind-sidebar-bottom\s+a:focus-visible\s*\{\s*outline-color:\s*#e3efdc/);assert.ok(contrast('#e3efdc','#204f3b')>=3);
});
