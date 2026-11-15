import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FOUNDATION_RUNTIME, FOUNDATION_COMMIT, REQUIRED_FOUNDATION_FILES } from './roster.js';

export const EXPECTED_RUNTIME = FOUNDATION_RUNTIME;
export const EXPECTED_SOURCE = FOUNDATION_COMMIT;
const MAX_MANIFEST_BYTES = 4 * 1024 * 1024;

/** Validate a generated release manifest without modifying any runtime or user files. */
export function verifyDeployment(root, manifest, runtimeVersion) {
  if (runtimeVersion !== EXPECTED_RUNTIME) throw new Error(`Foundation runtime mismatch: expected ${EXPECTED_RUNTIME}; found ${runtimeVersion}`);
  if (manifest?.version !== 1 || manifest.runtimeVersion !== EXPECTED_RUNTIME || manifest.sourceCommit !== EXPECTED_SOURCE) throw new Error('Foundation source/version manifest is not supported');
  if (!Array.isArray(manifest.files) || manifest.files.length === 0 || manifest.files.length > 5000) throw new Error('Foundation artifact manifest is empty or exceeds its bound');
  const canonicalRoot = realpathSync(root);
  const seen = new Set();
  for (const entry of manifest.files) {
    if (typeof entry?.path !== 'string' || !entry.path || entry.path.includes('\\') || entry.path.includes('\0') || isAbsolute(entry.path) || entry.path.split('/').some(p => p === '..' || p === '.' || !p)) throw new Error('Invalid artifact-relative path');
    if (seen.has(entry.path)) throw new Error(`Duplicate artifact: ${entry.path}`);
    seen.add(entry.path);
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[a-f0-9]{64}$/.test(entry.sha256 ?? '')) throw new Error('Invalid artifact length or SHA-256');
    const path = realpathSync(resolve(canonicalRoot, entry.path));
    const rel = relative(canonicalRoot, path);
    if (!rel || isAbsolute(rel) || rel === '..' || rel.startsWith('..\\') || rel.startsWith('../')) throw new Error('Artifact leaves the foundation package');
    const stat = statSync(path);
    if (!stat.isFile() || stat.size !== entry.bytes) throw new Error(`Artifact is missing or has a changed size: ${entry.path}`);
    if (createHash('sha256').update(readFileSync(path)).digest('hex') !== entry.sha256) throw new Error(`Artifact checksum differs: ${entry.path}`);
  }
  for (const required of REQUIRED_FOUNDATION_FILES) if (!seen.has(required)) throw new Error(`Required native artifact is unaccounted: ${required}`);
  return Object.freeze({ contractVersion: 1, runtimeVersion, sourceCommit: manifest.sourceCommit, artifacts: seen.size, verified: true });
}

/** Read the immutable package-local deployment record. No credential or session access. */
export function verifyPackagedDeployment(runtimeVersion, url = import.meta.url) {
  const root = dirname(fileURLToPath(url));
  const path = resolve(root, 'deployment.json');
  if (statSync(path).size > MAX_MANIFEST_BYTES) throw new Error('Foundation deployment record is too large');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  return verifyDeployment(root, manifest, runtimeVersion);
}
