/**
 * Node test for Twin Pines / Lone Pine visibility rules.
 * Run: node js/tests/butterfly-rules.test.mjs
 */

import { pineVisible, mallSignState } from '../temporal/ButterflyEffectManager.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(pineVisible('1885', false) === true, 'pine stands in 1885');
assert(pineVisible('1885', true) === false, 'destroyed pine gone in 1885');
assert(pineVisible('1955', false) === true, 'pine still in 1955 if intact');
assert(pineVisible('1955', true) === false, 'no pine in 1955 after 1885 hit');
assert(pineVisible('1985', false) === false, 'no farm pine in 1985');

let signs = mallSignState('1985', false);
assert(signs.twin === true && signs.lone === false, 'Twin Pines mall when tree lives');

signs = mallSignState('1985', true);
assert(signs.twin === false && signs.lone === true, 'Lone Pine mall after 1885 hit');

signs = mallSignState('1955', false);
assert(signs.twin === true && signs.lone === false, '1955 still Twin Pines');

console.log('butterfly-rules.test.mjs: ok');
