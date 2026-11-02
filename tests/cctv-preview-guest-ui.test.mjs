import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const jsx=(type,props)=>({type,props});
const nodes=v=>!v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children)];
function load(path,deps,globals={}) {
 const mod={exports:{}};
 const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{module:mod,exports:mod.exports,...globals,require:n=>{assert.ok(n in deps,n);return deps[n]}});return mod.exports;
}
const shared=preview=>({'react/jsx-runtime':{jsx,jsxs:jsx},'@/components/common/PreviewRuntimeProvider':{usePreviewRuntime:()=>preview}});
test('preview header hides login and account page while production retains them',()=>{
 for(const preview of [true,false]) {
  const deps={...shared(preview),'next/link':{default:'Link'},'next/navigation':{usePathname:()=>'/cctv'},'lucide-react':{ArrowUpRight:'Arrow',Compass:'Compass',Map:'Map',Search:'Search'},'@/components/common/AuthButton':{AuthButton:'AuthButton'},'@/components/common/LangSwitcher':{LangSwitcher:'LangSwitcher'}};
  const all=nodes(load('../components/common/CctvHeader.tsx',deps).CctvHeader());
  assert.equal(all.some(n=>n.props?.href==='/mypage'),!preview);
  assert.equal(all.some(n=>n.type==='AuthButton'),!preview);
  assert.ok(all.some(n=>n.props?.href==='/cctv'));
  assert.equal(all.find(n=>n.props?.['aria-label']==='CCTV 검색').props.href,preview?'/cctv':'/search');
 }
});
test('preview auth and chat wrappers never mount account hooks, subscriptions or archive writes',()=>{
 for(const preview of [true,false]) {
  const forbidden=()=>{throw Error('Account child must not execute during wrapper render')};
  const deps={...shared(preview),react:{useEffect:forbidden,useState:forbidden,useRef:forbidden,useCallback:forbidden},'firebase/firestore':{},'@/lib/firebase':{getFirebaseDb:forbidden},'@/hooks/useAuth':{useAuth:forbidden},'@/components/common/DolmangyiIcon':{DolmangyiIcon:'Icon'},'next/link':{default:'Link'},'@/lib/i18n':{useT:forbidden}};
  const auth=load('../components/common/AuthButton.tsx',deps).AuthButton();
  assert.equal(auth===null,preview);
  const chat=load('../components/cctv/LiveChat.tsx',deps).LiveChat({cctvId:'synthetic',cctvName:'Synthetic'});
  assert.equal(typeof chat.type==='function',!preview);
  if(preview)assert.equal(nodes(chat).some(n=>n.type==='button'||n.type==='form'),false);
 }
});
test('preview favorites are local only even with an existing Firebase user; production sync remains',async()=>{
 for(const preview of [true,false]) {
  const effects=[],storage=new Map();let snapshots=0,writes=0,dbReads=0;
  const deps={...shared(preview),react:{useState:()=>[new Set(),()=>{}],useEffect:fn=>effects.push(fn),useCallback:fn=>fn},'@/hooks/useAuth':{useAuth:()=>({user:{uid:'existing'}})},'@/lib/firebase':{getFirebaseDb:()=>{dbReads++;return{}}},'firebase/firestore':{collection:()=>({}),doc:()=>({}),onSnapshot:()=>{snapshots++;return()=>{}},setDoc:async()=>{writes++},deleteDoc:async()=>{writes++}}};
  const hook=load('../hooks/useCctvFavorite.ts',deps,{localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}}).useCctvFavorite();
  effects.forEach(fn=>fn());await hook.toggle('synthetic');
  assert.equal(snapshots,preview?0:1);assert.equal(writes,preview?0:1);assert.equal(dbReads,preview?0:2);
  const key=preview?'funjeju_cctv_favorites:preview':'funjeju_cctv_favorites';
  assert.equal(storage.get(key),'["synthetic"]');
 }
});
