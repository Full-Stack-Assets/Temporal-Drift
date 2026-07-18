export const START_YEAR = 2026;
export const END_YEAR = 2046;

export const METRIC_DEFINITIONS = Object.freeze({
  population: { label: 'Population', format: 'integer', better: 'higher' },
  employmentRate: { label: 'Employment', suffix: '%', better: 'higher' },
  incomeIndex: { label: 'Household income', suffix: ' idx', better: 'higher' },
  businessIndex: { label: 'Local business', suffix: ' idx', better: 'higher' },
  fiscalHealth: { label: 'Fiscal health', suffix: '/100', better: 'higher' },
  housingAffordability: { label: 'Housing affordability', suffix: '/100', better: 'higher' },
  publicTrust: { label: 'Public trust', suffix: '/100', better: 'higher' },
  transitQuality: { label: 'Transit quality', suffix: '/100', better: 'higher' },
  culturalVitality: { label: 'Cultural vitality', suffix: '/100', better: 'higher' },
  cityHealth: { label: 'City health', suffix: '/100', better: 'higher' },
});

export const BRANCHES = Object.freeze({
  baseline: {
    id: 'baseline',
    name: 'Steady Course',
    shortName: 'Baseline',
    description: 'Atlas Works remains open. Bellwether grows slowly while housing pressure rises.',
  },
  shutdown: {
    id: 'shutdown',
    name: 'The Shutdown',
    shortName: 'Shutdown',
    description: 'Atlas Works closes in 2026 without a coordinated recovery plan.',
  },
  reinvention: {
    id: 'reinvention',
    name: 'The Reinvention',
    shortName: 'Reinvention',
    description: 'Atlas Works closes, then Bellwether launches a university-led recovery package in 2030.',
  },
});

export const CITY = Object.freeze({
  id: 'bellwether',
  name: 'Bellwether',
  state: 'Franklin',
  tagline: 'A river city built on making things.',
  dominantEmployer: 'Atlas Works',
});

export const DISTRICTS = Object.freeze([
  { id: 'downtown', name: 'Downtown', kind: 'civic', vulnerability: 0.75, recovery: 1.05 },
  { id: 'atlas-ward', name: 'Atlas Ward', kind: 'industrial', vulnerability: 1.55, recovery: 1.2 },
  { id: 'northside', name: 'Northside', kind: 'working-class', vulnerability: 1.25, recovery: 0.9 },
  { id: 'west-end', name: 'West End', kind: 'residential', vulnerability: 0.65, recovery: 0.75 },
  { id: 'university', name: 'University Quarter', kind: 'education', vulnerability: 0.45, recovery: 1.55 },
  { id: 'riverfront', name: 'Riverfront', kind: 'warehouse', vulnerability: 1.05, recovery: 1.7 },
  { id: 'harbor', name: 'Harbor District', kind: 'logistics', vulnerability: 0.8, recovery: 1.0 },
  { id: 'southgate', name: 'Southgate', kind: 'suburban', vulnerability: 0.55, recovery: 0.7 },
]);

export const CITIZENS = Object.freeze([
  { id: 'maya-ortiz', name: 'Maya Ortiz', role: 'Atlas line supervisor', district: 'northside', archetype: 'worker' },
  { id: 'caleb-brooks', name: 'Caleb Brooks', role: 'Diner owner', district: 'downtown', archetype: 'owner' },
  { id: 'nia-patel', name: 'Nia Patel', role: 'Engineering student', district: 'university', archetype: 'student' },
  { id: 'jonah-reed', name: 'Jonah Reed', role: 'Transit planner', district: 'west-end', archetype: 'planner' },
  { id: 'tessa-nguyen', name: 'Tessa Nguyen', role: 'Warehouse manager', district: 'riverfront', archetype: 'worker' },
  { id: 'omar-jackson', name: 'Omar Jackson', role: 'Neighborhood organizer', district: 'atlas-ward', archetype: 'organizer' },
  { id: 'lena-foster', name: 'Lena Foster', role: 'Machine-shop founder', district: 'harbor', archetype: 'owner' },
  { id: 'eli-washburn', name: 'Eli Washburn', role: 'High-school teacher', district: 'southgate', archetype: 'teacher' },
]);

const initialDistricts = Object.fromEntries(DISTRICTS.map((district) => [district.id, {
  populationShare: district.id === 'downtown' ? 13 : district.id === 'southgate' ? 18 : 11.5,
  employmentHealth: district.id === 'atlas-ward' ? 88 : 76,
  commercialHealth: district.id === 'downtown' ? 82 : 72,
  housingPressure: district.id === 'west-end' || district.id === 'southgate' ? 68 : 54,
  publicInvestment: district.id === 'downtown' ? 72 : 55,
  overallHealth: 70,
}]));

export const INITIAL_STATE = Object.freeze({
  year: START_YEAR,
  metrics: Object.freeze({
    population: 184000,
    employmentRate: 94,
    incomeIndex: 100,
    businessIndex: 100,
    fiscalHealth: 76,
    housingAffordability: 58,
    publicTrust: 62,
    transitQuality: 54,
    culturalVitality: 66,
    cityHealth: 72,
  }),
  districts: Object.freeze(initialDistricts),
});
