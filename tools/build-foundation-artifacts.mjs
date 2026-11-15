/** Stage matching native plugin artifacts using the release's own client build preset. No installation. */
import { mkdirSync, readFileSync, writeFileSync, cpSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isBuiltin } from 'node:module';
import { build } from 'tsdown';
import { resolveExactImport } from './exact-source-loader.mjs';
import { FOUNDATION_ROSTER } from './foundation-roster.mjs';
const root = process.env.DSH_SOURCE_ROOT;
const out = resolve(root, '../../packages/dsh-independent-foundations');
const { clientBundle } = await import(pathToFileURL(resolve(root, 'packages/client/tsdown.client.ts')).href);
const selected = process.argv.slice(2);
const names = selected.length ? selected : FOUNDATION_ROSTER.filter(row => row.client).map(row => row.directory);
if (names.some(name => !FOUNDATION_ROSTER.some(row => row.client && row.directory === name))) throw new Error('Select explicit reviewed native client packages');
process.env.DSH_CLIENT_CHAT_SETTINGS_NAMESPACE = 'ui-chat-independent';
process.env.DSH_CLIENT_CONVERSATION_SETTINGS_NAMESPACE = 'ui-conversation-independent';
for (const name of names) {
  const row = FOUNDATION_ROSTER.find(row => row.directory === name);
  const source = resolve(root, row.source);
  const destination = resolve(out, 'native', name);
  mkdirSync(destination, { recursive: true });
  const manifest = JSON.parse(readFileSync(resolve(source, 'package.json'), 'utf8'));
  // The retained installed controller still owns Host RPCs; only its Client implementation changes.
  const configs = clientBundle(source, ['src/index.ts'])({}).filter(config => !row.browserOnlyReplacement || config.platform === 'browser');
  if (row.browserOnlyReplacement) {
    mkdirSync(resolve(destination, 'lib'), { recursive: true });
    writeFileSync(resolve(destination, 'lib/index.js'), '/** Browser roster entry; the original installed Host controller is mounted separately. */\nexport function apply() {}\n');
    for (const key of ['./types', './remote-events', './typert', './remote']) delete manifest.exports[key];
    delete manifest.types;
    manifest.files = ['lib/index.js', 'lib/client.js', 'lib/client.js.map', 'locale/*.json', 'package.json', 'guard.js'];
  }
  for (const config of configs) {
    const neverBundle = config.deps?.neverBundle;
    const external = specifier => isBuiltin(specifier) || (typeof neverBundle === 'function' ? neverBundle(specifier) : false);
    const resolver = {
      name: 'isolated-already-downloaded-release-inputs',
      resolveId: { order: 'post', handler(specifier, importer) {
        if (external(specifier)) return { id: specifier, external: true };
        if (specifier.startsWith('.') || specifier.startsWith('\0') || isAbsolute(specifier)) return null;
        const found = resolveExactImport(specifier, config.platform === 'browser' ? ['production', 'browser', 'import', 'default'] : ['node', 'import', 'default'], importer);
        return found ?? null;
      } },
    };
    await build({ ...config, cwd: source, config: false, outDir: resolve(destination, 'lib'), plugins: [...(config.plugins ?? []), resolver], clean: false, failOnWarn: true });
  }
  for (const directory of ['locale']) {
    try { cpSync(resolve(source, directory), resolve(destination, directory), { recursive: true }); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  writeFileSync(resolve(destination, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`STAGED ${manifest.name} -> ${relative(out, destination)}`);
}
