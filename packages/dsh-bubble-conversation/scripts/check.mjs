import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
let count = 0;
async function visit(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    if (item.isDirectory()) { if (item.name !== 'node_modules') await visit(path); continue; }
    if (/\.(?:js|mjs)$/.test(item.name)) {
      const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' });
      if (result.status !== 0) throw new Error(`Syntax check failed: ${path}`);
      count += 1;
    }
  }
}
await visit(root);
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
for (const entry of ['index.js', 'lib/client.js', 'locale/en.json', 'locale/zh.json', 'icon.svg', 'cordis.patch.yml']) await readFile(resolve(root, entry));
if (manifest.name !== 'dsh-bubble-conversation' || !manifest.dsh?.client || !manifest.exports?.['./client']) throw new Error('Invalid plugin manifest');
console.log(`Checked ${count} JavaScript files and required distribution resources.`);
