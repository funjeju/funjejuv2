import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const jsx=(type,props,key)=>({type,props,key});
function load(path,deps,env={},globals={}){
 const mod={exports:{}};const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{module:mod,exports:mod.exports,process:{env},URL,...globals,require:name=>{assert.ok(name in deps,name);return deps[name]}});return mod.exports;
}
const nodes=v=>!v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children)];
test('server preview layout omits GA/Naver and disables app pageviews; production behavior is preserved',()=>{
 const deps={'react/jsx-runtime':{jsx,jsxs:jsx},'./globals.css':{},'@next/third-parties/google':{GoogleAnalytics:'GoogleAnalytics'},'@/components/common/AppShell':{AppShell:'AppShell'},'@/components/common/NaverAnalytics':{NaverAnalytics:'NaverAnalytics'},'@/components/common/PreviewRuntimeProvider':{PreviewRuntimeProvider:'PreviewRuntimeProvider'}};
 for(const VERCEL_ENV of ['preview','production',undefined]){
  const layout=load('../app/layout.tsx',deps,{VERCEL_ENV,NEXT_PUBLIC_GA_ID:'G-SYNTHETIC'}).default;
  const all=nodes(layout({children:'content'}));assert.equal(all.find(n=>n.type==='AppShell').props.trackPageViews,VERCEL_ENV!=='preview');
  const provider=all.find(n=>n.type==='PreviewRuntimeProvider');assert.equal(provider.props.preview,VERCEL_ENV==='preview');assert.equal(provider.props.children.type,'AppShell');
  for(const type of ['GoogleAnalytics','NaverAnalytics'])assert.equal(all.some(n=>n.type===type),VERCEL_ENV!=='preview');
 }
});

test('preview auth observes a signed-in user without reading or writing the shared user profile',async()=>{
 for(const preview of [true,false])for(const exists of [true,false]){
  let effect,callback,reads=0,writes=0,unsubscribed=0;const observed=[];
  const user={uid:'synthetic',email:'tester@example.test',displayName:'Tester',photoURL:null};
  const deps={
   react:{useState:()=>[null,v=>observed.push(v)],useEffect:fn=>{effect=fn}},
   'firebase/auth':{GoogleAuthProvider:class{},signInWithPopup:()=>{throw Error('No login')},signOut:()=>{throw Error('No logout')},onAuthStateChanged:(_auth,fn)=>{callback=fn;return()=>{unsubscribed++}}},
   'firebase/firestore':{doc:()=>({}),getDoc:async()=>{reads++;return{exists:()=>exists,data:()=>({})}},setDoc:async()=>{writes++},serverTimestamp:()=>0},
   '@/lib/firebase':{getFirebaseAuth:()=>({}),getFirebaseDb:()=>({})},
   '@/components/common/PreviewRuntimeProvider':{usePreviewRuntime:()=>preview},
  };
  load('../hooks/useAuth.ts',deps).useAuth();const cleanup=effect();await callback(user);
  assert.ok(observed.includes(user));assert.equal(reads,preview?0:1);assert.equal(writes,preview?0:1);
  cleanup();assert.equal(unsubscribed,1);
 }
});
test('AppShell passes the server telemetry policy on watch and explorer routes',()=>{
 for(const path of ['/cctv/watch/test_camera','/cctv']){
  let enabled;
  const deps={'react/jsx-runtime':{jsx,jsxs:jsx},'next/navigation':{usePathname:()=>path},'@/hooks/usePageViewTracker':{usePageViewTracker:value=>{enabled=value}},'@/lib/i18n':{LangProvider:'LangProvider'},'@/constants/public-features':{CCTV_FOCUSED_PUBLIC:true}};
  for(const name of ['Sidebar','AppHeader','BottomNavigation','FloatingChat','ServiceNoticePopup','CctvHeader'])deps[`@/components/common/${name}`]={[name]:name};
  const shell=load('../components/common/AppShell.tsx',deps).AppShell;
  shell({children:'content',trackPageViews:false});assert.equal(enabled,false);
  shell({children:'content'});assert.equal(enabled,true);
 }
});
test('disabled pageview hook neither allocates anonymous identity nor sends a database write',()=>{
 let effect,identities=0;const calls=[];
 const deps={react:{useEffect:fn=>{effect=fn}},'next/navigation':{usePathname:()=>'/cctv/watch/test_camera'},'@/hooks/useAuth':{useAuth:()=>({user:null})},'@/lib/client-usage':{getAnonId:()=>{identities++;return'synthetic'}}};
 const hook=load('../hooks/usePageViewTracker.ts',deps,{}, {fetch:(...args)=>{calls.push(args);return Promise.resolve({ok:true})}}).usePageViewTracker;
 hook(false);effect();assert.equal(identities,0);assert.equal(calls.length,0);
 hook();effect();assert.equal(identities,1);assert.equal(calls.length,1);assert.equal(calls[0][0],'/api/stats/pageview');
});
