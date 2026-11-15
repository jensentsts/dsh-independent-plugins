/** Test/build-only resolver for one explicitly selected exact checkout. Never used by installed plugins. */
import { registerHooks, createRequire } from 'node:module';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, dirname, extname, isAbsolute, relative } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = process.env.DSH_SOURCE_ROOT;
if (!root || !isAbsolute(root)) throw new Error('DSH_SOURCE_ROOT must be an absolute matching-release checkout');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
if (readJson(resolve(root, 'package.json')).version !== '0.2.2-rc.1') throw new Error('This source loader requires the exact 0.2.2-rc.1 release');
const store = resolve(root, 'node_modules/.pnpm');
const tsPath = resolve(store, 'typescript@6.0.3/node_modules/typescript/lib/typescript.js');
const ts = (await import(pathToFileURL(tsPath).href)).default;
const config = ts.readConfigFile(resolve(root, 'tsconfig.base.json'), path => readFileSync(path, 'utf8')).config;
const paths = Object.entries(config.compilerOptions.paths).sort(([a], [b]) => b.length - a.length);
const packageDirectories = new Map();
const entries = readdirSync(store).sort();
const hasFile = path => existsSync(path) && statSync(path).isFile();
const yaml = (await import(pathToFileURL(resolve(store, 'js-yaml@4.3.2/node_modules/js-yaml/dist/js-yaml.mjs')).href));
const importers = yaml.load(readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8')).importers;
function selectedVersion(name, importer) {
  if (!importer) return undefined;
  let current;
  try { current = dirname(importer.startsWith('file:') ? fileURLToPath(importer) : importer.split('?')[0]); }
  catch { return undefined; }
  while (true) {
    const key = relative(root, current).replaceAll('\\', '/') || '.';
    const row = importers[key];
    if (row) {
      const dependency = row.dependencies?.[name] ?? row.devDependencies?.[name] ?? row.optionalDependencies?.[name];
      const version = dependency?.version;
      if (typeof version === 'string' && /^\d/.test(version)) return version.split('(')[0];
    }
    if (current === root || dirname(current) === current) break;
    current = dirname(current);
  }
}

/** Locate an already downloaded dependency. This performs no installation, linking, or network access. */
export function downloadedPackageDirectory(name, importer) {
  const selection = selectedVersion(name, importer);
  const cacheKey = name + ':' + (selection ?? 'root');
  if (packageDirectories.has(cacheKey)) return packageDirectories.get(cacheKey);
  const prefix = name.replace('/', '+') + '@';
  const candidates = entries.filter(entry => entry.startsWith(prefix)).map(entry => resolve(store, entry, 'node_modules', name)).filter(dir => hasFile(resolve(dir, 'package.json')));
  if (!candidates.length) return undefined;
  const versions = new Set(candidates.map(dir => readJson(resolve(dir, 'package.json')).version));
  // Prefer root's exact selected lockfile version when unrelated transitive versions also exist.
  const wanted = selection ?? { typescript: '6.0.3', vite: '8.2.2', vitest: '4.1.11', esbuild: '0.28.1', tsx: '4.23.13', jsdom: '29.1.1', zod: '4.4.3', tslib: '2.8.1', react: '18.3.1', 'react-dom': '18.3.1', immer: '10.2.0', zustand: '4.5.7', chokidar: '5.0.0', koffi: '3.1.1' }[name];
  const filtered = wanted ? candidates.filter(dir => readJson(resolve(dir, 'package.json')).version === wanted) : candidates;
  if (!filtered.length || (!wanted && versions.size > 1)) throw new Error(`Ambiguous downloaded dependency ${name}: ${[...versions].join(', ')}; declare an explicit test version`);
  packageDirectories.set(cacheKey, filtered[0]);
  return filtered[0];
}

function selectedExport(value, conditions) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) { for (const item of value) { const chosen = selectedExport(item, conditions); if (chosen) return chosen; } return undefined; }
  if (!value || typeof value !== 'object') return undefined;
  for (const [condition, item] of Object.entries(value)) if (condition === 'default' || conditions.has(condition)) { const chosen = selectedExport(item, conditions); if (chosen) return chosen; }
}
function exportTarget(exports, suffix, conditions) {
  if (typeof exports === 'string' || Array.isArray(exports)) return suffix ? undefined : selectedExport(exports, conditions);
  if (!exports || typeof exports !== 'object') return undefined;
  const key = suffix ? `./${suffix}` : '.';
  if (Object.keys(exports).some(k => k.startsWith('.'))) {
    if (Object.hasOwn(exports, key)) return selectedExport(exports[key], conditions);
    for (const pattern of Object.keys(exports).filter(k => k.includes('*')).sort((a, b) => b.length - a.length)) {
      const [before, after] = pattern.split('*');
      if (!key.startsWith(before) || !key.endsWith(after)) continue;
      const target = selectedExport(exports[pattern], conditions);
      if (target) return target.replaceAll('*', key.slice(before.length, key.length - after.length));
    }
    return undefined;
  }
  return suffix ? undefined : selectedExport(exports, conditions);
}

