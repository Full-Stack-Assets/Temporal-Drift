import {
  BRANCHES,
  DISTRICTS,
  END_YEAR,
  INITIAL_STATE,
  METRIC_DEFINITIONS,
  START_YEAR,
} from './city-data.js';
import { clamp, createRandom, round } from './random.js';

const METRIC_LIMITS = {
  employmentRate: [45, 99],
  incomeIndex: [40, 180],
  businessIndex: [30, 180],
  fiscalHealth: [10, 100],
  housingAffordability: [10, 100],
  publicTrust: [10, 100],
  transitQuality: [10, 100],
  culturalVitality: [10, 100],
  cityHealth: [10, 100],
};

function clone(value) {
  return structuredClone(value);
}

function computeCityHealth(metrics) {
  const normalizedEmployment = clamp((metrics.employmentRate - 50) * 2, 0, 100);
  return round(
    normalizedEmployment * 0.2 +
      metrics.businessIndex * 0.13 +
      metrics.fiscalHealth * 0.14 +
      metrics.housingAffordability * 0.1 +
      metrics.publicTrust * 0.13 +
      metrics.transitQuality * 0.1 +
      metrics.culturalVitality * 0.1 +
      clamp(metrics.incomeIndex, 0, 120) * 0.1,
  );
}

function computeDistrictHealth(district) {
  return round(
    district.employmentHealth * 0.3 +
      district.commercialHealth * 0.25 +
      (100 - district.housingPressure) * 0.2 +
      district.publicInvestment * 0.25,
  );
}

function addEvent(events, provenance, event) {
  const normalized = {
    magnitude: 1,
    category: 'civic',
    causes: [],
    metrics: [],
    districts: [],
    root: false,
    ...event,
  };
  events.push(normalized);
  for (const metric of normalized.metrics) {
    provenance[metric] ??= [];
    provenance[metric].push(normalized.id);
  }
  return normalized;
}

function rootEvents(branchId, events, provenance) {
  if (branchId === 'baseline') {
    addEvent(events, provenance, {
      id: 'atlas-continuity', year: 2026, root: true, category: 'industry',
      title: 'Atlas Works renews its Bellwether commitment',
      summary: 'The city’s largest employer begins a cautious modernization program instead of closing.',
      metrics: ['employmentRate', 'incomeIndex', 'businessIndex', 'fiscalHealth'],
      districts: ['atlas-ward', 'northside'],
    });
    return;
  }

  addEvent(events, provenance, {
    id: 'atlas-closure', year: 2026, root: true, category: 'industry', magnitude: 5,
    title: 'Atlas Works announces permanent closure',
    summary: '4,800 direct jobs and thousands of supplier contracts face elimination.',
    metrics: ['employmentRate', 'incomeIndex', 'businessIndex', 'publicTrust'],
    districts: ['atlas-ward', 'northside', 'downtown'],
  });
}

