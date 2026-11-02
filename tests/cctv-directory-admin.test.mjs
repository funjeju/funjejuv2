import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { database, server } from './helpers/directory-harness.mjs';
const jsx=(type,props)=>({type,props});
const nodes=v=>!v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children)];
const text=v=>v==null||typeof v==='boolean'?'':typeof v!=='object'?String(v):Array.isArray(v)?v.map(text).join(''):text(v.props?.children);
function load(path,deps,extra={}){
 const mod={exports:{}};const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{module:mod,exports:mod.exports,require:n=>{assert.ok(n in deps,n);return deps[n]},...extra});return mod.exports;
}
const entry={id:'synthetic',revision:'r1',name:'테스트 카메라',region:'제주',category:'해변',direction:'북',description:'',lat:null,lng:null,sourceUrl:'',viewerUrl:'',youtubeId:'',visible:false,playbackStatus:'unverified',playbackNote:'',origin:'legacy',legacyId:'synthetic',sourceRestricted:true,verifiedAt:null,updatedAt:null};
const list={writesEnabled:true,entries:[entry],legacyCount:1,storedCount:0,pendingImportCount:1,importRevision:'import-r1'};
const response=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>data});
function harness(props){
 const states=[],refs=[],calls=[],queue=[];let cursor=0,refCursor=0,effect,cleanup,tree;
 const set=(i,v)=>{states[i]=typeof v==='function'?v(states[i]):v};
 const react={useState:v=>{const i=cursor++;if(!(i in states))states[i]=v;return[states[i],v=>set(i,v)]},useRef:v=>{const i=refCursor++;return refs[i]??(refs[i]={current:v})},useEffect:fn=>{effect??=fn}};
 const api=load('../components/cctv/DirectoryAdmin.tsx',{'react/jsx-runtime':{jsx,jsxs:jsx},react},{AbortController,fetch:async(url,options={})=>{calls.push({url,options});const next=queue.shift();return next?await next():response(200,list)}});
 const render=()=>{cursor=refCursor=0;tree=api.DirectoryAdmin(props);return tree};
 const button=name=>nodes(render()).find(n=>n.type==='button'&&text(n)===name);
 const control=label=>nodes(render()).find(n=>n.type==='label'&&text(n).trim().startsWith(label))?.props.children;
 const input=label=>{const c=control(label);return(Array.isArray(c)?c:[c]).find(n=>['input','select'].includes(n?.type))};
 return{calls,queue,render,button,input,all:()=>nodes(render()),text:()=>text(render()),start:()=>{render();cleanup=effect()},stop:()=>cleanup(),flush:async()=>{await new Promise(r=>setImmediate(r));render()},click:name=>button(name).props.onClick(),change:(label,value)=>input(label).props.onChange({target:{value,checked:value}}),submit:()=>nodes(render()).find(n=>n.type==='form').props.onSubmit({preventDefault(){}})};
}
test('new directory admin server page fails closed for absent/mismatched secrets and never serializes secret',async()=>{
 for(const [secret,cookie,allowed] of [[undefined,undefined,false],['','',false],['expected',undefined,false],['expected','wrong',false],['expected','expected',true]]){
  const page=load('../app/admin/cctv-directory/page.tsx',{'react/jsx-runtime':{jsx,jsxs:jsx},'next/headers':{cookies:async()=>({get:()=>cookie?{value:cookie}:undefined})},'next/navigation':{redirect:url=>{throw Error(url)}},'@/components/cctv/DirectoryAdmin':{DirectoryAdmin:'DirectoryAdmin'}},{process:{env:{ADMIN_SECRET:secret}}});
  assert.equal(page.dynamic,'force-dynamic');assert.equal(page.metadata.robots.index,false);
  if(allowed){const tree=await page.default();assert.equal(tree.type,'DirectoryAdmin');assert.doesNotMatch(JSON.stringify(tree),/expected/)}else await assert.rejects(page.default(),/\/admin\/login\?next=%2Fadmin%2Fcctv-directory/);
 }
});
test('admin mount reads once, never imports or requests media; all restricted/hidden/unverified rows remain editable',async()=>{
 const h=harness();h.start();await h.flush();assert.equal(h.calls.length,1);assert.equal(h.calls[0].url,'/api/admin/cctv-directory');assert.equal(h.calls[0].options.method,undefined);
 assert.match(h.text(),/목록 숨김.*재생 미검증.*좌표 없음.*원본 주소 비공개 보존/);
 h.click('테스트 카메라 (synthetic)');assert.equal(h.input('ID').props.readOnly,true);assert.equal(h.input('위도').props.value,'');assert.equal(h.input('경도').props.value,'');assert.equal(h.input('원본 URL').props.value,'');
 assert.equal(h.all().some(n=>['video','iframe','img'].includes(n.type)),false);assert.equal(h.calls.length,1);h.stop();
});
test('save failure and conflict keep draft with CAS revision and do not auto retry',async()=>{
 for(const status of [400,409,401]){
  const h=harness();h.start();await h.flush();h.click('테스트 카메라 (synthetic)');h.change('이름','edited');h.queue.push(()=>response(status,{error:'not reflected raw'}));h.submit();await h.flush();
  assert.equal(h.input('이름').props.value,'edited');assert.equal(h.calls.length,2);const body=JSON.parse(h.calls[1].options.body);assert.equal(body.expectedRevision,'r1');assert.equal(body.fields.lat,null);assert.equal(body.fields.lng,null);assert.equal(body.fields.name,'edited');assert.ok(h.all().some(n=>n.props?.role==='alert'));
  if(status===409)assert.match(h.text(),/충돌/);if(status===401)assert.ok(h.all().some(n=>n.props?.href==='/admin/login?next=%2Fadmin%2Fcctv-directory'));h.stop();
 }
});
test('import requires count-bearing confirmation and never overwrites automatically',async()=>{
 const h=harness();h.start();await h.flush();h.click('기존 목록 가져오기');assert.equal(h.calls.length,1);assert.match(h.text(),/1개 중 1개.*덮어쓰지 않습니다/);h.click('취소');assert.equal(h.calls.length,1);
 h.click('기존 목록 가져오기');h.queue.push(()=>response(200,{imported:1,skipped:0}));h.click('확인');await h.flush();assert.deepEqual(JSON.parse(h.calls[1].options.body),{action:'import-legacy',expectedImportRevision:'import-r1'});assert.equal(h.calls.filter(c=>c.options.method==='POST').length,1);h.stop();
});
test('new draft defaults visible and unverified; paired coordinates and explicit observation required',async()=>{
 const h=harness();h.start();await h.flush();h.click('새 CCTV 추가');assert.equal(h.input('목록에 공개').props.checked,true);assert.equal(h.input('재생 상태').props.value,'unverified');assert.equal(h.input('방향').props.value,'');h.change('ID','new');h.change('이름','New');h.change('위도','33.4');h.submit();assert.equal(h.calls.length,1);assert.match(h.text(),/위도와 경도/);
 h.change('경도','126.5');h.change('재생 상태','verified');h.submit();assert.equal(h.calls.length,1);assert.match(h.text(),/직접 영상 재생/);h.change('실제 영상 재생',true);h.queue.push(()=>response(409,{}));h.submit();await h.flush();
 const body=JSON.parse(h.calls[1].options.body);assert.equal(body.expectedRevision,'new');assert.equal(body.observation.observedPlayback,true);assert.ok(Number.isFinite(Date.parse(body.observation.observedAt)));assert.equal(body.fields.lat,33.4);h.stop();
});
test('refresh preserves draft and requires confirmation; discard also needs explicit confirmation',async()=>{
 const h=harness();h.start();await h.flush();h.click('새 CCTV 추가');h.change('이름','draft');h.click('목록 새로고침');assert.equal(h.calls.length,1);h.click('확인');await h.flush();assert.equal(h.input('이름').props.value,'draft');h.click('테스트 카메라 (synthetic)');assert.equal(h.input('이름').props.value,'draft');h.click('취소');assert.equal(h.input('이름').props.value,'draft');h.stop();
});
test('concurrent save gestures cannot duplicate writes; successful save but failed refresh preserves draft revision',async()=>{
 const h=harness();h.start();await h.flush();h.click('테스트 카메라 (synthetic)');h.change('이름','draft');let finish;h.queue.push(()=>new Promise(resolve=>{finish=resolve}));h.submit();h.submit();assert.equal(h.calls.filter(c=>c.options.method==='POST').length,1);h.queue.push(()=>response(500,{}));finish(response(200,{entry:{...entry,revision:'r2'}}));await h.flush();assert.equal(h.input('이름').props.value,'draft');assert.match(h.text(),/저장은 완료/);
 h.queue.push(()=>response(409,{}));h.submit();await h.flush();assert.equal(JSON.parse(h.calls.at(-1).options.body).expectedRevision,'r2');h.stop();
});
test('late list response cannot overwrite a newer refresh or a draft',async()=>{
 const h=harness();let first;h.queue.push(()=>new Promise(resolve=>{first=resolve}));h.start();await h.flush();h.click('새 CCTV 추가');h.change('이름','new draft');h.click('목록 새로고침');h.click('확인');await h.flush();first(response(200,{...list,entries:[{...entry,name:'STALE'}]}));await h.flush();assert.equal(h.input('이름').props.value,'new draft');assert.doesNotMatch(h.text(),/STALE/);h.stop();
});

 test('catalogue navigation can be hidden for admin-only production rollout',()=>{
  for(const [props,href] of [[undefined,'/cctv-directory'],[{catalogueHref:null},null],[{catalogueHref:'/preview-directory'},'/preview-directory']]){
   const h=harness(props),link=h.all().find(n=>n.type==='a'&&text(n)==='새 미리보기 목록');
   assert.equal(link?.props.href??null,href);assert.ok(h.all().some(n=>n.props?.href==='/admin/cctv'));
  }
 });

