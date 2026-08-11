import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function source(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

test('isolated Trustscape HTML declares its experimental verified-data boundary', async () => {
  const html = await source('trustscape.html');
  assert.match(html, /Experimental verified-data viewer/);
  assert.match(html, /id="projection-file"/);
  assert.match(html, /id="trustscape-canvas"/);
  assert.match(html, /type="module" src="\.\/src\/trustscape\/app\.js"/);
  assert.match(html, /styles\/trustscape\.css/);
  assert.doesNotMatch(html, /<script(?![^>]*type="module"[^>]*src=)[^>]*>/);
});

test('Trustscape app uses the browser verifier and renderer without importing kernel or projector modules', async () => {
  const app = await source('src/trustscape/app.js');
  assert.match(app, /from '\.\/browser-core\.js'/);
  assert.match(app, /from '\.\/renderer\.js'/);
  assert.match(app, /verifyProjectionInBrowser/);
  assert.match(app, /createBrowserRenderModel/);
  assert.match(app, /localStorage/);
  assert.doesNotMatch(app, /\.\.\/kernel\//);
  assert.doesNotMatch(app, /\.\.\/projector\//);
});

test('renderer requires WebGL2 and never fabricates random coordinates', async () => {
  const renderer = await source('src/trustscape/renderer.js');
  assert.match(renderer, /getContext\(['"]webgl2['"]/);
  assert.match(renderer, /gl\.LINES/);
  assert.match(renderer, /gl\.POINTS/);
  assert.doesNotMatch(renderer, /Math\s*\.\s*random/);
});

test('legacy browser authority remains isolated from Trustscape Lite', async () => {
  const legacyHtml = await source('index.html');
  const legacyApp = await source('src/app.js');
  assert.doesNotMatch(legacyHtml, /trustscape/i);
  assert.doesNotMatch(legacyApp, /trustscape/i);
  assert.doesNotMatch(legacyApp, /projector/i);
});
