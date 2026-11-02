import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { publicPreviewAccess } from '../lib/cctv-public-preview-access.ts';

test('public preview exposes only read-only CCTV, weather and required assets', () => {
  for (const path of ['/', '/cctv', '/cctv/', '/cctv/camera_1', '/cctv/watch/camera-1', '/cctv/region/%EC%A0%9C%EC%A3%BC', '/cctv/theme/beach', '/api/weather', '/fonts/font.woff2', '/cctv-editorial/photo.jpg', '/_next/static/chunk.js', '/_next/image', '/favicon.ico']) {
    for (const method of ['GET','HEAD']) assert.equal(publicPreviewAccess(path,method),'allow',path);
    for (const method of ['POST','PUT','PATCH','DELETE','OPTIONS']) assert.equal(publicPreviewAccess(path,method),'deny',`${method} ${path}`);
  }
  for (const path of ['/mypage','/mypage/','/search','/cctv/multiview']) assert.equal(publicPreviewAccess(path,'GET'),'cctv');
});
test('admin, auth, configuration, cron, writes and alternate data paths are unavailable', () => {
  for (const path of ['/admin','/admin/login','/admin/cctv','/api/admin/cctv','/api/auth/login','/api/config','/api/cron/synthetic','/api/stats','/api/event','/api/weather/admin','/api/weather/','/biz/a','/feed','/mypage/private','/_next/data/build/admin.json','/_next/data/build/api/admin.json','/cctv/watch/../admin','/cctv/watch/a/extra']) {
    assert.equal(publicPreviewAccess(path,'GET'),'deny',path);
  }
});
function middleware(env) {
  class Response {
    constructor(body,init={}) { this.body=body;this.status=init.status||200;this.headers=new Headers(init.headers); }
    static next() {const r=new Response();r.next=true;return r;}
    static redirect(url) {const r=new Response(null,{status:307});r.location=String(url);return r;}
  }
  const source=readFileSync(new URL('../middleware.ts',import.meta.url),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod={exports:{}};vm.runInNewContext(code,{module:mod,exports:mod.exports,process:{env},URL,require:name=>name==='next/server'?{NextResponse:Response}:{publicPreviewAccess}});
  return mod.exports;
}
test('preview middleware never reads admin cookies and stops writes before handlers', () => {
  const m=middleware({VERCEL_ENV:'preview',ADMIN_SECRET:'synthetic'});
  const request=(pathname,method='GET')=>({nextUrl:{pathname},url:`https://preview.example.test${pathname}`,method,cookies:{get(){throw Error('must not read admin session');}}});
  for (const path of ['/admin','/admin/login','/api/admin/cctv']) assert.equal(m.middleware(request(path)).status,404);
  assert.equal(m.middleware(request('/cctv','POST')).status,404);
  const allowed=m.middleware(request('/cctv/watch/a'));assert.equal(allowed.next,true);assert.equal(allowed.headers.get('X-Robots-Tag'),'noindex, nofollow');
  assert.equal(m.middleware(request('/mypage')).location,'https://preview.example.test/cctv');
  assert.ok(m.config.matcher[0].includes('_next/static'));
});
test('production retains existing administrator authentication and application routes', () => {
  const m=middleware({VERCEL_ENV:'production',ADMIN_SECRET:'synthetic'});
  const request=(pathname,cookie,method='GET')=>({nextUrl:{pathname},url:`https://production.example.test${pathname}`,method,cookies:{get:()=>cookie?{value:cookie}:undefined}});
  assert.equal(m.middleware(request('/admin')).location,'https://production.example.test/admin/login');
  assert.equal(m.middleware(request('/admin','wrong')).status,307);
  assert.equal(m.middleware(request('/admin','synthetic')).next,true);
  for (const path of ['/admin/login','/api/admin/cctv','/mypage','/cctv/multiview']) assert.equal(m.middleware(request(path,undefined,'POST')).next,true);
});
