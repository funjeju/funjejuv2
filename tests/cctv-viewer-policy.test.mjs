import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configuredPreviewViewerApproval, viewerLocationAllowed } from '../lib/cctv-viewer-policy.ts';

const env={VERCEL:'1',VERCEL_ENV:'preview',VERCEL_URL:'qa-build-project.vercel.app',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),CCTV_PUBLIC_PREVIEW_COMMIT:'a'.repeat(40),CCTV_PUBLIC_PREVIEW_ORIGIN:'https://qa-build-project.vercel.app'};
test('preview policy is OFF without explicit exact-deployment configuration and cannot affect production',()=>{
 for(const override of [{VERCEL:undefined},{VERCEL_ENV:undefined},{VERCEL_ENV:'production'},{VERCEL_ENV:'development'},{VERCEL_URL:'other-project.vercel.app'},{CCTV_PUBLIC_PREVIEW_ORIGIN:undefined},{CCTV_PUBLIC_PREVIEW_COMMIT:undefined},{CCTV_PUBLIC_PREVIEW_COMMIT:'abc'},{VERCEL_GIT_COMMIT_SHA:'b'.repeat(40)}])assert.equal(configuredPreviewViewerApproval({...env,...override}),null);
 assert.equal(configuredPreviewViewerApproval({}),null);
 const approval=configuredPreviewViewerApproval(env);assert.ok(approval);assert.equal(approval.origin,env.CCTV_PUBLIC_PREVIEW_ORIGIN);
 assert.equal(viewerLocationAllowed(approval.origin,true,approval),true);
 assert.equal(viewerLocationAllowed(approval.origin,false,approval),false);
 assert.equal(viewerLocationAllowed('https://other-project.vercel.app',true,approval),false);
 for(const origin of ['https://funjeju.com','https://www.funjeju.com','https://funjejuv2.vercel.app'])assert.equal(viewerLocationAllowed(origin,true,null),true);
});
test('an exact platform branch alias is supported only for the separately approved commit',()=>{
 const branch={...env,VERCEL_BRANCH_URL:'qa-git-reviewed-project.vercel.app',CCTV_PUBLIC_PREVIEW_ORIGIN:'https://qa-git-reviewed-project.vercel.app'};
 assert.ok(configuredPreviewViewerApproval(branch));
 assert.equal(configuredPreviewViewerApproval({...branch,VERCEL_GIT_COMMIT_SHA:'b'.repeat(40)}),null);
 assert.equal(configuredPreviewViewerApproval({...branch,VERCEL_BRANCH_URL:'qa-git-other-project.vercel.app'}),null);
 assert.equal(configuredPreviewViewerApproval({...branch,VERCEL_BRANCH_URL:undefined}),null);
});
test('preview policy rejects noncanonical, insecure, credentialed, wildcard and lookalike origins',()=>{
 for(const origin of ['http://qa.vercel.app','https://qa.vercel.app/','https://qa.vercel.app?allow=1','https://qa.vercel.app#x','https://u:p@qa.vercel.app','https://qa.vercel.app:443','https://*.vercel.app','https://qa.vercel.app.evil.test','https://nested.qa.vercel.app','https://funjejuv2.vercel.app','https://funjeju.com','https://QA.vercel.app',' https://qa.vercel.app'])assert.equal(configuredPreviewViewerApproval({...env,VERCEL_URL:origin.replace(/^https:\/\//,''),CCTV_PUBLIC_PREVIEW_ORIGIN:origin}),null,origin);
});
test('public preview needs no clock/admin identity and old private-test settings cannot enable it',()=>{
 const approval=configuredPreviewViewerApproval(env);assert.deepEqual(approval,{origin:env.CCTV_PUBLIC_PREVIEW_ORIGIN});
 assert.ok(configuredPreviewViewerApproval({...env,ADMIN_SECRET:undefined}));
 assert.ok(configuredPreviewViewerApproval({...env,CCTV_PREVIEW_PLAYBACK_EXPIRES_AT:'expired'}));
 assert.equal(configuredPreviewViewerApproval({VERCEL:'1',VERCEL_ENV:'preview',VERCEL_URL:env.VERCEL_URL,VERCEL_GIT_COMMIT_SHA:env.VERCEL_GIT_COMMIT_SHA,CCTV_PREVIEW_PLAYBACK_ORIGIN:env.CCTV_PUBLIC_PREVIEW_ORIGIN,CCTV_PREVIEW_PLAYBACK_COMMIT:env.CCTV_PUBLIC_PREVIEW_COMMIT}),null);
});
