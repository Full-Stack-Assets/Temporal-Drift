import { CITIZENS } from './city-data.js';
import { createRandom } from './random.js';
import { getSnapshot } from './simulation.js';

function storyFor(citizen, result, snapshot) {
  const branch = result.branchId;
  const year = snapshot.year;
  const district = snapshot.districts[citizen.district];

  if (branch === 'baseline') {
    const bodies = {
      worker: `${citizen.name} keeps a stable job, but new automation means every promotion now requires additional training.`,
      owner: `${citizen.name} sees steady sales while commercial rent climbs with the city’s slow growth.`,
      student: `${citizen.name} graduates into a dependable regional job market shaped by Atlas Works and its suppliers.`,
      planner: `${citizen.name} spends ${year} stretching limited transit funds across a city that is still expanding.`,
      organizer: `${citizen.name} campaigns for housing protections as stable employment pushes rents higher.`,
      teacher: `${citizen.name} teaches larger classes as young families continue moving into Southgate.`,
    };
    return bodies[citizen.archetype] ?? `${citizen.name} experiences a city changing slowly rather than dramatically.`;
  }

  if (branch === 'reinvention' && year >= 2031) {
    const bodies = {
      worker: `${citizen.name} enters paid university training and later joins one of the smaller clean-manufacturing firms in Atlas Ward.`,
      owner: `${citizen.name} survives the lean years, then gains customers from the reopened riverfront production district.`,
      student: `${citizen.name} joins a university lab whose manufacturing research becomes a local company instead of leaving Bellwether.`,
      planner: `${citizen.name} connects the university, riverfront, and Atlas Ward with the transit investments funded by the Riverworks Compact.`,
      organizer: `${citizen.name} negotiates local-hiring guarantees so the reinvention reaches families hit by the original shutdown.`,
      teacher: `${citizen.name} sees enrollment recover as training, manufacturing, and riverfront jobs draw households back.`,
    };
    return bodies[citizen.archetype] ?? `${citizen.name} finds a place in Bellwether’s new university-and-manufacturing economy.`;
  }

  const severe = district.overallHealth < 52;
  const bodies = {
    worker: `${citizen.name} cycles through short contracts after Atlas closes${severe ? ' and considers leaving Bellwether' : ' while small workshops slowly return'}.`,
    owner: `${citizen.name} cuts hours as household spending falls and vacant storefronts spread through the district.`,
    student: `${citizen.name} finishes school, but most attractive jobs remain outside Bellwether.`,
    planner: `${citizen.name} redraws bus routes around service cuts instead of planning the expansion the city once expected.`,
    organizer: `${citizen.name} turns an empty union hall into a mutual-aid center for displaced workers.`,
    teacher: `${citizen.name} watches classmates and colleagues leave as working-age families relocate.`,
  };
  return bodies[citizen.archetype] ?? `${citizen.name} adapts to a smaller and less certain Bellwether.`;
}

export function generateStories(result, year, limit = 3) {
  const snapshot = getSnapshot(result, year);
  const random = createRandom(result.seed + snapshot.year * 31 + result.branchId.length * 101);
  const ranked = CITIZENS.map((citizen) => ({ citizen, score: random() }))
    .sort((a, b) => a.score - b.score)
    .slice(0, Math.max(0, Math.min(limit, CITIZENS.length)));

  return ranked.map(({ citizen }) => ({
    id: `${citizen.id}-${result.branchId}-${snapshot.year}`,
    citizenId: citizen.id,
    name: citizen.name,
    role: citizen.role,
    districtId: citizen.district,
    year: snapshot.year,
    body: storyFor(citizen, result, snapshot),
  }));
}
