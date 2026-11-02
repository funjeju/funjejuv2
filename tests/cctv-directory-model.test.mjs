import { test } from 'node:test';
import assert from 'node:assert/strict';
import { model,legacy } from './helpers/directory-harness.mjs';
const m=model(),base=m.normalizeLegacy(legacy()),fields=m.fieldsFromEntry(base);
test('all legacy records default visible/unverified including inactive unknown cameras and missing coords',()=>{
 const list=m.mergeDirectory([legacy('not-in-launch'),legacy('disabled',{active:false,privateUnknown:'SECRET'})],[]);
 assert.equal(list.entries.length,2);assert.equal(list.pendingImportCount,2);for(const e of list.entries){assert.equal(e.visible,true);assert.equal(e.playbackStatus,'unverified');assert.equal(e.lat,null);assert.equal(e.lng,null)}assert.equal(JSON.stringify(list).includes('SECRET'),false);
});
test('unsafe legacy source retained only by caller snapshot; public/admin normalization strips it',()=>{
 const source=legacy('a',{originUrl:'http://8.8.8.8/live?token=SECRET',youtubeId:'bad',lat:999,lng:12});
 const e=m.normalizeLegacy(source);assert.equal(e.sourceUrl,'');assert.equal(e.viewerUrl,'');assert.equal(e.youtubeId,'');assert.equal(e.sourceRestricted,true);assert.equal(e.lat,null);assert.equal(source.data.originUrl.includes('SECRET'),true);
 const stored=m.projectStored({id:'a',version:'1',data:{...fields,sourceUrl:source.data.originUrl,legacySnapshot:source.data,private:'SECRET',revision:2}});assert.equal(JSON.stringify(stored).includes('SECRET'),false);
});
test('known Hallasan normalizes safe official page but never overrides restricted sources',()=>{
 assert.equal(m.normalizeLegacy(legacy('halla_1100')).viewerUrl,'https://www.jeju.go.kr/tool/halla/cctv_05.html');assert.equal(m.normalizeLegacy(legacy('halla_1100',{originUrl:'http://127.0.0.1/a'})).viewerUrl,'');
});
test('merge prefers overrides, preserves manual records and counts only truly missing ids',()=>{
 const stored=[{id:'a',version:'4',data:{...fields,name:'edited',visible:false,revision:2,origin:'legacy'}},{id:'manual',version:'5',data:{...fields,revision:1,origin:'manual'}}];
 const list=m.mergeDirectory([legacy('a'),legacy('b')],stored);assert.equal(list.entries.length,3);assert.equal(list.entries.find(e=>e.id==='a').name,'edited');assert.equal(list.pendingImportCount,1);
 assert.notEqual(list.importRevision,m.mergeDirectory([legacy('a'),legacy('b',{unknown:'changed'})],stored).importRevision);assert.notEqual(list.importRevision,m.mergeDirectory([legacy('a'),legacy('b')],[{...stored[0],version:'6'},stored[1]]).importRevision);
});
test('strict field allowlist, URL safety, status, coordinate pair and bounded strings',()=>{
 assert.equal(m.validateDirectoryFields(fields).name,fields.name);
 for(const override of [{revision:900},{legacySnapshot:{}},{name:''},{name:'x'.repeat(121)},{visible:'true'},{direction:'NE'},{playbackStatus:'live'},{lat:20,lng:null},{lat:NaN,lng:12},{lat:91,lng:12},{lat:20,lng:181},{sourceUrl:'http://localhost/a'},{viewerUrl:'https://8.8.8.8/a?secret=token'},{youtubeId:'bad'},{description:'secret\u0000'}])assert.throws(()=>m.validateDirectoryFields({...fields,...override}));
 assert.equal(m.validateDirectoryFields({...fields,lat:0,lng:0,youtubeId:'abcdefghijk'}).lat,0);
});
test('verification requires recent explicit observation; source/viewer edits cannot inherit verification',()=>{
 const now=Date.now(),verified={...base,playbackStatus:'verified',verifiedAt:new Date(now-1000).toISOString()};
 assert.equal(m.playbackAfterSave({...fields,playbackStatus:'verified'},verified,null,now).playbackStatus,'verified');
 for(const observation of [null,{observedPlayback:false,observedAt:new Date(now).toISOString()},{observedPlayback:true,observedAt:new Date(now+1).toISOString()},{observedPlayback:true,observedAt:new Date(now-900001).toISOString()}])assert.throws(()=>m.playbackAfterSave({...fields,playbackStatus:'verified'},base,observation,now));
 assert.equal(m.playbackAfterSave({...fields,playbackStatus:'verified',viewerUrl:'https://www.iana.org/viewer'},verified,null,now).playbackStatus,'unverified');
 assert.equal(m.playbackAfterSave({...fields,playbackStatus:'verified'},base,{observedPlayback:true,observedAt:new Date(now).toISOString()},now).playbackStatus,'verified');
});

