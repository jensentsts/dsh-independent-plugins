/** Carry the matching release's preset options while replacing its search consumers. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';

const root = process.env.DSH_SOURCE_ROOT;
if (!root) throw new Error('Set DSH_SOURCE_ROOT to the matching release checkout');
const foundation = resolve(root, '../../packages/dsh-independent-foundations');
class JsExpression { constructor(source) { this.source = source; } }
const schema = yaml.DEFAULT_SCHEMA.extend(new yaml.Type('tag:yaml.org,2002:js', {
  kind: 'scalar', instanceOf: JsExpression,
  construct: source => new JsExpression(source), represent: value => value.source,
}));
const search = pathToFileURL(resolve(foundation, 'native/tool-fs-search/lib/index.js')).href;
const patches = [];
for (const name of ['standard', 'ptc', 'cordis']) {
  const original = yaml.load(readFileSync(resolve(root, `packages/bundle/web-app/presets/${name}.patch.yml`), 'utf8'), { schema });
  const row = original.flatMap(patch => patch.insert ?? []).find(row => row.id === `preset-${name}`);
  let replaced = 0;
  const visit = entries => {
    for (const entry of entries) {
      if (entry.name === '@deepseek-ai/dsh-tool-fs-search') { entry.name = search; replaced++; }
      if (entry.group && Array.isArray(entry.config)) visit(entry.config);
    }
  };
  visit(row.config.plugins);
  if (replaced) patches.push({ id: row.id, name: row.name, config: row.config });
}
writeFileSync(resolve(foundation, 'search-presets.patch.yml'),
  '# Generated from the matching release presets; regenerate when the source release or build path changes.\n' +
  yaml.dump(patches, { schema, noRefs: true, lineWidth: -1 }));
console.log(`STAGED alias-aware search in ${patches.length} official presets`);
