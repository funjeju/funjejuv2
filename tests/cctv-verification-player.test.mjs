import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const nodes=v=>!v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children)];
const text=v=>v==null||typeof v==='boolean'?'':typeof v!=='object'?String(v):Array.isArray(v)?v.map(text).join(' '):text(v.props?.children);
function harness({supported=true,denyDuringLoad=false,budgetExhausted=false,nativeSupported=true}={}){
  const instances=[],refs=[],states=[],sessions=[],videoEvents=new Map(),windowEvents=new Map(),documentEvents=new Map();
  let stateCursor=0,refCursor=0,effects=[],mounted=[],beacons=0,fetches=0,observer,playCalls=0,srcAssignments=0,rejectPlay=false;
  const events=map=>({addEventListener:(e,f)=>map.set(e,f),removeEventListener:e=>map.delete(e)});
  const video={...events(videoEvents),paused:true,muted:true,pause(){this.paused=true},play(){playCalls++;this.paused=false;return rejectPlay?Promise.reject(new Error('autoplay refused')):Promise.resolve()},removeAttribute(){},load(){},canPlayType(){return nativeSupported?'probably':''},set src(v){srcAssignments++}};
  class Hls {
    static Events={ERROR:'error',MANIFEST_PARSED:'parsed'};
    static ErrorTypes={NETWORK_ERROR:'networkError',MEDIA_ERROR:'mediaError'};
    static isSupported(){return supported}
    constructor(config){this.config=config;this.handlers={};this.starts=0;this.recovers=0;this.destroyed=0;this.loads=0;this.attaches=0;instances.push(this)}
    on(e,f){this.handlers[e]=f}
    loadSource(){this.loads++;if(denyDuringLoad)this.handlers.error('error',{type:'networkError',fatal:false,response:{code:403}})}
    attachMedia(){this.attaches++}
    startLoad(){this.starts++}
    stopLoad(){}
    recoverMediaError(){this.recovers++}
    destroy(){this.destroyed++}
  }
  const jsx=(type,props,key)=>{if(type==='video')props.ref.current=video;return {type,props,key}};
  const deps={react:{useRef:value=>{const i=refCursor++;return refs[i]??(refs[i]={current:value})},useState:value=>{const i=stateCursor++;if(!(i in states))states[i]=value;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v}]},useEffect:(fn,deps)=>effects.push({fn,deps})},'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'@/lib/cctv-playback-health':{observePlayback:(_v,h)=>{observer=h;return()=>{observer=null}}},'@/hooks/useCctvSession':{useCctvSession:p=>sessions.push(p)},'@/hooks/useWatchBudget':{useWatchBudget:()=>({exhausted:budgetExhausted,unlimited:!budgetExhausted,usedSeconds:budgetExhausted?9999:0}),fmtDuration:()=>''},'hls.js':{__esModule:true,default:Hls}};
  const source=readFileSync(new URL('../components/cctv/HlsPlayer.tsx',import.meta.url),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const mod={exports:{}},document={hidden:false,...events(documentEvents)};
  vm.runInNewContext(code,{exports:mod.exports,module:mod,URL,window:events(windowEvents),document,navigator:{sendBeacon(){beacons++}},fetch(){fetches++;throw Error('NETWORK_FORBIDDEN')},require:n=>{assert.ok(n in deps,n);return deps[n]}});
  const props={proxyUrl:'https://proxy.example.test/cctv/synthetic',label:'synthetic',cctvId:'supplied-id',cctvName:'supplied-name',verificationMode:true};
  return {
    instances,sessions,video,document,
    render(overrides={}){stateCursor=0;refCursor=0;effects=[];return nodes(mod.exports.HlsPlayer({...props,...overrides}))},
    commit(){effects.forEach((e,i)=>{const old=mounted[i];if(!old||e.deps.some((v,j)=>!Object.is(v,old.deps[j]))){old?.cleanup?.();mounted[i]={deps:e.deps,cleanup:e.fn()}}})},
    unmount(){mounted.forEach(e=>e.cleanup?.())},
    async flush(){await new Promise(r=>setImmediate(r))},
    deny(code=403,fatal=false){instances.at(-1).handlers.error('error',{type:'networkError',fatal,response:{code}})},
    error:data=>instances.at(-1).handlers.error('error',data),
    failObservation:()=>observer?.onFailure(),
    emitVideo:e=>videoEvents.get(e)?.(),emitDocument:e=>documentEvents.get(e)?.(),emitWindow:e=>windowEvents.get(e)?.(),progress:()=>observer?.onProgress(),
    rejectPlay:()=>{rejectPlay=true},get playCalls(){return playCalls},get srcAssignments(){return srcAssignments},get beacons(){return beacons},get fetches(){return fetches},
  };
}
const policies=['manifestLoadPolicy','playlistLoadPolicy','fragLoadPolicy','keyLoadPolicy','certLoadPolicy','steeringManifestLoadPolicy','interstitialAssetListLoadPolicy'];
test('QA disables all installed HLS retry policies and optional external-playback systems',async()=>{
  const h=harness();h.render();h.commit();await h.flush();const config=h.instances[0].config;
  for(const key of policies){assert.equal(config[key].default.errorRetry,null,key);assert.equal(config[key].default.timeoutRetry,null,key);assert.equal(config[key].default.maxTimeToFirstByteMs,8000);assert.equal(config[key].default.maxLoadTimeMs,12000)}
  for(const key of ['manifestLoadingMaxRetry','levelLoadingMaxRetry','fragLoadingMaxRetry'])assert.equal(config[key],0);
  assert.equal(config.enableInterstitialPlayback,false);assert.equal(config.emeEnabled,false);assert.equal(config.contentSteeringController,undefined);h.unmount();
});
test('nonfatal/fatal access denial and every network error are terminal with no automatic/manual revival',async()=>{
  for(const code of [0,401,403,404,500])for(const fatal of [false,true]){
    const h=harness();let all=h.render();h.commit();await h.flush();const instance=h.instances[0];h.deny(code,fatal);
    assert.equal(instance.destroyed,1);assert.equal(instance.starts,0);
    h.emitVideo('stalled');h.emitVideo('loadedmetadata');h.emitDocument('visibilitychange');h.deny(code,true);
    all=h.render();const plays=h.playCalls;all.find(n=>n.type==='video').props.onClick();await h.flush();
    assert.equal(h.playCalls,plays);assert.equal(instance.starts,0);assert.equal(instance.recovers,0);
    assert.equal(all.some(n=>n.type==='button'&&text(n).includes('재연결')),false);
    assert.ok(text(all).includes('재시도하지 말고'));
    h.render({proxyUrl:'https://proxy.example.test/cctv/changed'});h.commit();await h.flush();
    assert.equal(h.instances.length,1,'an in-mount prop/effect refresh must not reset the stop latch');
    h.unmount();assert.equal(h.beacons,0);assert.equal(h.fetches,0);
  }
});
test('denial handler is installed before loadSource and prevents subsequent media attachment',async()=>{
  const h=harness({denyDuringLoad:true});h.render();h.commit();await h.flush();const i=h.instances[0];assert.equal(i.loads,1);assert.equal(i.destroyed,1);assert.equal(i.attaches,0);assert.equal(i.starts,0);h.unmount();
});
test('public preview and production both support native HLS when MSE is unavailable',async()=>{
  for(const verificationMode of [true,false]){
   const h=harness({supported:false});h.render({verificationMode});h.commit();await h.flush();
   assert.equal(h.instances.length,0);assert.equal(h.srcAssignments,1);
   h.emitVideo('loadedmetadata');await h.flush();assert.ok(h.playCalls>0);h.unmount();
  }
});
test('QA suppresses player telemetry even when caller accidentally supplies identity',async()=>{
  const h=harness();h.render();h.commit();await h.flush();h.progress();h.emitVideo('playing');h.emitWindow('pagehide');h.render();
  assert.equal(h.sessions.at(-1).cctvId,null);assert.equal(h.sessions.at(-1).cctvName,undefined);h.unmount();assert.equal(h.beacons,0);assert.equal(h.fetches,0);
});
test('failed QA user-play promise stops the current closure and cannot reconnect on visibility/stall',async()=>{
  const h=harness();let all=h.render();h.commit();await h.flush();h.rejectPlay();all.find(n=>n.type==='video').props.onClick();await h.flush();
  const i=h.instances[0],starts=i.starts;assert.equal(i.destroyed,1);h.emitVideo('stalled');h.emitDocument('visibilitychange');all=h.render();all.find(n=>n.type==='video').props.onClick();await h.flush();assert.equal(i.starts,starts);assert.equal(h.instances.length,1);h.unmount();
});
test('production defaults and existing network recovery remain unchanged',async()=>{
  const h=harness();h.render({verificationMode:false});h.commit();await h.flush();const i=h.instances[0];assert.equal(i.config.manifestLoadingMaxRetry,4);assert.equal(i.config.levelLoadingMaxRetry,4);assert.equal(i.config.fragLoadingMaxRetry,6);for(const p of policies)assert.equal(i.config[p],undefined);
  h.deny(403,true);assert.equal(i.starts,1);assert.equal(i.destroyed,0);h.emitVideo('playing');assert.equal(h.beacons,1);h.unmount();
});

