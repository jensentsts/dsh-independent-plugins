/** Check selected release source trees against their face-specific compiler settings without relinking packages. */
import { readFileSync, existsSync, statSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import ts from 'typescript';
import { resolveExactImport, downloadedPackageDirectory } from './exact-source-loader.mjs';
const root = process.env.DSH_SOURCE_ROOT;
const face = process.argv[2];
const scopes = process.argv.slice(3);
if (!['host', 'client'].includes(face) || !scopes.length || scopes.some(p => p.includes('..') || !p.startsWith('packages/'))) throw new Error('Usage: check-exact-types.mjs host|client packages/group/package [...]');
const configPath = resolve(root, face === 'client' ? 'tsconfig.base.client.json' : 'tsconfig.base.json');
const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, ts.sys);
if (!parsed) throw new Error('Cannot read release compiler settings');
const nodeTypes = downloadedPackageDirectory('@types/node', resolve(root, 'package.json'));
const reactTypes = downloadedPackageDirectory('@types/react', resolve(root, 'package.json'));
const reactDomTypes = downloadedPackageDirectory('@types/react-dom', resolve(root, 'package.json'));
const typeRoots = [resolve(root, 'scripts/types'), dirname(nodeTypes)];
if (reactTypes) typeRoots.push(dirname(reactTypes));
if (reactDomTypes) typeRoots.push(dirname(reactDomTypes));
const options = { ...parsed.options, composite: false, incremental: false, noEmit: true, declaration: false, declarationMap: false, sourceMap: false, rootDir: root, typeRoots };
const roots = [];
function walk(path) {
  for (const item of readdirSync(path, { withFileTypes: true })) {
    const file = join(path, item.name);
    if (item.isDirectory()) walk(file);
    else if (/\.tsx?$/.test(item.name)) roots.push(file);
  }
}
for (const scope of scopes) walk(resolve(root, scope, 'src'));
const host = ts.createCompilerHost(options);
const originalRead = host.readFile.bind(host);
host.readFile = path => {
  const source = originalRead(path);
  if (path.endsWith('/lib/index.js') || path.endsWith('\\lib\\index.js')) return source;
  return source;
};
host.resolveModuleNames = (names, containingFile) => names.map(name => {
  const found = ts.resolveModuleName(name, containingFile, options, host).resolvedModule;
  if (found) return found;
  try {
    let path = resolveExactImport(name, ['types', 'node', 'import', 'default'], containingFile);
    if (!path) return undefined;
    if (name === 'react-dom' || name.startsWith('react-dom/')) {
      const suffix = name === 'react-dom' ? 'index.d.ts' : name.slice('react-dom/'.length) + '.d.ts';
      const file = resolve(reactDomTypes, suffix); if (existsSync(file)) path = file;
    }
    let declaration = path;
    if (/\.[cm]?js$/.test(path)) {
      const candidate = path.replace(/\.[cm]?js$/, '.d.ts');
      if (existsSync(candidate)) declaration = candidate;
    }
    if (!/\.d\.[cm]?ts$/.test(path) && /node_modules/.test(path)) {
      const pieces = name.split('/'); const count = name.startsWith('@') ? 2 : 1;
      const dir = downloadedPackageDirectory(pieces.slice(0, count).join('/'), containingFile);
      const manifest = dir ? JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8')) : null;
      const mainTypes = manifest?.types ?? manifest?.typings;
      if (mainTypes && name.split('/').length === count && existsSync(resolve(dir, mainTypes))) declaration = resolve(dir, mainTypes);
    }
    return { resolvedFileName: declaration, extension: declaration.endsWith('.tsx') ? ts.Extension.Tsx : declaration.endsWith('.d.mts') ? ts.Extension.Dmts : declaration.endsWith('.d.cts') ? ts.Extension.Dcts : declaration.endsWith('.d.ts') ? ts.Extension.Dts : declaration.endsWith('.ts') ? ts.Extension.Ts : declaration.endsWith('.json') ? ts.Extension.Json : ts.Extension.Js, isExternalLibraryImport: declaration.includes('node_modules') };
  } catch { return undefined; }
});
const program = ts.createProgram(roots, options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
const report = diagnostics.map(d => ({ code: d.code, file: d.file ? relative(root, d.file.fileName).replaceAll('\\', '/') : undefined, line: d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : undefined, message: ts.flattenDiagnosticMessageText(d.messageText, '\n') }));
const own = report.filter(d => d.file && scopes.some(scope => d.file.startsWith(scope + '/')));
const path = resolve(root, '../../diagnostics', `types-${face}.json`);
mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify({ face, scopes, total: report.length, own: own.length, diagnostics: report }, null, 2));
for (const item of own) console.error(`${item.file}:${item.line} TS${item.code}: ${item.message}`);
console.log(JSON.stringify({ face, totalDiagnostics: report.length, selectedScopeDiagnostics: own.length, report: path }));
if (diagnostics.length) process.exitCode = 1;
