import { BRANCHES, END_YEAR, START_YEAR } from './city-data.js';
import { explainMetric } from './explanations.js';
import { createCityMap } from './map-view.js';
import { compareSnapshots, getSnapshot, simulateBranch } from './simulation.js';
import { generateStories } from './stories.js';
import {
  eventExplanation,
  renderComparison,
  renderDistrictSummary,
  renderEvents,
  renderExplanation,
  renderMetrics,
  renderStories,
} from './ui.js';

const results = Object.fromEntries(Object.keys(BRANCHES).map((branchId) => [branchId, simulateBranch(branchId)]));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const elements = {
  branchSelect: document.querySelector('#branch-select'),
  compareSelect: document.querySelector('#compare-select'),
  resetButton: document.querySelector('#reset-button'),
  interventionButton: document.querySelector('#intervention-button'),
  scenarioDescription: document.querySelector('#scenario-description'),
  atlasStatus: document.querySelector('#atlas-status'),
  yearSlider: document.querySelector('#year-slider'),
  yearLabel: document.querySelector('#year-label'),
  mapYear: document.querySelector('#map-year'),
  playButton: document.querySelector('#play-button'),
  playIcon: document.querySelector('#play-icon'),
  eventFeed: document.querySelector('#event-feed'),
  eventCount: document.querySelector('#event-count'),
  metricsGrid: document.querySelector('#metrics-grid'),
  comparisonList: document.querySelector('#comparison-list'),
  storiesList: document.querySelector('#stories-list'),
  explanationSummary: document.querySelector('#explanation-summary'),
  causalChain: document.querySelector('#causal-chain'),
  cityHealthBadge: document.querySelector('#city-health-badge'),
  districtSummary: document.querySelector('#district-summary'),
  cityMap: document.querySelector('#city-map'),
};

const state = {
  branchId: 'baseline',
  compareBranchId: 'shutdown',
  year: START_YEAR,
  selectedDistrictId: null,
  selectedMetricId: 'cityHealth',
  selectedEventId: null,
  playing: false,
  timer: null,
};

const map = createCityMap(elements.cityMap, (districtId) => {
  state.selectedDistrictId = state.selectedDistrictId === districtId ? null : districtId;
  render();
});

function stopPlayback() {
  state.playing = false;
  if (state.timer) window.clearInterval(state.timer);
  state.timer = null;
  elements.playIcon.textContent = '▶';
  elements.playButton.setAttribute('aria-label', 'Play timeline');
}

function startPlayback() {
  if (state.year >= END_YEAR) state.year = START_YEAR;
  state.playing = true;
  elements.playIcon.textContent = 'Ⅱ';
  elements.playButton.setAttribute('aria-label', 'Pause timeline');
  state.timer = window.setInterval(() => {
    state.year += 1;
    if (state.year >= END_YEAR) stopPlayback();
    render();
  }, reducedMotion ? 700 : 520);
}

function animateToYear(targetYear) {
  stopPlayback();
  if (reducedMotion) {
    state.year = targetYear;
    render();
    return;
  }
  const direction = targetYear >= state.year ? 1 : -1;
  const timer = window.setInterval(() => {
    state.year += direction;
    render();
    if (state.year === targetYear) window.clearInterval(timer);
  }, 115);
}

function setBranch(branchId, targetYear = state.year) {
  state.branchId = BRANCHES[branchId] ? branchId : 'baseline';
  state.selectedEventId = null;
  state.selectedMetricId = 'cityHealth';
  state.selectedDistrictId = null;
  elements.branchSelect.value = state.branchId;
  animateToYear(targetYear);
}

function handleIntervention() {
  if (state.branchId === 'baseline') {
    setBranch('shutdown', 2032);
    return;
  }
  if (state.branchId === 'shutdown') {
    setBranch('reinvention', 2040);
    return;
  }
  setBranch('shutdown', 2032);
}

function reset() {
  stopPlayback();
  state.branchId = 'baseline';
  state.compareBranchId = 'shutdown';
  state.year = START_YEAR;
  state.selectedDistrictId = null;
  state.selectedMetricId = 'cityHealth';
  state.selectedEventId = null;
  elements.branchSelect.value = 'baseline';
  elements.compareSelect.value = 'shutdown';
  render();
}

function renderScenarioCopy() {
  const branch = BRANCHES[state.branchId];
  elements.scenarioDescription.textContent = branch.description;
  const closed = state.branchId !== 'baseline';
  elements.atlasStatus.textContent = closed ? 'Closed' : 'Operating';
  elements.atlasStatus.className = `status-pill ${closed ? 'status-closed' : 'status-stable'}`;

  if (state.branchId === 'baseline') {
    elements.interventionButton.className = 'button button-danger button-large';
    elements.interventionButton.innerHTML = '<span>Close Atlas Works</span><small>Simulate the next 20 years</small>';
  } else if (state.branchId === 'shutdown') {
    elements.interventionButton.className = 'button button-recovery button-large';
    elements.interventionButton.innerHTML = '<span>Launch the Riverworks Compact</span><small>Explore a recovery branch</small>';
  } else {
    elements.interventionButton.className = 'button button-danger button-large';
    elements.interventionButton.innerHTML = '<span>Remove the intervention</span><small>Return to the unassisted shutdown</small>';
  }
}

function render() {
  const result = results[state.branchId];
  const snapshot = getSnapshot(result, state.year);
  const comparisonSnapshot = getSnapshot(results[state.compareBranchId], state.year);

  state.year = snapshot.year;
  elements.yearSlider.value = String(state.year);
  elements.yearLabel.textContent = String(state.year);
  elements.mapYear.textContent = String(state.year);
  elements.branchSelect.value = state.branchId;
  elements.compareSelect.value = state.compareBranchId;
  elements.cityHealthBadge.textContent = `${Math.round(snapshot.metrics.cityHealth)} / 100`;

  renderScenarioCopy();
  map.update(snapshot, state.selectedDistrictId, state.branchId);
  renderDistrictSummary(elements.districtSummary, state.selectedDistrictId, snapshot);
  renderMetrics(elements.metricsGrid, snapshot, (metricId) => {
    state.selectedMetricId = metricId;
    state.selectedEventId = null;
    render();
    document.querySelector('#explanation-panel')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  });

  const visibleEvents = renderEvents(elements.eventFeed, result.events, state.year, (eventId) => {
    state.selectedEventId = eventId;
    state.selectedMetricId = null;
    render();
  });
  elements.eventCount.textContent = `${visibleEvents.length} event${visibleEvents.length === 1 ? '' : 's'}`;

  renderStories(elements.storiesList, generateStories(result, state.year, 3));
  renderComparison(elements.comparisonList, compareSnapshots(snapshot, comparisonSnapshot), state.branchId, state.compareBranchId);

  const explanation = state.selectedEventId
    ? eventExplanation(result, state.selectedEventId)
    : explainMetric(result, state.year, state.selectedMetricId ?? 'cityHealth');
  renderExplanation(elements.explanationSummary, elements.causalChain, explanation);
}

elements.interventionButton.addEventListener('click', handleIntervention);
elements.resetButton.addEventListener('click', reset);
elements.branchSelect.addEventListener('change', (event) => setBranch(event.target.value, state.year));
elements.compareSelect.addEventListener('change', (event) => {
  state.compareBranchId = BRANCHES[event.target.value] ? event.target.value : 'baseline';
  render();
});
elements.yearSlider.addEventListener('input', (event) => {
  stopPlayback();
  state.year = Number(event.target.value);
  render();
});
elements.playButton.addEventListener('click', () => state.playing ? stopPlayback() : startPlayback());

render();
