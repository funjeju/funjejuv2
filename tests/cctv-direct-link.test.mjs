import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directCameraSourceUrl, directCameraViewerUrl } from '../lib/cctv-direct-link.ts';
const direct=originUrl=>directCameraSourceUrl({active:true,originUrl});
test('public HTTP/HTTPS source navigation accepts manifests and provider pages without claiming playback',()=>{
 for(const url of ['http://8.8.8.8/live.m3u8','https://8.8.4.4:8443/master.m3u8','https://www.iana.org/viewer.html','https://www.iana.org/camera'])assert.equal(direct(url),url);
 assert.equal(direct('HTTPS://WWW.IANA.ORG:443/viewer.html'),'https://www.iana.org/viewer.html');
});
test('direct source requires active authoritative metadata, not summary or YouTube fallback',()=>{
 for(const camera of [{},{active:false,originUrl:'http://8.8.8.8/a'},{originUrl:'http://8.8.8.8/a'},{active:true,originUrl:'http://8.8.8.8/a',youtubeId:'video'}])assert.equal(directCameraSourceUrl(camera),null);
 for(const originUrl of [null,12,{},[],undefined])assert.equal(directCameraSourceUrl({active:true,originUrl}),null);
});
test('direct sources reject credentials, queries, fragments and URL normalization tricks',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,hi','file:///a','ftp://8.8.8.8/a','//8.8.8.8/a','https:8.8.8.8/a','http://user:password@8.8.8.8/a','http://8.8.8.8/a?key=secret','http://8.8.8.8/a?','http://8.8.8.8/a#fragment','http://8.8.8.8/a#',' http://8.8.8.8/a','http://8.8.8.8/a\n','http://8.8.8.8/a%0a','http://8.8.8.8/a%1F','http://8.8.8.8/a%7f','http://8.8.8.8\\@127.0.0.1/a'])assert.equal(direct(url),null,url);
});
test('private, local and reserved address forms fail closed after URL parsing',()=>{
 for(const host of ['0.0.0.0','10.1.2.3','127.0.0.1','127.1','2130706433','0x7f000001','0177.0.0.1','100.64.0.1','100.127.255.254','169.254.169.254','172.16.0.1','172.31.255.254','192.168.1.1','192.0.0.1','192.0.2.1','192.88.99.1','198.18.0.1','198.19.255.254','198.51.100.1','203.0.113.1','224.0.0.1','240.0.0.1','255.255.255.255','[::1]','[::ffff:8.8.8.8]','localhost','localhost.','camera.localhost','camera.local','camera.internal','camera.home.arpa','camera.lan','camera.test','camera.invalid','example.com','sub.example.org','camera.onion','camera.alt','camera'])assert.equal(direct(`http://${host}/live.m3u8`),null,host);
});

test('five exact Hallasan ids select verified provider HTML only after source validation',()=>{
 const ids=['halla_baengnokdam','halla_wanggwanneung','halla_witse','halla_eoseungsaeng','halla_1100'];
 ids.forEach((id,index)=>{
  const camera={id,active:true,originUrl:'http://8.8.8.8/live.m3u8'};
  assert.equal(directCameraSourceUrl(camera),camera.originUrl);
  assert.equal(directCameraViewerUrl(camera),`https://www.jeju.go.kr/tool/halla/cctv_0${index+1}.html`);
  for(const override of [{active:false},{active:undefined},{originUrl:'http://127.0.0.1/a'},{originUrl:'http://8.8.8.8/a?token=secret'},{originUrl:undefined},{youtubeId:'video'}])assert.equal(directCameraViewerUrl({...camera,...override}),null);
 });
 for(const id of [undefined,'unknown','HALLA_1100','halla_1100_extra','__proto__','constructor','toString']){
  const camera={id,active:true,originUrl:'http://8.8.8.8/live.m3u8'};assert.equal(directCameraViewerUrl(camera),camera.originUrl);
 }
});