const EVENT_SCHEDULE = {
  baseline: [
    { id: 'atlas-modernization', year: 2028, title: 'Atlas automation program begins', summary: 'Output rises while hiring becomes more selective.', category: 'industry', causes: ['atlas-continuity'], metrics: ['employmentRate', 'incomeIndex'], districts: ['atlas-ward'] },
    { id: 'housing-pressure', year: 2032, title: 'Rents outpace wages in the West End', summary: 'Steady growth tightens the housing market.', category: 'housing', causes: ['atlas-continuity'], metrics: ['housingAffordability'], districts: ['west-end', 'southgate'] },
    { id: 'transit-bond', year: 2036, title: 'Voters approve the Crosstown transit bond', summary: 'A modest bus rapid-transit spine connects jobs and neighborhoods.', category: 'infrastructure', causes: ['atlas-continuity'], metrics: ['transitQuality', 'publicTrust'], districts: ['downtown', 'northside', 'university'] },
    { id: 'steady-diversification', year: 2042, title: 'Small firms reduce Bellwether’s industrial dependence', summary: 'New employers soften—but do not erase—the city’s reliance on Atlas Works.', category: 'business', causes: ['atlas-modernization'], metrics: ['businessIndex', 'cityHealth'], districts: ['harbor', 'university'] },
  ],
  shutdown: [
    { id: 'mass-layoffs', year: 2027, title: 'The first Atlas layoffs hit Bellwether', summary: 'Household income drops sharply across Atlas Ward and Northside.', category: 'employment', magnitude: 5, causes: ['atlas-closure'], metrics: ['employmentRate', 'incomeIndex'], districts: ['atlas-ward', 'northside'] },
    { id: 'spending-shock', year: 2028, title: 'Local spending contracts', summary: 'Restaurants, repair shops, and neighborhood retailers lose their busiest customers.', category: 'business', magnitude: 4, causes: ['mass-layoffs'], metrics: ['businessIndex'], districts: ['downtown', 'northside'] },
    { id: 'supplier-collapse', year: 2029, title: 'Atlas suppliers begin closing', summary: 'The shutdown spreads from one company into the wider industrial network.', category: 'industry', magnitude: 4, causes: ['spending-shock'], metrics: ['employmentRate', 'businessIndex'], districts: ['harbor', 'atlas-ward'] },
    { id: 'fiscal-squeeze', year: 2030, title: 'City revenue falls below essential-service forecasts', summary: 'Lower payroll, sales, and property receipts open a structural budget gap.', category: 'government', magnitude: 4, causes: ['supplier-collapse'], metrics: ['fiscalHealth', 'publicTrust'], districts: ['downtown'] },
    { id: 'service-cuts', year: 2031, title: 'Bellwether cuts routes and maintenance', summary: 'Transit frequency and neighborhood upkeep decline.', category: 'infrastructure', magnitude: 4, causes: ['fiscal-squeeze'], metrics: ['transitQuality', 'publicTrust'], districts: ['northside', 'atlas-ward', 'riverfront'] },
    { id: 'outmigration-wave', year: 2032, title: 'Working-age families leave Bellwether', summary: 'Job seekers follow opportunity to nearby metros, shrinking the tax base again.', category: 'population', magnitude: 4, causes: ['mass-layoffs', 'service-cuts'], metrics: ['population', 'employmentRate', 'fiscalHealth'], districts: ['northside', 'atlas-ward'] },
    { id: 'cheap-space', year: 2034, title: 'Vacant storefronts push rents down', summary: 'Affordability improves, but largely because demand has collapsed.', category: 'housing', causes: ['outmigration-wave'], metrics: ['housingAffordability', 'businessIndex'], districts: ['downtown', 'riverfront'] },
    { id: 'maker-cooperatives', year: 2038, title: 'Small maker cooperatives occupy old industrial space', summary: 'A grassroots recovery begins without enough capital to replace Atlas-scale employment.', category: 'culture', causes: ['cheap-space'], metrics: ['culturalVitality', 'businessIndex'], districts: ['riverfront', 'atlas-ward'] },
    { id: 'uneven-recovery', year: 2043, title: 'Bellwether stabilizes at a smaller scale', summary: 'The city stops shrinking, though opportunity remains uneven by district.', category: 'population', causes: ['maker-cooperatives'], metrics: ['population', 'cityHealth'], districts: ['riverfront', 'university', 'northside'] },
  ],
  reinvention: [
    { id: 'mass-layoffs', year: 2027, title: 'The first Atlas layoffs hit Bellwether', summary: 'Household income drops sharply across Atlas Ward and Northside.', category: 'employment', magnitude: 5, causes: ['atlas-closure'], metrics: ['employmentRate', 'incomeIndex'], districts: ['atlas-ward', 'northside'] },
    { id: 'spending-shock', year: 2028, title: 'Local spending contracts', summary: 'Restaurants, repair shops, and neighborhood retailers lose their busiest customers.', category: 'business', magnitude: 4, causes: ['mass-layoffs'], metrics: ['businessIndex'], districts: ['downtown', 'northside'] },
    { id: 'supplier-collapse', year: 2029, title: 'Atlas suppliers begin closing', summary: 'The shutdown spreads from one company into the wider industrial network.', category: 'industry', magnitude: 4, causes: ['spending-shock'], metrics: ['employmentRate', 'businessIndex'], districts: ['harbor', 'atlas-ward'] },
    { id: 'reinvention-package', year: 2030, root: true, title: 'Bellwether launches the Riverworks Compact', summary: 'The city, university, and regional manufacturers fund retraining, clean production, and riverfront reuse.', category: 'policy', magnitude: 5, causes: [], metrics: ['fiscalHealth', 'publicTrust', 'transitQuality'], districts: ['university', 'riverfront', 'atlas-ward'] },
    { id: 'training-pipeline', year: 2031, title: 'Former Atlas workers enter paid technical training', summary: 'The university converts industrial experience into credentials for new sectors.', category: 'education', magnitude: 4, causes: ['reinvention-package', 'mass-layoffs'], metrics: ['employmentRate', 'incomeIndex', 'publicTrust'], districts: ['university', 'northside', 'atlas-ward'] },
    { id: 'clean-manufacturing', year: 2033, title: 'Three clean-manufacturing firms open in Atlas Ward', summary: 'Smaller employers reuse Atlas facilities and hire the first retraining cohorts.', category: 'industry', magnitude: 5, causes: ['training-pipeline'], metrics: ['employmentRate', 'businessIndex', 'incomeIndex'], districts: ['atlas-ward', 'harbor'] },
    { id: 'riverfront-reuse', year: 2035, title: 'The riverfront reopens as a mixed production district', summary: 'Workshops, housing, public space, and rapid transit replace fenced warehouses.', category: 'development', magnitude: 4, causes: ['reinvention-package', 'clean-manufacturing'], metrics: ['transitQuality', 'culturalVitality', 'businessIndex'], districts: ['riverfront', 'downtown'] },
    { id: 'return-migration', year: 2037, title: 'Young households begin returning to Bellwether', summary: 'New jobs and still-manageable housing costs reverse part of the population loss.', category: 'population', magnitude: 4, causes: ['clean-manufacturing', 'riverfront-reuse'], metrics: ['population', 'housingAffordability', 'cityHealth'], districts: ['riverfront', 'university', 'northside'] },
    { id: 'tax-recovery', year: 2039, title: 'The municipal budget returns to structural balance', summary: 'A broader tax base restores maintenance and service frequency.', category: 'government', magnitude: 4, causes: ['return-migration', 'clean-manufacturing'], metrics: ['fiscalHealth', 'transitQuality', 'publicTrust'], districts: ['downtown', 'northside'] },
    { id: 'new-identity', year: 2043, title: 'Bellwether becomes a regional production-and-design hub', summary: 'The city is smaller than its Atlas peak but more economically diverse.', category: 'culture', magnitude: 4, causes: ['riverfront-reuse', 'tax-recovery'], metrics: ['culturalVitality', 'businessIndex', 'cityHealth'], districts: ['riverfront', 'university', 'atlas-ward'] },
  ],
};

