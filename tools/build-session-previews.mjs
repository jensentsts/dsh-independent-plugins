/** Build the optional preview browser provider without replacing Session Host or interactive services. */
import { resolve, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isBuiltin } from 'node:module';
import { build } from 'tsdown';
import { resolveExactImport } from './exact-source-loader.mjs';

const root = process.env.DSH_SOURCE_ROOT;
if (!root) throw new Error('Set DSH_SOURCE_ROOT to the matching release checkout');
const destination = resolve(root, '../../packages/dsh-independent-foundations/native/session-previews');
const { clientBundle } = await import(pathToFileURL(resolve(root, 'packages/client/tsdown.client.ts')).href);
const config = clientBundle(destination, ['lib/index.js'])({}).find(config => config.platform === 'browser');
const external = specifier => isBuiltin(specifier) || config.deps.neverBundle(specifier);
await build({
  ...config, config: false, cwd: destination,
  entry: { client: resolve(root, 'packages/api/session-controller/src/client/preview-plugin.ts') },
  outDir: resolve(destination, 'lib'), clean: false, failOnWarn: true,
  plugins: [...config.plugins, {
    name: 'session-previews-matching-release',
    resolveId: { order: 'post', handler(specifier, importer) {
      if (external(specifier)) return { id: specifier, external: true };
      if (specifier.startsWith('.') || specifier.startsWith('\0') || isAbsolute(specifier)) return null;
      return resolveExactImport(specifier, ['production', 'browser', 'import', 'default'], importer) ?? null;
    } },
  }],
});
console.log('STAGED @local/dsh-session-previews; official Session controller retained');
