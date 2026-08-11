import {
  appendAnnotationInBrowser,
  canonicalBrowserString,
  createAnnotationDocumentInBrowser,
  createBrowserRenderModel,
  mergeAnnotationDocumentsInBrowser,
  verifyAnnotationDocumentInBrowser,
  verifyProjectionInBrowser,
} from './browser-core.js';
import { TrustscapeRenderer } from './renderer.js';

const elements = Object.fromEntries([
  'projection-file', 'verification-badge', 'webgl-badge', 'projection-id', 'projection-hash',
  'graph-id', 'graph-hash', 'render-hash', 'start-sequence', 'end-sequence',
  'branch-controls', 'compare-left', 'compare-right', 'apply-view', 'trustscape-canvas',
  'stage-message', 'object-count', 'thread-count', 'comparison-count', 'radar-list',
  'annotation-actor', 'annotation-target', 'annotation-body', 'add-annotation',
  'export-annotations', 'annotation-file', 'annotation-list',
].map((id) => [id, document.getElementById(id)]));

const state = {
  projection: null,
  renderModel: null,
  renderer: null,
  annotations: null,
};

function badge(element, text, kind) {
  element.textContent = text;
  element.className = `badge badge-${kind}`;
}

function status(message, error = false) {
  elements['stage-message'].textContent = message;
  elements['stage-message'].hidden = false;
  badge(elements['verification-badge'], message, error ? 'error' : 'pending');
}

function projectionStorageKey() {
  return state.projection ? `ripple-trustscape:${state.projection.projectionHash}:annotations` : null;
}

function saveAnnotations() {
  const key = projectionStorageKey();
  if (!key || !state.annotations) return;
  try {
    localStorage.setItem(key, canonicalBrowserString(state.annotations));
  } catch (error) {
    console.warn('Local annotation persistence failed', error);
  }
}

async function loadAnnotations() {
  const actorId = elements['annotation-actor'].value.trim() || 'local-reviewer';
  const key = projectionStorageKey();
  if (key) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const report = await verifyAnnotationDocumentInBrowser(stored);
        if (report.ok) {
          state.annotations = report.document;
          renderAnnotations();
          return;
        }
      }
    } catch (error) {
      console.warn('Stored annotations could not be loaded', error);
    }
  }
  state.annotations = await createAnnotationDocumentInBrowser(actorId);
  saveAnnotations();
  renderAnnotations();
}

function branchLabel(branchId) {
  return state.projection?.dimensions.branching.nodes.find((node) => node.branchId === branchId)?.label ?? branchId;
}

function populateBranches() {
  const branches = [...state.projection.dimensions.branching.nodes].sort((left, right) => left.branchId.localeCompare(right.branchId));
  elements['branch-controls'].replaceChildren(...branches.map((branch) => {
    const label = document.createElement('label');
    label.className = 'branch-toggle';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = branch.branchId;
    input.checked = true;
    const text = document.createElement('span');
    text.textContent = `${branch.label} · depth ${branch.depth}`;
    label.append(input, text);
    return label;
  }));
  for (const select of [elements['compare-left'], elements['compare-right']]) {
    select.replaceChildren(new Option('None', ''), ...branches.map((branch) => new Option(branch.label, branch.branchId)));
  }
}

function populateTargets() {
  const targets = state.renderModel?.objects ?? [];
  elements['annotation-target'].replaceChildren(...targets.map((object) => new Option(
    `${object.kind} · ${object.stepId ?? object.branchId}`,
    object.objectId,
  )));
}

function selectedView() {
  const activeBranchIds = [...elements['branch-controls'].querySelectorAll('input:checked')].map((input) => input.value);
  const compareBranchIds = [elements['compare-left'].value, elements['compare-right'].value].filter(Boolean);
  return {
    startSequence: Number(elements['start-sequence'].value),
    endSequence: Number(elements['end-sequence'].value),
    activeBranchIds,
    compareBranchIds,
  };
}

function renderRadar() {
  const entries = state.renderModel?.radar ?? [];
  if (!entries.length) {
    const item = document.createElement('li');
    item.className = 'muted';
    item.textContent = 'No explicit subjective or reviewed anomaly records in this view.';
    elements['radar-list'].replaceChildren(item);
    return;
  }
  elements['radar-list'].replaceChildren(...entries.map((entry) => {
    const item = document.createElement('li');
    item.textContent = `${branchLabel(entry.branchId)} · ${entry.stepId} · ${entry.metricPath}: tension ${entry.tension} (${entry.sourceRef}@${entry.sourceVersion})`;
    return item;
  }));
}