function deltasFor(branchId, year) {
  const age = year - START_YEAR;
  if (branchId === 'baseline') {
    return {
      populationGrowth: 0.003,
      employmentRate: age < 5 ? 0.05 : 0.12,
      incomeIndex: 0.75,
      businessIndex: 0.55,
      fiscalHealth: 0.3,
      housingAffordability: -0.58,
      publicTrust: 0.08,
      transitQuality: 0.28,
      culturalVitality: 0.35,
    };
  }

  if (branchId === 'reinvention' && year >= 2030) {
    if (year <= 2033) {
      return { populationGrowth: -0.001, employmentRate: 1.1, incomeIndex: 0.9, businessIndex: 1.4, fiscalHealth: -0.2, housingAffordability: 0.25, publicTrust: 1.7, transitQuality: 1.0, culturalVitality: 1.0 };
    }
    if (year <= 2040) {
      return { populationGrowth: 0.009, employmentRate: 1.0, incomeIndex: 1.45, businessIndex: 1.75, fiscalHealth: 1.45, housingAffordability: -0.6, publicTrust: 0.85, transitQuality: 1.1, culturalVitality: 1.2 };
    }
    return { populationGrowth: 0.006, employmentRate: 0.35, incomeIndex: 1.0, businessIndex: 1.1, fiscalHealth: 0.8, housingAffordability: -0.45, publicTrust: 0.35, transitQuality: 0.6, culturalVitality: 0.8 };
  }

  if (age <= 2) {
    return { populationGrowth: -0.014, employmentRate: -2.9, incomeIndex: -2.1, businessIndex: -3.25, fiscalHealth: -1.7, housingAffordability: 1.0, publicTrust: -2.1, transitQuality: -0.55, culturalVitality: -0.45 };
  }
  if (age <= 6) {
    return { populationGrowth: -0.01, employmentRate: -1.0, incomeIndex: -0.85, businessIndex: -1.55, fiscalHealth: -2.15, housingAffordability: 1.5, publicTrust: -1.05, transitQuality: -0.95, culturalVitality: -0.15 };
  }
  if (age <= 11) {
    return { populationGrowth: -0.002, employmentRate: 0.35, incomeIndex: 0.5, businessIndex: 0.3, fiscalHealth: -0.15, housingAffordability: 0.4, publicTrust: 0.2, transitQuality: -0.1, culturalVitality: 0.6 };
  }
  return { populationGrowth: 0.0015, employmentRate: 0.55, incomeIndex: 0.7, businessIndex: 0.72, fiscalHealth: 0.42, housingAffordability: -0.1, publicTrust: 0.3, transitQuality: 0.22, culturalVitality: 0.8 };
}

