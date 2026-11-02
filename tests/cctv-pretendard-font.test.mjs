import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
test('Pretendard uses matching self-hosted variable family with visible fallback', () => {
 const css=read('app/globals.css').toString(),layout=read('app/layout.tsx').toString();
 assert.match(css,/@font-face\s*\{[^}]*font-family:\s*"Pretendard Variable"/);
 assert.match(css,/--font-sans:\s*"Pretendard Variable",\s*Pretendard/);
 assert.match(css,/font-display:\s*swap/);
 assert.match(css,/font-weight:\s*45 920/);
 const path='/fonts/pretendard/PretendardVariable-v1.3.9.woff2';
 assert.ok(css.includes(path)); assert.ok(layout.includes(path));
 assert.match(layout,/rel="preload"[\s\S]*as="font"[\s\S]*crossOrigin="anonymous"/);
 assert.doesNotMatch(layout,/cdn\.jsdelivr\.net\/gh\/orioncactus/);
});
test('distributed Pretendard remains the unmodified official licensed WOFF2',()=>{
 const font=read('public/fonts/pretendard/PretendardVariable-v1.3.9.woff2');
 assert.equal(font.toString('ascii',0,4),'wOF2'); assert.equal(font.readUInt32BE(8),font.length);
 assert.equal(createHash('sha256').update(font).digest('hex'),'9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4');
 assert.equal(createHash('sha256').update(read('public/fonts/pretendard/LICENSE.txt')).digest('hex'),'d31ddd9f2bed32fd7e302a205cf2380ba0de6529152d239ef99cfb6f261bfc04');
});
