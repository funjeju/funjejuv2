import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {timingSafeEqual} from 'node:crypto';
import {adminLoginTarget} from '../lib/admin-login-target.ts';
const compiled=ts.transpileModule(readFileSync(new URL('../app/api/admin/auth/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness(secret='synthetic-admin-secret'){
 const cookies=[]; const mod={exports:{}};
 const NextResponse={json:(body,init={})=>({body,status:init.status??200,cookies:{set:(...args)=>cookies.push(args),delete:name=>cookies.push(['delete',name])}})};
 vm.runInNewContext(compiled,{module:mod,exports:mod.exports,Buffer,process:{env:{ADMIN_SECRET:secret,NODE_ENV:'production'}},require:name=>name==='node:crypto'?{timingSafeEqual}:{NextResponse}});
 return{...mod.exports,cookies};
}
const req=(password,origin='https://site.test')=>({headers:new Headers({origin}),nextUrl:{origin:'https://site.test'},text:async()=>JSON.stringify({password})});
test('existing admin credential format remains, missing config/invalid password/CSRF fail closed',async()=>{
 for(const value of [undefined,null,123,'','wrong']){const h=harness();assert.equal((await h.POST(req(value))).status,401);assert.equal(h.cookies.length,0);}
 const h=harness('');assert.equal((await h.POST(req(undefined))).status,503);assert.equal(h.cookies.length,0);
 const csrf=harness();assert.equal((await csrf.POST(req('synthetic-admin-secret','https://other.test'))).status,403);assert.equal((await csrf.DELETE(req(undefined,'https://other.test'))).status,403);assert.equal(csrf.cookies.length,0);
 const ok=harness();assert.equal((await ok.POST(req('synthetic-admin-secret'))).status,200);assert.equal(ok.cookies[0][0],'admin_auth');assert.equal(ok.cookies[0][2].httpOnly,true);assert.equal(ok.cookies[0][2].sameSite,'lax');assert.equal(ok.cookies[0][2].secure,true);
});
test('login return target never redirects to an arbitrary external or internal destination',()=>{
 assert.equal(adminLoginTarget('/admin/cctv-directory',false),'/admin/cctv-directory');
 for(const value of [null,'https://evil.test','//evil.test','/admin/cctv-directory/other','/api/admin/cctv','javascript:alert(1)'])assert.equal(adminLoginTarget(value,false),'/admin/cctv');
 assert.equal(adminLoginTarget(null,true),'/admin/cctv-directory');
});
