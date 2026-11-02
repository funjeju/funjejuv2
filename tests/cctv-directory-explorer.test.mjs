import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as direct from '../lib/cctv-direct-link.ts';
const jsx=(type,props,key)=>({type,props,key});
const nodes=v=>!v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children)];
const text=v=>v==null||typeof v==='boolean'?'':typeof v!=='object'?String(v):Array.isArray(v)?v.map(text).join(''):text(v.props?.children);
function load(path,deps,extra={}){
 const mod={exports:{}};const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{module:mod,exports:mod.exports,require:n=>{assert.ok(n in deps,n);return deps[n]},...extra});return mod.exports;
}
const client=load('../lib/cctv-directory-client.ts',{'@/lib/cctv-direct-link':direct});
const camera={id:'place',name:'테스트 해변',region:'제주시',category:'해변',direction:'북',description:'푸른 바다',lat:33.4,lng:126.5,sourceUrl:'http://cctv.example.kr/live.m3u8',viewerUrl:'',youtubeId:'',visible:true,playbackStatus:'unverified',playbackNote:'현장 확인 전',verifiedAt:null};
function harness({entries=[camera],loading=false,error=null,query=''}={}){
 let selected=null,tree,refreshed=0,url;const opened=[];
 const mod=load('../components/cctv/DirectoryExplorer.tsx',{'react/jsx-runtime':{jsx,jsxs:jsx},react:{useCallback:fn=>fn,useState:()=>[selected,next=>{selected=next}]},'next/navigation':{useSearchParams:()=>new URLSearchParams(query)},'lucide-react':new Proxy({},{get:(_,name)=>name}),'@/components/cctv/CctvMap':{CctvMap:'CctvMap'},'@/hooks/useCctvDirectory':{useCctvDirectory:()=>({entries,loading,error,refresh:()=>{refreshed++}})},'@/lib/cctv-directory-client':client},{URLSearchParams,window:{location:{pathname:'/cctv-directory'},history:{replaceState:(_a,_b,next)=>{url=next;query=next.split('?')[1]??''}},open:(...args)=>opened.push(args)}});
 const render=()=>{tree=mod.DirectoryExplorer();return nodes(tree)};
 return{render,opened,text:()=>text(tree),url:()=>url,refreshes:()=>refreshed,select:()=>selected};
}
test('all 57 visible places survive verification status; list and map use exactly same filtered IDs with three missing coordinates',()=>{
 const entries=Array.from({length:57},(_,i)=>({...camera,id:`place_${i}`,name:`장소 ${i}`,playbackStatus:['unverified','unavailable','verified'][i%3],lat:i<3?null:33.4,lng:i<3?null:126.5}));
 const hidden={...camera,id:'hidden',visible:false};const h=harness({entries:[...entries,hidden]});const all=h.render();const list=all.filter(n=>n.type==='li');const map=all.find(n=>n.type==='CctvMap');
 assert.equal(list.length,57);assert.deepEqual(list.map(n=>n.key),entries.map(e=>e.id));assert.deepEqual(map.props.cctvs.map(e=>e.id),entries.map(e=>e.id));assert.equal(map.props.cctvs.filter(e=>e.lat===undefined&&e.lng===undefined).length,3);assert.ok(map.props.cctvs.slice(0,3).every(e=>e.lat!==0&&e.lng!==0));assert.equal(map.props.selectionOnly,true);assert.equal(map.props.compact,true);assert.match(h.text(),/57개 장소 · 위치 미확정 3개/);assert.equal(h.opened.length,0);assert.equal(all.some(n=>['video','iframe','HlsPlayer','HttpsCameraWindow'].includes(n.type)),false);assert.doesNotMatch(h.text(),/LIVE|실시간 재생 중|검증 완료/);
});
test('explicit list and selection-only map gestures open validated provider URLs without old watch/relay routing',()=>{
 const entries=[{...camera,id:'official',viewerUrl:'https://viewer.example.kr/watch'},{...camera,id:'youtube',youtubeId:'abcdefghijk'},{...camera,id:'raw'}];const h=harness({entries});let all=h.render();
 all.find(n=>n.type==='button'&&n.props['aria-label']==='테스트 해변 제공처 새 창으로 보기').props.onClick();assert.equal(h.opened[0][0],'https://viewer.example.kr/watch');all=h.render();all.find(n=>n.type==='CctvMap').props.onCameraOpen('youtube');all.find(n=>n.type==='CctvMap').props.onCameraOpen('raw');assert.deepEqual(h.opened.map(args=>args[0]),['https://viewer.example.kr/watch','https://www.youtube.com/watch?v=abcdefghijk',camera.sourceUrl]);for(const args of h.opened)assert.match(args[2],/noopener,noreferrer/);assert.equal(h.select(),'raw');
 for(const link of all.filter(n=>n.type==='a')){assert.equal(link.props.rel,'noopener noreferrer');assert.equal(link.props.referrerPolicy,'no-referrer')}
});
test('missing, hidden and unsafe media never open from list or map; information remains available',()=>{
 const entries=[{...camera,id:'none',sourceUrl:'',lat:null,lng:null},{...camera,id:'unsafe',sourceUrl:'http://127.0.0.1/live'},{...camera,id:'signed',sourceUrl:'https://cctv.example.kr/live?token=secret'},{...camera,id:'hidden',visible:false}];const h=harness({entries});let all=h.render();assert.equal(all.some(n=>n.type==='button'&&n.props['aria-label']?.includes('제공처')),false);assert.equal(all.some(n=>n.type==='a'),false);assert.match(h.text(),/공개 시청 주소 확인 필요/);
 const map=all.find(n=>n.type==='CctvMap');for(const id of ['none','unsafe','signed','hidden','missing'])map.props.onCameraOpen(id);assert.equal(h.opened.length,0);
 all.find(n=>n.type==='button'&&text(n)==='장소 정보').props.onClick();all=h.render();assert.match(h.text(),/임의 좌표를 표시하지 않습니다/);assert.equal(h.opened.length,0);
});
test('search and direction/category filters preserve same list/map dataset and URL-backed state',()=>{
 const entries=[camera,{...camera,id:'unknown',name:'Unknown',direction:'',region:'',category:'산',description:''}];const h=harness({entries,query:'q=제주시%20바다&view=map'});let all=h.render();assert.deepEqual(all.find(n=>n.type==='CctvMap').props.cctvs.map(e=>e.id),['place']);assert.equal(all.filter(n=>n.type==='li').length,1);assert.ok(all.some(n=>n.props?.['data-view']==='map'));
 all.find(n=>n.type==='input').props.onChange({target:{value:''}});all=h.render();all.find(n=>n.type==='button'&&text(n).includes('지역 미확정')).props.onClick();all=h.render();assert.deepEqual(all.find(n=>n.type==='CctvMap').props.cctvs.map(e=>e.id),['unknown']);assert.equal(new URL(h.url(),'https://site.example.kr').searchParams.get('view'),'map');all.find(n=>n.type==='select').props.onChange({target:{value:'해변'}});all=h.render();assert.equal(all.filter(n=>n.type==='li').length,0);assert.match(h.text(),/조건에 맞는 장소가 없습니다/);
});
test('loading and fetch errors never render stale list/map or playable links; retry is explicit',()=>{
 for(const state of [{loading:true,error:null},{loading:false,error:'연결 오류'}]){
  const h=harness({...state,entries:[camera]});const all=h.render();assert.equal(all.some(n=>n.type==='CctvMap'||n.type==='li'||n.type==='a'),false);assert.equal(h.opened.length,0);
  if(state.error){assert.ok(all.some(n=>n.props?.role==='alert'));all.find(n=>n.type==='button'&&text(n)==='다시 불러오기').props.onClick();assert.equal(h.refreshes(),1)}
 }
});

