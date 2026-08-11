import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = `import {createManifest,createRun,advanceRun,seedToState} from './src/kernel/index.js'; const a={id:'x',version:'1',transition(s,i,p){return {state:{v:s.v+i.data.d,r:p.nextInt(99)},events:[]}}}; const m=createManifest({model:{id:'x',version:'1'},initialState:{v:0,r:0},initialPrngState:seedToState(44),inputs:[{stepId:'a',type:'t',data:{d:2}},{stepId:'b',type:'t',data:{d:3}}],normalization:{id:'v1',scales:{}}}); let r=createRun(m,a); for(const i of m.inputs)r=advanceRun(r,i); console.log(JSON.stringify(r.ledger));`;

test('fresh Node processes produce byte-identical complete receipt chains', () => {
  const run = () => execFileSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: root, encoding: 'utf8' });
  assert.equal(run(), run());
});
