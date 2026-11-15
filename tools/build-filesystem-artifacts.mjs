/** Build only reviewed filesystem providers/consumers; retain the installed FsError and Cordis identities. */
import { mkdirSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { resolve, isAbsolute, relative } from 'node:path';
import { isBuiltin } from 'node:module';
import { build } from 'tsdown';
import { resolveExactImport } from './exact-source-loader.mjs';
const root = process.env.DSH_SOURCE_ROOT;
const output = resolve(root, '../../packages/dsh-independent-foundations/native');
const names = process.argv.slice(2);
if (!names.length || names.some(name => !['fs-local', 'fs-sandbox', 'tool-fs-search'].includes(name))) throw new Error('Pass reviewed filesystem package names');
for (const name of names) {
  const source = resolve(root, 'packages/fs', name);
  const destination = resolve(output, name);
  const manifest = JSON.parse(readFileSync(resolve(source, 'package.json'), 'utf8'));
  const inline = new Set(name === 'fs-sandbox' ? ['@deepseek-ai/dsh-fs-local'] : []);
  // Linked bundles borrow installed runtime packages only at declared peer positions.
  // Inlining fs-local also moves its external imports into this package's resolver scope.
  const runtimePeers = { ...manifest.dependencies, ...manifest.optionalDependencies, ...manifest.peerDependencies };
  for (const packageName of inline) {
    const inlined = JSON.parse(readFileSync(resolve(root, 'packages/fs', packageName.slice('@deepseek-ai/dsh-'.length), 'package.json'), 'utf8'));
    Object.assign(runtimePeers, inlined.dependencies, inlined.optionalDependencies, inlined.peerDependencies);
  }
  const external = specifier => isBuiltin(specifier) || (!inline.has(specifier) && !specifier.startsWith('.') && !isAbsolute(specifier));
  mkdirSync(destination, { recursive: true });
  await build({
    cwd: source, config: false, name: manifest.name, entry: { index: 'src/index.ts' }, outDir: resolve(destination, 'lib'),
    format: 'esm', platform: 'node', target: 'es2024', fixedExtension: false, dts: false, clean: false, sourcemap: true,
    deps: { neverBundle: external, alwaysBundle: specifier => inline.has(specifier) },
    plugins: [{ name: 'matching-filesystem-provider-sources', resolveId: { order: 'pre', handler(specifier, importer) {
      if (importer === undefined) return null;
      if (inline.has(specifier)) return resolveExactImport(specifier, ['node', 'import', 'default'], importer);
      if (external(specifier)) return { id: specifier, external: true };
      return null;
    } } }], failOnWarn: true,
  });
  try { cpSync(resolve(source, 'locale'), resolve(destination, 'locale'), { recursive: true }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  writeFileSync(resolve(destination, 'package.json'), JSON.stringify({ ...manifest, peerDependencies: runtimePeers }, null, 2) + '\n');
  console.log(`STAGED ${manifest.name} -> ${relative(output, destination)}`);
}