test('real selection-only map index and diagram delegate once, never invoke legacy routes or fabricate missing pins',()=>{
 let stateIndex=0;const chosen=[];const forbidden=()=>{throw Error('legacy route must not execute')};
 const map=load('../components/cctv/CctvMap.tsx',{'react/jsx-runtime':{jsx,jsxs:jsx},react:{useState:initial=>[stateIndex++===1?'static':initial,()=>{}],useRef:()=>({current:null}),useMemo:fn=>fn(),useEffect:()=>{}},'@/components/common/PreviewRuntimeProvider':{usePreviewRuntime:()=>true},'leaflet/dist/leaflet.css':{},'@/components/cctv/CameraDialog':{CameraDialog:'CameraDialog'},'@/lib/cctv-playback-target':{requiresExternalPlayback:()=>true,requiresPlaybackDetail:()=>false,cameraWatchUrl:forbidden,openCameraWatch:forbidden}},{process:{env:{}},window:{location:{assign:forbidden},open:forbidden}});
 const all=nodes(map.CctvMap({compact:true,selectionOnly:true,onCameraOpen:id=>chosen.push(id),cctvs:[{id:'unknown',name:'좌표 없음',active:true},{id:'positioned',name:'좌표 있음',active:true,lat:33.4,lng:126.5,originUrl:camera.sourceUrl}]}));
 assert.equal(all.some(n=>n.type==='a'||n.type==='CameraDialog'),false);
 const pins=all.filter(n=>n.type==='button'&&n.props.title);assert.equal(pins.length,1);assert.equal(pins[0].props.title,'좌표 있음');pins[0].props.onClick();assert.deepEqual(chosen,['positioned']);
 const unknown=all.find(n=>n.type==='button'&&text(n).includes('좌표 없음'));assert.ok(unknown);unknown.props.onClick();assert.deepEqual(chosen,['positioned','unknown']);
});