test('missing or false write gate keeps browsing available but blocks every POST handler',async()=>{
 for(const writesEnabled of [undefined,false]){
  const h=harness();h.queue.push(()=>Promise.resolve(response(200,{...list,writesEnabled})));h.start();await h.flush();
  assert.match(h.text(),/규칙 검증 전 저장 잠금/);assert.equal(h.button('기존 목록 가져오기').props.disabled,true);
  h.click('테스트 카메라 (synthetic)');assert.equal(h.input('이름').props.value,entry.name);h.change('이름','draft');
  assert.equal(h.button('새 목록에 저장').props.disabled,true);h.submit();await h.flush();assert.equal(h.input('이름').props.value,'draft');
  h.click('기존 목록 가져오기');assert.equal(h.button('확인').props.disabled,true);h.click('확인');await h.flush();
  assert.equal(h.calls.filter(c=>c.options.method==='POST').length,0);assert.equal(h.input('이름').props.value,'draft');h.stop();
 }
});

// Exercise the real server contract, not a mock that accepts any revision string.
test('new UI draft creates a new server record with the CAS creation revision', async()=>{
 const fake=database({}),backend=server(fake),h=harness();h.start();await h.flush();
 h.click('새 CCTV 추가');h.change('ID','new_camera');h.change('이름','새 카메라');
 h.queue.push(async()=>response(200,{entry:await backend.saveDirectory(JSON.parse(h.calls.at(-1).options.body))}));
 h.submit();await h.flush();
 assert.equal(fake.records.get('cctv_directory_v1/new_camera')?.data.name,'새 카메라');
 assert.equal(fake.records.get('cctv_directory_v1/new_camera')?.data.revision,1);
 assert.equal(fake.records.get('cctv_directory_v1/new_camera')?.data.playbackStatus,'unverified');
 assert.equal(fake.writes.some(w=>w.path.startsWith('cctvs/')),false);
 assert.match(h.text(),/새 목록에 저장했습니다/);h.stop();
});
