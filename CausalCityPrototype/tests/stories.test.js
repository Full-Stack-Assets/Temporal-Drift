import test from 'node:test';
import assert from 'node:assert/strict';

import { simulateBranch } from '../src/simulation.js';
import { generateStories } from '../src/stories.js';

test('citizen stories are reproducible', () => {
  const result = simulateBranch('reinvention', 12);
  assert.deepEqual(generateStories(result, 2036, 3), generateStories(result, 2036, 3));
});

test('story copy responds to branch conditions', () => {
  const shutdown = generateStories(simulateBranch('shutdown'), 2036, 8).map((story) => story.body).join(' ');
  const reinvention = generateStories(simulateBranch('reinvention'), 2036, 8).map((story) => story.body).join(' ');
  assert.notEqual(shutdown, reinvention);
  assert.match(reinvention, /training|riverfront|manufacturing|university/i);
});