test('public preview cannot be masked by cached consumer budget; production still enforces it',async()=>{
  const qa=harness({budgetExhausted:true});let nodes=qa.render();qa.commit();await qa.flush();
  assert.equal(text(nodes).includes('오늘 시청시간을 다 썼어요'),false);
  nodes.find(n=>n.type==='video').props.onClick();await qa.flush();assert.ok(qa.playCalls>0);qa.unmount();
  const prod=harness({budgetExhausted:true});nodes=prod.render({verificationMode:false});prod.commit();await prod.flush();
  assert.equal(text(nodes).includes('오늘 시청시간을 다 썼어요'),true);
  nodes.find(n=>n.type==='video').props.onClick();assert.equal(prod.playCalls,0);prod.unmount();
});

const diagnostic=all=>text(all.find(n=>n.props?.['data-preview-diagnostic']==='true'));
test('preview diagnostic exposes only configured hostname, static category and valid HTTP status',async()=>{
 for(const code of [403,502,0,NaN,Infinity,-1,600,403.5,'403','secret-token']){
  const h=harness();const proxyUrl='https://username:password@proxy.example.test:8443/private-token?key=secret#fragment';
  h.render({proxyUrl});h.commit();await h.flush();
  h.error({type:'networkError',fatal:false,response:{code,url:'https://secret-upstream.test/token'},details:'secret-details',error:new Error('secret-exception')});
  const all=h.render({proxyUrl}),message=diagnostic(all);
  assert.ok(message.includes('proxy.example.test'));assert.ok(message.includes('network'));
  assert.ok(message.includes([403,502].includes(code)?String(code):'확인 불가'));
  for(const secret of ['username','password','8443','private-token','secret','fragment','https://'])assert.equal(message.includes(secret),false,secret);
  assert.equal(h.instances[0].starts,0);assert.equal(h.instances[0].destroyed,1);h.unmount();
 }
});
test('preview diagnostics distinguish media, unsupported native and play rejection without raw errors',async()=>{
 const media=harness();media.render();media.commit();await media.flush();media.error({type:'mediaError',fatal:true,response:{code:403},details:'private'});
 assert.ok(diagnostic(media.render()).includes('media'));assert.ok(diagnostic(media.render()).includes('확인 불가'));media.unmount();
 const native=harness({supported:false,nativeSupported:false});native.render();native.commit();await native.flush();assert.ok(diagnostic(native.render()).includes('native-unsupported'));assert.equal(native.srcAssignments,0);native.unmount();
 const play=harness();let all=play.render();play.commit();await play.flush();play.rejectPlay();all.find(n=>n.type==='video').props.onClick();await play.flush();assert.ok(diagnostic(play.render()).includes('play-failure'));assert.equal(diagnostic(play.render()).includes('autoplay refused'),false);play.unmount();
 const invalid=harness();invalid.render({proxyUrl:'not a URL secret'});invalid.commit();await invalid.flush();invalid.failObservation();assert.ok(diagnostic(invalid.render()).includes('unavailable'));invalid.unmount();
});
test('production errors never display preview diagnostics',async()=>{
 const h=harness();h.render({verificationMode:false});h.commit();await h.flush();h.error({type:'other',fatal:true,response:{code:403}});
 assert.equal(diagnostic(h.render({verificationMode:false})),'');h.unmount();
});
