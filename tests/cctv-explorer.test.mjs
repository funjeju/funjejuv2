import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterCctvs } from '../lib/cctv-explorer.ts';
const entries = [
  { id:'a', name:'함덕해변', region:'제주시', direction:'북', category:'해변', description:'바다와 모래', active:true },
  { id:'b', name:'성산항', region:'서귀포시', direction:'동', category:'항구', description:'배와 바다', active:true },
  { id:'c', name:'함덕2', region:'제주시', direction:'북', category:'해변', description:'', active:false },
];
const empty = { query:'',direction:'',category:'' };
test('inactive records remain excluded',()=>assert.deepEqual(filterCctvs(entries,empty).map(x=>x.id),['a','b']));
test('search matches camera region category description and every term',()=>{
 assert.deepEqual(filterCctvs(entries,{...empty,query:'제주시 바다'}).map(x=>x.id),['a']);
 assert.deepEqual(filterCctvs(entries,{...empty,query:'항구'}).map(x=>x.id),['b']);
});
test('direction and category filters compose',()=>{
 assert.deepEqual(filterCctvs(entries,{query:'바다',direction:'동',category:'항구'}).map(x=>x.id),['b']);
 assert.equal(filterCctvs(entries,{query:'',direction:'동',category:'해변'}).length,0);
});
test('empty inventory is never filled with mocks',()=>assert.deepEqual(filterCctvs([],empty),[]));
