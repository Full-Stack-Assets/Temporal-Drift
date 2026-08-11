import { verifyTrustscapeFixture } from './browser-integrity.js';
import { createTrustscapeRenderer } from './renderer-webgl2.js';
import { appendAnnotation, exportAnnotations, importAnnotations, loadAnnotations } from './local-annotations.js';

const fixtureResponse = await fetch('./data/trustscape-lite-fixture.json', { cache: 'no-store' });
if (!fixtureResponse.ok) throw new Error(`Trustscape fixture unavailable: HTTP ${fixtureResponse.status}`);
const fixture = await fixtureResponse.json();
if (!await verifyTrustscapeFixture(fixture)) throw new Error('Trustscape fixture failed runtime integrity verification');

const canvas = document.querySelector('#trustscape-canvas');
const fallback = document.querySelector('#fallback-view');
const timeSlider = document.querySelector('#time-slider');
const timeOutput = document.querySelector('#time-output');
const branchA = document.querySelector('#branch-a');
const branchB = document.querySelector('#branch-b');
const showAll = document.querySelector('#show-all');
const evidenceList = document.querySelector('#evidence-list');
const inspector = document.querySelector('#inspector');
const radarList = document.querySelector('#radar-list');
const annotationForm = document.querySelector('#annotation-form');
const targetInput = document.querySelector('#target-id');
const authorInput = document.querySelector('#author-id');
const bodyInput = document.querySelector('#annotation-body');
const exportButton = document.querySelector('#export-annotations');
const importInput = document.querySelector('#import-annotations');

const renderer = createTrustscapeRenderer(canvas);
let selectedPoint = null;
let showAllBranches = true;
let annotations = await loadAnnotations(fixture.graphId);
const maxTime = Math.max(...fixture.points.map((point) => point.t), 0);
const positiveTimes = fixture.points.filter((point) => point.t > 0).map((point) => point.t);
const stepSize = positiveTimes.length ? Math.max(1, Math.min(...positiveTimes)) : 1;
timeSlider.max = String(maxTime);
timeSlider.step = String(stepSize);
timeSlider.value = String(maxTime);
timeOutput.value = String(maxTime);

document.querySelector('#projection-hash').textContent = fixture.sourceProjectionHash;
document.querySelector('#graph-id').textContent = fixture.graphId;
document.querySelector('#graph-hash').textContent = fixture.sourceGraphHash;
document.querySelector('#scene-hash').textContent = fixture.sourceSceneHash;

function optionFor(branch) {
  const option = document.createElement('option');
  option.value = branch.branchId;
  option.textContent = `${branch.label} · ${branch.branchId.slice(0, 15)}…`;
  return option;
}

for (const branch of fixture.branches) {
  branchA.append(optionFor(branch));
  branchB.append(optionFor(branch));
}
if (fixture.branches.length > 1) branchB.selectedIndex = 1;

function activeBranches() {
  if (showAllBranches) return fixture.branches.map((branch) => branch.branchId);
  return [...new Set([branchA.value, branchB.value].filter(Boolean))];
}

function visiblePoints() {
  const branches = new Set(activeBranches());
  const max = Number(timeSlider.value);
  return fixture.points.filter((point) => branches.has(point.branchId) && point.t <= max);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function renderFallback(points) {
  fallback.innerHTML = `
    <p>WebGL2 is unavailable. Deterministic evidence table fallback is active.</p>
    <table><thead><tr><th>Branch</th><th>Step</th><th>T</th><th>State hash</th></tr></thead>
    <tbody>${points.map((point) => `<tr><td>${escapeHtml(point.branchId.slice(0, 16))}…</td><td>${escapeHtml(point.stepId)}</td><td>${point.t}</td><td><code>${escapeHtml(point.stateHash.slice(0, 16))}…</code></td></tr>`).join('')}</tbody></table>`;
}

function branchLabel(branchId) {
  return fixture.branches.find((branch) => branch.branchId === branchId)?.label ?? branchId;
}

function renderEvidenceList() {
  const points = visiblePoints().sort((a, b) => a.t - b.t || a.branchId.localeCompare(b.branchId) || a.sequence - b.sequence);
  evidenceList.replaceChildren(...points.map((point) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'evidence-item';
    button.setAttribute('role', 'listitem');
    button.innerHTML = `<small>T${point.t}</small><span>${escapeHtml(branchLabel(point.branchId))} · ${escapeHtml(point.stepId)}</span>`;
    button.addEventListener('click', () => selectPoint(point));
    return button;
  }));
}