function applyMetricDeltas(metrics, deltas, random) {
  metrics.population = Math.round(metrics.population * (1 + deltas.populationGrowth));
  for (const id of Object.keys(METRIC_LIMITS)) {
    if (id === 'cityHealth') continue;
    const jitter = (random() - 0.5) * 0.12;
    const [min, max] = METRIC_LIMITS[id];
    metrics[id] = round(clamp(metrics[id] + deltas[id] + jitter, min, max));
  }
  metrics.cityHealth = computeCityHealth(metrics);
}

function applyDistrictDeltas(districtStates, branchId, year, eventsThisYear) {
  const inRecovery = branchId === 'reinvention' && year >= 2030;
  const inShock = branchId !== 'baseline' && year <= 2033;
  const affected = new Set(eventsThisYear.flatMap((event) => event.districts));

  for (const definition of DISTRICTS) {
    const district = districtStates[definition.id];
    const localWeight = affected.has(definition.id) ? 1.35 : 0.55;
    const shock = inShock ? definition.vulnerability * localWeight : 0;
    const recovery = inRecovery ? definition.recovery * localWeight : branchId === 'baseline' ? 0.35 : 0.12;

    district.employmentHealth = round(clamp(district.employmentHealth - shock * 2.1 + recovery * 1.5, 10, 100));
    district.commercialHealth = round(clamp(district.commercialHealth - shock * 1.8 + recovery * 1.7, 10, 100));
    district.housingPressure = round(clamp(district.housingPressure - shock * 1.2 + (inRecovery ? recovery * 0.6 : branchId === 'baseline' ? 0.5 : -0.1), 10, 95));
    district.publicInvestment = round(clamp(district.publicInvestment - (inShock ? shock * 0.8 : 0) + recovery * 1.2, 10, 100));
    district.overallHealth = computeDistrictHealth(district);
  }
}

function snapshot(year, metrics, districts, provenance) {
  return {
    year,
    metrics: clone(metrics),
    districts: clone(districts),
    provenance: clone(provenance),
  };
}

export function simulateBranch(requestedBranchId, seed = 2026) {
  const branchId = BRANCHES[requestedBranchId] ? requestedBranchId : 'baseline';
  const random = createRandom(seed + branchId.length * 997);
  const metrics = clone(INITIAL_STATE.metrics);
  const districts = clone(INITIAL_STATE.districts);
  const events = [];
  const provenance = {};
  const snapshots = [];

  rootEvents(branchId, events, provenance);
  const scheduled = EVENT_SCHEDULE[branchId];

  for (let year = START_YEAR; year <= END_YEAR; year += 1) {
    const eventsThisYear = scheduled.filter((event) => event.year === year);
    for (const event of eventsThisYear) addEvent(events, provenance, event);

    if (year > START_YEAR) {
      applyMetricDeltas(metrics, deltasFor(branchId, year), random);
      applyDistrictDeltas(districts, branchId, year, eventsThisYear);
    } else if (branchId !== 'baseline') {
      metrics.employmentRate = 91;
      metrics.incomeIndex = 97.5;
      metrics.businessIndex = 97;
      metrics.publicTrust = 56;
      metrics.cityHealth = computeCityHealth(metrics);
      applyDistrictDeltas(districts, branchId, year, events.filter((event) => event.year === year));
    }

    snapshots.push(snapshot(year, metrics, districts, provenance));
  }

  return {
    branchId,
    branch: BRANCHES[branchId],
    seed,
    startYear: START_YEAR,
    endYear: END_YEAR,
    snapshots,
    events: events.sort((a, b) => a.year - b.year || a.id.localeCompare(b.id)),
  };
}

export function getSnapshot(result, requestedYear) {
  const year = clamp(Math.round(Number(requestedYear) || START_YEAR), START_YEAR, END_YEAR);
  return result.snapshots[year - START_YEAR];
}

export function compareSnapshots(left, right) {
  return Object.entries(METRIC_DEFINITIONS).map(([id, definition]) => ({
    id,
    label: definition.label,
    left: left.metrics[id],
    right: right.metrics[id],
    delta: round(left.metrics[id] - right.metrics[id]),
    better: definition.better,
  }));
}