/** Resolve exact workspace source or an already downloaded third-party module for test runners. */
export function resolveExactImport(specifier, conditions = ['node', 'import'], importer) {
  if (specifier.startsWith('@deepseek-ai/') && specifier.includes('/src/')) {
    const pieces = specifier.split('/');
    const packageName = pieces.slice(0, 2).join('/');
    const mapping = paths.find(([key]) => key === packageName);
    if (mapping) {
      const sourceDirectory = resolve(root, mapping[1][0]);
      const packageDirectory = sourceDirectory.endsWith('src') ? dirname(sourceDirectory) : dirname(dirname(sourceDirectory));
      const source = resolve(packageDirectory, pieces.slice(2).join('/'));
      if (hasFile(source)) return source;
    }
  }
  for (const [pattern, targets] of paths) {
    const star = pattern.indexOf('*');
    const before = star === -1 ? pattern : pattern.slice(0, star);
    const after = star === -1 ? '' : pattern.slice(star + 1);
    if (star === -1 ? specifier !== pattern : !specifier.startsWith(before) || !specifier.endsWith(after)) continue;
    const middle = star === -1 ? '' : specifier.slice(before.length, specifier.length - after.length);
    for (const target of targets) {
      let absolute = resolve(root, target.replace('*', middle));
      if (existsSync(absolute) && statSync(absolute).isDirectory()) absolute = resolve(absolute, 'index.ts');
      if (hasFile(absolute)) return absolute;
    }
  }
  if (specifier.startsWith('.') || specifier.includes(':') || isAbsolute(specifier) || specifier.startsWith('#')) return undefined;
  const parts = specifier.split('/');
  const count = specifier.startsWith('@') ? 2 : 1;
  const name = parts.slice(0, count).join('/');
  const suffix = parts.slice(count).join('/');
  const dir = downloadedPackageDirectory(name, importer);
  if (!dir) return undefined;
  const manifest = readJson(resolve(dir, 'package.json'));
  const target = manifest.exports ? exportTarget(manifest.exports, suffix, new Set(conditions)) : suffix || (conditions.includes('node') ? manifest.main || 'index.js' : manifest.module || manifest.main || 'index.js');
  if (!target) return undefined;
  let result = resolve(dir, target);
  if (!hasFile(result) && hasFile(result + '.js')) result += '.js';
  if (!hasFile(result) && hasFile(resolve(result, 'index.js'))) result = resolve(result, 'index.js');
  return hasFile(result) ? result : undefined;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@deepseek-ai/') || ['vite', 'vitest', 'typescript', 'react', 'react-dom', 'zod'].some(name => specifier === name || specifier.startsWith(name + '/'))) {
      const source = resolveExactImport(specifier, context.conditions, context.parentURL);
      if (source) return { url: pathToFileURL(source).href, shortCircuit: true };
    }
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (!['ERR_MODULE_NOT_FOUND', 'MODULE_NOT_FOUND'].includes(error.code)) throw error;
      const found = resolveExactImport(specifier, context.conditions, context.parentURL);
      if (!found) throw error;
      return { url: pathToFileURL(found).href, shortCircuit: true };
    }
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && ['.ts', '.tsx'].includes(extname(fileURLToPath(url)))) {
      const file = fileURLToPath(url);
      if (file.endsWith('.d.ts')) throw new Error(`Declaration is not an executable test module: ${file}`);
      const result = ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, experimentalDecorators: false, sourceMap: true, inlineSources: true } });
      return { format: 'module', source: result.outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