function selectPoint(point) {
  selectedPoint = point;
  targetInput.value = point.nodeId;
  inspector.classList.remove('empty');
  inspector.innerHTML = `<dl>
    <div><dt>Branch</dt><dd>${escapeHtml(branchLabel(point.branchId))}</dd></div>
    <div><dt>Step / sequence</dt><dd>${escapeHtml(point.stepId)} · ${point.sequence}</dd></div>
    <div><dt>Coordinates</dt><dd>x ${point.x} · y ${point.y} · z ${point.z} · t ${point.t}</dd></div>
    <div><dt>State hash</dt><dd><code>${escapeHtml(point.stateHash)}</code></dd></div>
    <div><dt>Receipt hash</dt><dd><code>${escapeHtml(point.receiptHash)}</code></dd></div>
    <div><dt>Event batch hash</dt><dd><code>${escapeHtml(point.eventBatchHash)}</code></dd></div>
    <div><dt>Node ID</dt><dd><code>${escapeHtml(point.nodeId)}</code></dd></div>
  </dl>`;
}

function renderRadar() {
  if (!annotations.length) {
    radarList.innerHTML = '<p class="radar-empty">No local review signals. Select a Snapstate to add one.</p>';
    return;
  }
  const byLogical = [...annotations].sort((a, b) => a.createdLogicalTime - b.createdLogicalTime || a.annotationId.localeCompare(b.annotationId));
  radarList.replaceChildren(...byLogical.map((record) => {
    const item = document.createElement('div');
    item.className = 'radar-item';
    item.innerHTML = `${escapeHtml(record.body)}<small>${escapeHtml(record.authorId)} · L${record.createdLogicalTime} · ${escapeHtml(record.targetId.slice(0, 30))}…</small>`;
    return item;
  }));
}

function render() {
  const points = visiblePoints();
  timeOutput.value = timeSlider.value;
  if (renderer) {
    fallback.hidden = true;
    canvas.hidden = false;
    renderer.render(fixture, { activeBranches: activeBranches(), maxTime: Number(timeSlider.value) });
  } else {
    canvas.hidden = true;
    fallback.hidden = false;
    renderFallback(points);
  }
  renderEvidenceList();
  renderRadar();
}

timeSlider.addEventListener('input', render);
branchA.addEventListener('change', () => { showAllBranches = false; render(); });
branchB.addEventListener('change', () => { showAllBranches = false; render(); });
showAll.addEventListener('click', () => { showAllBranches = true; render(); });
window.addEventListener('resize', render);

annotationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selectedPoint) return;
  await appendAnnotation(fixture.graphId, {
    authorId: authorInput.value,
    targetType: 'snapstate',
    targetId: selectedPoint.nodeId,
    body: bodyInput.value,
    supersedes: null,
  });
  bodyInput.value = '';
  annotations = await loadAnnotations(fixture.graphId);
  renderRadar();
});

exportButton.addEventListener('click', async () => {
  const blob = new Blob([await exportAnnotations(fixture.graphId)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `trustscape-annotations-${fixture.graphId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener('change', async () => {
  const [file] = importInput.files;
  if (!file) return;
  await importAnnotations(fixture.graphId, await file.text());
  annotations = await loadAnnotations(fixture.graphId);
  renderRadar();
  importInput.value = '';
});

render();
