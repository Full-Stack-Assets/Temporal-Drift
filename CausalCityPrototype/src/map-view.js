import { DISTRICTS } from './city-data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SHAPES = {
  'west-end': 'M40 130 L190 76 L255 142 L218 245 L73 255 Z',
  northside: 'M203 73 L382 55 L414 155 L257 144 Z',
  'atlas-ward': 'M414 66 L590 98 L585 218 L424 183 L414 155 Z',
  southgate: 'M65 266 L220 252 L278 355 L108 397 L35 332 Z',
  downtown: 'M229 153 L411 164 L438 298 L278 355 L218 245 Z',
  university: 'M442 188 L585 224 L548 352 L438 298 Z',
  riverfront: 'M290 366 L438 307 L548 360 L515 455 L335 454 Z',
  harbor: 'M111 405 L288 364 L333 459 L182 505 L76 474 Z',
};

const LABELS = {
  'west-end': [139, 164], northside: [309, 105], 'atlas-ward': [500, 137], southgate: [150, 316],
  downtown: [332, 229], university: [510, 270], riverfront: [426, 398], harbor: [204, 438],
};

function el(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function healthClass(score) {
  if (score >= 74) return 'health-strong';
  if (score >= 61) return 'health-steady';
  if (score >= 46) return 'health-strained';
  return 'health-critical';
}

function statusLabel(score) {
  if (score >= 74) return 'strong';
  if (score >= 61) return 'steady';
  if (score >= 46) return 'strained';
  return 'critical';
}

export function createCityMap(container, onDistrictSelect) {
  const svg = el('svg', { viewBox: '0 0 630 540', role: 'img', 'aria-labelledby': 'city-map-title city-map-description' });
  const title = el('title', { id: 'city-map-title' });
  title.textContent = 'Bellwether district map';
  const description = el('desc', { id: 'city-map-description' });
  description.textContent = 'Eight selectable districts whose visual state changes with the selected scenario and year.';
  svg.append(title, description);

  svg.append(
    el('path', { class: 'map-river', d: 'M-20 490 C130 430 180 530 330 460 C470 395 530 505 675 420' }),
    el('path', { class: 'map-river-highlight', d: 'M-20 490 C130 430 180 530 330 460 C470 395 530 505 675 420' }),
  );

  const districtNodes = new Map();
  for (const district of DISTRICTS) {
    const group = el('g', { class: 'map-district health-steady', role: 'button', tabindex: '0', 'data-district': district.id });
    const path = el('path', { d: SHAPES[district.id] });
    const [x, y] = LABELS[district.id];
    const label = el('text', { x, y });
    label.textContent = district.name;
    const score = el('text', { x, y: y + 16, class: 'district-score' });
    score.textContent = '70 · steady';
    group.append(path, label, score);
    const activate = () => onDistrictSelect?.(district.id);
    group.addEventListener('click', activate);
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
    svg.append(group);
    districtNodes.set(district.id, { group, score });
  }

  svg.append(el('path', { class: 'transit-line', d: 'M118 314 C230 270 302 232 494 264 C535 273 550 320 472 397' }));
  for (const [cx, cy] of [[118, 314], [267, 252], [358, 236], [494, 264], [472, 397]]) {
    svg.append(el('circle', { class: 'transit-stop', cx, cy, r: '5' }));
  }

  const atlas = el('g', { class: 'atlas-landmark', transform: 'translate(505 166)' });
  atlas.append(el('rect', { x: '-27', y: '-15', width: '54', height: '30', rx: '5' }));
  const atlasText = el('text', { x: '0', y: '3' });
  atlasText.textContent = 'ATLAS';
  atlas.append(atlasText);
  svg.append(atlas);

  container.replaceChildren(svg);

  return {
    update(snapshot, selectedDistrictId, branchId) {
      for (const [id, node] of districtNodes) {
        const district = snapshot.districts[id];
        const score = Math.round(district.overallHealth);
        node.group.setAttribute('class', `map-district ${healthClass(score)}${selectedDistrictId === id ? ' is-selected' : ''}`);
        node.group.setAttribute('aria-label', `${DISTRICTS.find((item) => item.id === id)?.name}: health ${score}, ${statusLabel(score)}`);
        node.group.setAttribute('aria-pressed', selectedDistrictId === id ? 'true' : 'false');
        node.score.textContent = `${score} · ${statusLabel(score)}`;
      }
      atlas.setAttribute('class', `atlas-landmark${branchId === 'baseline' ? '' : ' is-closed'}`);
      atlasText.textContent = branchId === 'baseline' ? 'ATLAS' : 'CLOSED';
    },
  };
}
