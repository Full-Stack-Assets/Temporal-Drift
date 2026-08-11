import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

function normalizeRoot(root) {
  if (root instanceof URL) return root;
  if (typeof root === 'string') return pathToFileURL(root.endsWith('/') ? root : `${root}/`);
  throw new TypeError('Source-scan roots must be file URLs or filesystem paths');
}

async function walk(root, found) {
  const entries = await readdir(root, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), root);
    if (entry.isDirectory()) {
      await walk(child, found);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      found.set(fileURLToPath(child), child);
    }
  }
}

export async function listJavaScriptFiles(roots) {
  if (!Array.isArray(roots) || roots.length === 0) throw new TypeError('At least one source-scan root is required');
  const found = new Map();
  const normalized = roots.map(normalizeRoot).sort((left, right) => fileURLToPath(left).localeCompare(fileURLToPath(right)));
  for (const root of normalized) await walk(root, found);
  return [...found.values()].sort((left, right) => fileURLToPath(left).localeCompare(fileURLToPath(right)));
}

export async function findAmbientRandomnessViolations(files) {
  if (!Array.isArray(files)) throw new TypeError('Source-scan files must be an array');
  const violations = [];
  for (const file of files) {
    const url = file instanceof URL ? file : pathToFileURL(file);
    const source = await readFile(url, 'utf8');
    if (/Math\s*\.\s*random\s*\(/u.test(source)) violations.push(url);
  }
  return violations.sort((left, right) => fileURLToPath(left).localeCompare(fileURLToPath(right)));
}
