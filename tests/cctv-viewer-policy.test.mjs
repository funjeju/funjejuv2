import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configuredPreviewViewerApproval, viewerLocationAllowed, MAX_PREVIEW_VIEWER_MS } from '../lib/cctv-viewer-policy.ts';

const now=Date.parse('2026-11-02T00:00:00.000Z');
const env={VERCEL:'1',VERCEL_ENV:'preview',VERCEL_URL:'qa-build-project.vercel.app',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),CCTV_PREVIEW_PLAYBACK_COMMIT:'a'.repeat(40),CCTV_PREVIEW_PLAYBACK_ORIGIN:'https://qa-build-project.vercel.app',CCTV_PREVIEW_PLAYBACK_APPROVED_AT:new Date(now-1000).toISOString(),CCTV_PREVIEW_PLAYBACK_EXPIRES_AT:new Date(now+60_000).toISOString()};
test('preview policy is OFF without explicit exact-deployment configuration and cannot affect production',()=>{
 for(const override of [{VERCEL:undefined},{VERCEL_ENV:undefined},{VERCEL_ENV:'production'},{VERCEL_ENV:'development'},{VERCEL_URL:'other-project.vercel.app'},{CCTV_PREVIEW_PLAYBACK_ORIGIN:undefined},{CCTV_PREVIEW_PLAYBACK_COMMIT:undefined},{CCTV_PREVIEW_PLAYBACK_COMMIT:'abc'},{VERCEL_GIT_COMMIT_SHA:'b'.repeat(40)}])assert.equal(configuredPreviewViewerApproval({...env,...override},now),null);
 assert.equal(configuredPreviewViewerApproval({},now),null);
 const approval=configuredPreviewViewerApproval(env,now);assert.ok(approval);assert.equal(approval.origin,env.CCTV_PREVIEW_PLAYBACK_ORIGIN);
 assert.equal(viewerLocationAllowed(approval.origin,true,approval,now),true);
 assert.equal(viewerLocationAllowed(approval.origin,false,approval,now),false);
 assert.equal(viewerLocationAllowed('https://other-project.vercel.app',true,approval,now),false);
 for(const origin of ['https://funjeju.com','https://www.funjeju.com','https://funjejuv2.vercel.app'])assert.equal(viewerLocationAllowed(origin,true,null,now),true);
});
test('an exact platform branch alias is supported only for the separately approved commit',()=>{
 const branch={...env,VERCEL_BRANCH_URL:'qa-git-reviewed-project.vercel.app',CCTV_PREVIEW_PLAYBACK_ORIGIN:'https://qa-git-reviewed-project.vercel.app'};
 assert.ok(configuredPreviewViewerApproval(branch,now));
 assert.equal(configuredPreviewViewerApproval({...branch,VERCEL_GIT_COMMIT_SHA:'b'.repeat(40)},now),null);
 assert.equal(configuredPreviewViewerApproval({...branch,VERCEL_BRANCH_URL:'qa-git-other-project.vercel.app'},now),null);
 assert.equal(configuredPreviewViewerApproval({...branch,VERCEL_BRANCH_URL:undefined},now),null);
});
test('preview policy rejects noncanonical, insecure, credentialed, wildcard and lookalike origins',()=>{
 for(const origin of ['http://qa.vercel.app','https://qa.vercel.app/','https://qa.vercel.app?allow=1','https://qa.vercel.app#x','https://u:p@qa.vercel.app','https://qa.vercel.app:443','https://*.vercel.app','https://qa.vercel.app.evil.test','https://nested.qa.vercel.app','https://funjejuv2.vercel.app','https://funjeju.com','https://QA.vercel.app',' https://qa.vercel.app'])assert.equal(configuredPreviewViewerApproval({...env,VERCEL_URL:origin.replace(/^https:\/\//,''),CCTV_PREVIEW_PLAYBACK_ORIGIN:origin},now),null,origin);
});
test('approval has a fixed maximum 30 minute interval and fails closed at expiry or malformed dates',()=>{
 for(const override of [{CCTV_PREVIEW_PLAYBACK_APPROVED_AT:new Date(now+1).toISOString()},{CCTV_PREVIEW_PLAYBACK_EXPIRES_AT:new Date(now).toISOString()},{CCTV_PREVIEW_PLAYBACK_EXPIRES_AT:new Date(now-1001).toISOString()},{CCTV_PREVIEW_PLAYBACK_EXPIRES_AT:new Date(now+MAX_PREVIEW_VIEWER_MS).toISOString()},{CCTV_PREVIEW_PLAYBACK_EXPIRES_AT:'invalid'},{CCTV_PREVIEW_PLAYBACK_APPROVED_AT:'2026-11-02'},{CCTV_PREVIEW_PLAYBACK_APPROVED_AT:undefined}])assert.equal(configuredPreviewViewerApproval({...env,...override},now),null);
 const approval=configuredPreviewViewerApproval(env,now);assert.equal(viewerLocationAllowed(approval.origin,true,approval,approval.expiresAt),false);
 assert.equal(configuredPreviewViewerApproval({...env,CCTV_PREVIEW_PLAYBACK_APPROVED_AT:new Date(now).toISOString(),CCTV_PREVIEW_PLAYBACK_EXPIRES_AT:new Date(now+MAX_PREVIEW_VIEWER_MS).toISOString()},now)?.expiresAt,now+MAX_PREVIEW_VIEWER_MS);
});
