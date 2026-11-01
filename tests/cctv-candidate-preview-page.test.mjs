import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { syntheticCandidatePayload } from './helpers/cctv-candidate-fixture.mjs';

function compile(path, dependencies, globals={}) {
  const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const mod={exports:{}};
  vm.runInNewContext(code,{module:mod,exports:mod.exports,URL,TextEncoder,fetch:()=>{throw Error('No source network permitted')},require:name=>{assert.ok(name in dependencies,`Unexpected dependency ${name}`);return dependencies[name]},...globals});
  return mod.exports;
}
const parser=compile('../lib/cctv-jejusi-candidates.ts',{});
const catalog=parser.parseJejusiCandidatesJson(JSON.stringify(syntheticCandidatePayload()));
const planner=compile('../lib/cctv-candidate-preview.ts',{'./cctv-jejusi-candidates':parser});
function harness({env={VERCEL_ENV:'preview',NODE_ENV:'production',ADMIN_SECRET:'configured'},cookie='configured',lookup,configState='ready'}={}) {
  const reads=[];let cookieReads=0,catalogReads=0;
  const jsx=(type,props)=>({type,props});
  const deps={
    'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':{default:'Link'},
    'next/headers':{cookies:async()=>{cookieReads++;return {get:()=>cookie==null?undefined:{value:cookie}}}},
    'next/navigation':{notFound:()=>{throw Error('NOT_FOUND')},redirect:url=>{throw Error(`REDIRECT:${url}`)}},
    '@/lib/firestore-cctv-server':{lookupCctvById:async id=>{reads.push(id);return lookup?lookup(id):{state:'found',entry:{id,name:id==='gimnyeong'?'김녕해변':id,originUrl:'http://existing.test/old.m3u8?uid=never-render-secret',active:true}}}},
    '@/lib/cctv-review':{cctvSourceRevision:()=> 'canonical-current-source-revision'},
    '@/lib/cctv-candidate-catalog-server':{loadJejusiCandidateCatalog:()=>{catalogReads++;return configState==='ready'?{state:'ready',catalog}:{state:configState}}},'@/lib/cctv-candidate-preview':planner,
  };
  const page=compile('../app/admin/cctv/source-preview/page.tsx',deps,{process:{env}});
  return {page,reads,cookieReads:()=>cookieReads,catalogReads:()=>catalogReads};
}
function nodes(v){return !v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children)]}
function text(v){return v==null||typeof v==='boolean'?'':typeof v==='string'||typeof v==='number'?String(v):Array.isArray(v)?v.map(text).join(' '):text(v.props?.children)}

test('production and unrecognized environments deny before auth or any inventory read',async()=>{
  for(const env of [{VERCEL_ENV:'production',NODE_ENV:'production',ADMIN_SECRET:'configured'},{VERCEL_ENV:'production',NODE_ENV:'development',ADMIN_SECRET:'configured'},{NODE_ENV:'production',ADMIN_SECRET:'configured'}]){
    const h=harness({env});await assert.rejects(h.page.default(),/NOT_FOUND/);assert.equal(h.cookieReads(),0);assert.equal(h.reads.length,0);assert.equal(h.catalogReads(),0);
  }
});
test('preview requires configured existing admin secret AND matching nonempty cookie',async()=>{
  for(const opts of [{cookie:null},{cookie:''},{cookie:'wrong'},{env:{VERCEL_ENV:'preview',NODE_ENV:'production'},cookie:''}]){
    const h=harness(opts);await assert.rejects(h.page.default(),/REDIRECT:\/admin\/login/);assert.equal(h.reads.length,0);assert.equal(h.catalogReads(),0);
  }
});
test('authorized preview compares exactly19 existing IDs read-only with Gimnyeong first',async()=>{
  const h=harness();const tree=await h.page.default();const all=nodes(tree);const articles=all.filter(n=>n.type==='article');
  assert.equal(h.reads.length,19);assert.equal(new Set(h.reads).size,19);assert.equal(articles.length,19);
  assert.equal(articles[0].props.id,'candidate-30010');assert.match(text(articles[0]),/jejusi:30010\s+→\s+gimnyeong/);
  assert.match(text(articles[0]),/https:\/\/cameras.example.test\/live\/30010\/playlist.m3u8/);
  assert.equal(h.page.dynamic,'force-dynamic');assert.equal(h.page.revalidate,0);assert.equal(h.page.metadata.robots.index,false);
});
test('comparison never mounts playback or makes candidate URLs clickable, even with activation query input',async()=>{
  const h=harness();const tree=await h.page.default({searchParams:Promise.resolve({play:'1',activate:'true',source:'https://attacker.test'})});const all=nodes(tree);
  assert.equal(all.some(n=>['video','audio','iframe','source','HlsPlayer'].includes(n.type)),false);
  assert.equal(all.some(n=>n.props?.src||n.props?.srcDoc),false);
  assert.equal(all.some(n=>typeof n.props?.href==='string'&&/^https?:/.test(n.props.href)),false);
  assert.ok(all.filter(n=>n.type==='button').every(n=>n.props.disabled===true));
  assert.match(text(tree),/운영 미반영/);assert.doesNotMatch(text(tree),/never-render-secret|attacker.test/);
});
test('unavailable inventory stays distinct from missing record and never mutates candidate availability',async()=>{
  const h=harness({lookup:id=>id==='gimnyeong'?{state:'unavailable'}:{state:'missing'}});const tree=await h.page.default();const articles=nodes(tree).filter(n=>n.type==='article');
  assert.match(text(articles[0]),/현재 목록 조회 실패/);assert.doesNotMatch(text(articles[0]),/현재 문서 없음/);assert.match(text(articles[1]),/현재 문서 없음/);
  assert.ok(catalog.candidates.every(c=>c.held&&c.playbackVerified===false));
});
test('authorized local development remains an isolated read-only comparison',async()=>{
  const h=harness({env:{NODE_ENV:'development',ADMIN_SECRET:'configured'}});await h.page.default();assert.equal(h.reads.length,19);
});

test('missing or invalid private catalog never reads public inventory or reflects private errors',async()=>{
  for(const configState of ['missing','invalid']){
    const h=harness({configState});const tree=await h.page.default();assert.equal(h.reads.length,0);assert.equal(h.catalogReads(),1);
    assert.equal(nodes(tree).some(n=>n.type==='article'),false);assert.match(text(tree),/비공개 후보 목록 연결 대기/);
  }
});
test('server-only loader reads only private config and returns redacted fail-closed results',()=>{
  const load=raw=>compile('../lib/cctv-candidate-catalog-server.ts',{'server-only':{},'./cctv-jejusi-candidates':parser},{process:{env:{CCTV_JEJUSI_CANDIDATES_JSON:raw}}}).loadJejusiCandidateCatalog();
  assert.equal(load(undefined).state,'missing');assert.equal(load('').state,'missing');
  assert.equal(load('{private-invalid-secret').state,'invalid');assert.doesNotMatch(JSON.stringify(load('{private-invalid-secret')),/secret/);
  const result=load(JSON.stringify(syntheticCandidatePayload()));assert.equal(result.state,'ready');assert.equal(result.catalog.candidates.length,19);
});
