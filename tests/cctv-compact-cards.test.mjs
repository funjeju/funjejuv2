import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { loadPlaybackTarget } from './helpers/load-playback-target.mjs';
const jsx = (type, props, key) => ({ type, props, key });
const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
const text = value => value == null || typeof value === 'boolean' ? '' : typeof value !== 'object' ? String(value) : Array.isArray(value) ? value.map(text).join(' ') : text(value.props?.children);
function load(path, dependencies) {
 const mod={exports:{}};const source=readFileSync(new URL(path,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{module:mod,exports:mod.exports,process:{env:{}},require:name=>{assert.ok(name in dependencies,name);return dependencies[name]}});return mod.exports;
}
const camera = {id:'synthetic_camera',name:'테스트 해변',region:'제주시',category:'해변',direction:'북',active:true,description:'',originUrl:'http://source.example.test/a'};
function cardHarness(){
 let failed=null;
 const deps={'react/jsx-runtime':{jsx,jsxs:jsx},react:{useState:()=>[failed,next=>{failed=next}]},'next/link':{__esModule:true,default:'Link'},'next/image':{__esModule:true,default:'Image'},'lucide-react':{ArrowUpRight:'ArrowUpRight',Play:'Play',ExternalLink:'ExternalLink'},'@/components/common/CctvFavoriteButton':{CctvFavoriteButton:'Favorite'},'@/components/common/ShareButton':{ShareButton:'Share'},'@/lib/cctv-playback-target':loadPlaybackTarget()};
 return load('../components/cctv/CctvCard.tsx',deps).CctvCard;
}
test('compact card is horizontal with fixed thumbnail and honest non-live imagery',()=>{
 const render=cardHarness();const tree=render({cctv:camera,onOpen(){},variant:'compact'});const all=nodes(tree);
 assert.match(tree.props.className,/wind-camera-card/);
 assert.ok(all.some(n=>/wind-camera-thumb/.test(n.props?.className??'')&&n.props.className.includes('w-[84px]')&&n.props.className.includes('h-[84px]')));
 assert.ok(all.some(n=>n.type==='Image'&&n.props.sizes==='84px'));
 assert.match(text(tree),/실시간 화면 아님/);
 const thumbnail=all.find(n=>/wind-camera-thumb/.test(n.props?.className??''));assert.equal(text(thumbnail),'');
 assert.ok(all.some(n=>/wind-camera-eyebrow/.test(n.props?.className??'')&&text(n).includes('01')));
 assert.ok(all.some(n=>/wind-camera-footer/.test(n.props?.className??'')));assert.doesNotMatch(text(tree),/LIVE|검증 완료|실시간 재생 중/);
 assert.ok(all.some(n=>n.type==='ExternalLink'));assert.ok(all.some(n=>/wind-camera-name/.test(n.props?.className??'')));
});
test('compact click delegates once synchronously; independent detail/share/favorite and credit remain',()=>{
 let calls=0;const tree=cardHarness()({cctv:camera,onOpen:()=>{calls++},variant:'compact'});const all=nodes(tree);
 const button=all.find(n=>n.type==='button');assert.match(button.props['aria-label'],/새 창/);button.props.onClick();assert.equal(calls,1);
 assert.ok(all.some(n=>n.type==='Link'&&n.props.href==='/cctv/synthetic_camera'));
 assert.ok(all.some(n=>n.type==='Favorite'&&n.props.id===camera.id));assert.ok(all.some(n=>n.type==='Share'));
 assert.ok(all.some(n=>n.type==='details'));assert.match(text(tree),/A\. D\. Prakasa/);assert.match(text(tree),/CC BY-SA 4\.0/);
 assert.ok(all.some(n=>n.type==='a'&&n.props.href==='/cctv/watch/synthetic_camera'&&n.props.rel==='noopener noreferrer'));
});
test('compact failed image becomes honest graphic; inactive and unknown transport retain semantics',()=>{
 const render=cardHarness();const props={cctv:camera,onOpen(){},variant:'compact'};
 nodes(render(props)).find(n=>n.type==='Image').props.onError();const failed=render(props);
 assert.equal(nodes(failed).some(n=>n.type==='Image'),false);assert.match(text(failed),/지역 그래픽/);
 assert.equal(nodes(render({...props,cctv:{...camera,active:false}})).find(n=>n.type==='button').props.disabled,true);
 assert.match(nodes(render({...props,cctv:{...camera,originUrl:''}})).find(n=>n.type==='button').props['aria-label'],/상세 페이지/);
});
test('default card keeps editorial layout and compact list propagates variant without changing HTTP launch',()=>{
 assert.match(cardHarness()({cctv:camera,onOpen(){}}).props.className,/editorial-camera-card/);
 const opened=[];const order=[];const routing=loadPlaybackTarget({screen:{},open:(...args)=>{order.push('open');opened.push(args)}});
 const deps={'react/jsx-runtime':{jsx,jsxs:jsx},react:{useState:()=>[null,()=>{}]},'@/components/cctv/CctvCard':{CctvCard:'Card'},'@/components/cctv/CameraDialog':{CameraDialog:'Dialog'},'@/lib/cctv-playback-target':routing};
 const {CctvList}=load('../components/cctv/CctvList.tsx',deps);const tree=CctvList({cctvs:Object.freeze([Object.freeze(camera)]),variant:'compact',onCameraOpen:c=>{assert.equal(c,camera);order.push('selection')}});const all=nodes(tree);
 const list=all.find(n=>/wind-camera-list/.test(n.props?.className??''));assert.ok(list);assert.doesNotMatch(list.props.className,/grid-cols-3/);
 const card=all.find(n=>n.type==='Card');assert.equal(card.props.variant,'compact');card.props.onOpen();assert.equal(opened[0][0],'/cctv/watch/synthetic_camera');assert.deepEqual(order,['selection','open']);assert.equal(all.some(n=>n.type==='Dialog'),false);
 const inactive=CctvList({cctvs:[{...camera,active:false}],variant:'compact',onCameraOpen:()=>{throw new Error('inactive callback')}});nodes(inactive).find(n=>n.type==='Card').props.onOpen();assert.equal(opened.length,1);
});