test('all 57 sources survive pending import, hidden overrides and new records merge; zero coords retained',()=>{
 const sources=Array.from({length:57},(_,i)=>legacy('camera'+i,i===0?{lat:0,lng:0}:{}));
 const stored=[{id:'camera1',version:'4',data:{...fields,visible:false,revision:1}},{id:'new',version:'5',data:{...fields,revision:1,origin:'manual'}}];
 const list=m.mergeDirectory(sources,stored);assert.equal(list.legacyCount,57);assert.equal(list.pendingImportCount,56);assert.equal(list.entries.length,58);assert.equal(list.entries.find(e=>e.id==='camera0').lat,0);assert.equal(list.entries.find(e=>e.id==='camera0').lng,0);assert.equal(list.entries.find(e=>e.id==='camera2').lat,null);assert.equal(list.entries.find(e=>e.id==='camera2').direction,'');
 const pub=list.entries.filter(e=>e.visible).map(m.projectPublicDirectoryEntry);assert.equal(pub.length,57);
 for(const row of pub)for(const key of ['revision','origin','legacyId','legacySnapshot','importRevision'])assert.equal(key in row,false);
});
test('unsafe empty sources cannot be marked verified even with an observation',()=>{
 const entry=m.normalizeLegacy(legacy('unsafe',{originUrl:'http://8.8.8.8/a?token=SECRET'}));
 assert.throws(()=>m.playbackAfterSave({...m.fieldsFromEntry(entry),playbackStatus:'verified'},entry,{observedPlayback:true,observedAt:new Date().toISOString()},Date.now()));
});
test('selected identity unifies Vurix quality variants per authority but never shared viewer pages',()=>{
 const identity=sourceUrl=>m.directorySourceIdentity({sourceUrl,youtubeId:''});
 assert.equal(identity('http://8.8.8.8:8080/media/api/v1/hls/vurix/1/2/0/0/index.m3u8'),identity('https://8.8.8.8:8080/media/api/v1/hls/vurix/1/2/1/9/alternate.m3u8'));
 assert.equal(identity('http://8.8.8.8/media/api/v1/hls/vurix/%31/%32/low'),identity('http://8.8.8.8/media/api/v1/hls/vurix/1/2/high'));
 assert.notEqual(identity('http://8.8.8.8/media/api/v1/hls/vurix/1/2/x'),identity('http://8.8.4.4/media/api/v1/hls/vurix/1/2/x'));
 assert.notEqual(identity('http://8.8.8.8:80/media/api/v1/hls/vurix/1/2/x'),identity('http://8.8.8.8:8080/media/api/v1/hls/vurix/1/2/x'));
 assert.equal(m.directorySourceIdentity({sourceUrl:'',youtubeId:'',viewerUrl:'https://www.jeju.go.kr/tool/halla/cctv_01.html'}),null);
 assert.equal(m.directorySourceIdentity({sourceUrl:'http://8.8.8.8/a',youtubeId:'abcdefghijk'}),'youtube:abcdefghijk');
 assert.equal(identity('http://8.8.8.8/a?token=private'),null);
});