function renderAnnotations() {
  const operations = state.annotations?.operations ?? [];
  if (!operations.length) {
    const item = document.createElement('li');
    item.className = 'muted';
    item.textContent = 'No local annotations.';
    elements['annotation-list'].replaceChildren(item);
  } else {
    elements['annotation-list'].replaceChildren(...operations.map((operation) => {
      const item = document.createElement('li');
      item.textContent = `${operation.actorId} #${operation.logicalClock} → ${operation.targetId}: ${operation.body}`;
      return item;
    }));
  }
  const enabled = Boolean(state.projection && state.annotations);
  elements['add-annotation'].disabled = !enabled;
  elements['export-annotations'].disabled = !enabled;
  elements['annotation-file'].disabled = !enabled;
}

async function applyView() {
  if (!state.projection) return;
  try {
    state.renderModel = await createBrowserRenderModel(state.projection, selectedView());
    state.renderer.render(state.renderModel);
    elements['render-hash'].textContent = state.renderModel.renderModelHash;
    elements['object-count'].textContent = `${state.renderModel.objects.length} objects`;
    elements['thread-count'].textContent = `${state.renderModel.threads.length} threads`;
    elements['comparison-count'].textContent = `${state.renderModel.comparisons.length} comparisons`;
    elements['stage-message'].hidden = true;
    populateTargets();
    renderRadar();
    badge(elements['verification-badge'], 'Projection verified', 'ok');
  } catch (error) {
    status(`${error.code ?? 'E_VIEW'}: ${error.message}`, true);
  }
}

async function loadProjection(file) {
  status('Verifying projection…');
  const text = await file.text();
  const report = await verifyProjectionInBrowser(text);
  if (!report.ok) {
    status(`${report.errorCode}: ${report.firstMismatch ?? 'projection verification failed'}`, true);
    return;
  }
  state.projection = report.projection;
  elements['projection-id'].textContent = state.projection.projectionId;
  elements['projection-hash'].textContent = state.projection.projectionHash;
  elements['graph-id'].textContent = state.projection.source.graphId;
  elements['graph-hash'].textContent = state.projection.source.graphHash;
  const maximum = Math.max(...state.projection.dimensions.temporal.points.map((point) => point.sequence));
  elements['start-sequence'].value = '0';
  elements['end-sequence'].value = String(maximum);
  elements['end-sequence'].max = String(maximum);
  populateBranches();
  elements['apply-view'].disabled = false;
  await loadAnnotations();
  await applyView();
}

async function addAnnotation() {
  const body = elements['annotation-body'].value;
  const actorId = elements['annotation-actor'].value.trim();
  const targetId = elements['annotation-target'].value;
  if (!body || !actorId || !targetId) return;
  if (!state.annotations.actorIds.includes(actorId)) {
    const actorDocument = await createAnnotationDocumentInBrowser(actorId);
    state.annotations = await mergeAnnotationDocumentsInBrowser([state.annotations, actorDocument]);
  }
  const logicalClock = state.annotations.operations.filter((operation) => operation.actorId === actorId).reduce((value, operation) => Math.max(value, operation.logicalClock), 0) + 1;
  state.annotations = await appendAnnotationInBrowser(state.annotations, {
    actorId,
    logicalClock,
    targetId,
    body,
    supersedes: null,
  });
  elements['annotation-body'].value = '';
  saveAnnotations();
  renderAnnotations();
}

function exportAnnotations() {
  if (!state.annotations) return;
  const blob = new Blob([canonicalBrowserString(state.annotations)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `trustscape-annotations-${state.projection.projectionHash}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importAnnotations(file) {
  const report = await verifyAnnotationDocumentInBrowser(await file.text());
  if (!report.ok) {
    status(`${report.errorCode}: annotation import rejected`, true);
    return;
  }
  state.annotations = await mergeAnnotationDocumentsInBrowser([state.annotations, report.document]);
  saveAnnotations();
  renderAnnotations();
  badge(elements['verification-badge'], 'Projection verified · annotations merged', 'ok');
}

try {
  state.renderer = new TrustscapeRenderer(elements['trustscape-canvas']);
  badge(elements['webgl-badge'], 'WebGL2 ready', 'ok');
} catch (error) {
  badge(elements['webgl-badge'], error.code ?? 'WebGL2 unavailable', 'error');
  elements['projection-file'].disabled = true;
  status(error.message, true);
}

elements['projection-file'].addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (file) loadProjection(file).catch((error) => status(`${error.code ?? 'E_LOAD'}: ${error.message}`, true));
});
elements['apply-view'].addEventListener('click', () => applyView());
elements['add-annotation'].addEventListener('click', () => addAnnotation().catch((error) => status(`${error.code ?? 'E_ANNOTATION'}: ${error.message}`, true)));
elements['export-annotations'].addEventListener('click', exportAnnotations);
elements['annotation-file'].addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (file) importAnnotations(file).catch((error) => status(`${error.code ?? 'E_ANNOTATION'}: ${error.message}`, true));
});
