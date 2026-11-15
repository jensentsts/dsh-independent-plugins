import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const explicit = process.env.DSH_BUBBLE_ESBUILD;
if (!explicit) throw new Error('Set DSH_BUBBLE_ESBUILD to an existing esbuild lib/main.js; this build never installs dependencies.');
const esbuild = await import(pathToFileURL(resolve(explicit)).href);
const result = await esbuild.build({ entryPoints: [resolve(root, 'src/client.js')], bundle: true, platform: 'browser', format: 'cjs',
  external: ['react'], loader: { '.css': 'text' }, write: false, target: ['es2022'], charset: 'utf8', legalComments: 'inline' });
const body = result.outputFiles[0].text;
const client = `window.__ModuleLoader__.load({\n  id: 'dsh-bubble-conversation',\n  factory(require) {\n    const module = { exports: {} };\n    const exports = module.exports;\n${body}\n    return module.exports;\n  },\n});\n`;
await mkdir(resolve(root, 'lib'), { recursive: true });
await writeFile(resolve(root, 'lib/client.js'), client, 'utf8');
console.log('Built lib/client.js without installing dependencies.');
