import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../app/cctv-wind.css',import.meta.url),'utf8');
test('focused shell has a neutral palette without filtering scenic photos or entire UI',()=>{
 for(const [hex] of css.matchAll(/#[0-9a-f]{6}(?:[0-9a-f]{2})?\b/gi))assert.equal(new Set([hex.slice(1,3),hex.slice(3,5),hex.slice(5,7)]).size,1,hex);
 assert.match(css,/\.wind-explorer\.cctv-explorer a:focus-visible/);
 assert.match(css,/--wind-ink:#171717/);assert.match(css,/\.wind-sidebar\s*\{[^}]*background:#171717/s);
 assert.match(css,/\.wind-map-canvas \.leaflet-tile-pane\s*\{\s*filter:grayscale\(1\)/);
 assert.doesNotMatch(css,/\.wind-camera-thumb[^}]*filter:/);assert.match(css,/\.wind-thumbnail-label[^}]*background:#171717e8[^}]*color:#fff/);
});
test('compact map pins use neutral readable white on black, retaining old route marker styling',()=>{
 const map=readFileSync(new URL('../components/cctv/CctvMap.tsx',import.meta.url),'utf8');
 assert.match(map,/background:#171717;color:#ffffff/);assert.match(map,/camera.listOrdinal/);
 assert.match(map,/background:#172524;color:#d9ff60/);
});
