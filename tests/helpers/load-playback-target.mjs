import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

export function loadPlaybackTarget(window = undefined) {
  const load = (path, require = () => { throw new Error('Unexpected import'); }) => {
    const mod = { exports: {} };
    const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { exports: mod.exports, module: mod, URL, window, require });
    return mod.exports;
  };
  const constants = load('../../constants/vurix.ts');
  const direct = load('../../lib/cctv-direct-link.ts');
  return load('../../lib/cctv-playback-target.ts', name => {
    if (name === '@/lib/cctv-direct-link') return direct;
    if (name !== '@/constants/vurix') throw new Error(`Unexpected import: ${name}`);
    return constants;
  });
}
