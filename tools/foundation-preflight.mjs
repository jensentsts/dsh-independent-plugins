/** Read-only deployment checks over official Cordis patch composition; never activates plugins or evaluates !!js. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { load } from 'js-yaml';
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include';
import { composeEntries, loadOverlayPatches } from '@deepseek-ai/dsh-app-boot';

const PRESET_PACKAGE = '@deepseek-ai/dsh-agent-preset';
const SUPPORTED_PRESETS = new Set(['standard', 'ptc', 'cordis']);
const ROW_FIELDS = new Set(['config', 'inject', 'isolate', 'intercept']);
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (left, right) => isDeepStrictEqual(left, right);
const enabled = row => row?.disabled === undefined || row.disabled === null || row.disabled === false;
const disabledKnown = row => enabled(row) || row?.disabled === true;
const omit = (row, keys) => Object.fromEntries(Object.entries(row ?? {}).filter(([key]) => !keys.includes(key)));
const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
/** Hash inert JSON/YAML data without depending on mapping key order. */
export const foundationConfigHash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

function rowsIn(rows) {
  const result = [];
  for (const row of rows) {
    if (!object(row)) continue;
    result.push(row);
    if (row.group === true && Array.isArray(row.config)) result.push(...rowsIn(row.config));
  }
  return result;
}
function nativeDirectory(name) {
  if (typeof name !== 'string' || !name.startsWith('file:')) return undefined;
  try {
    const url = new URL(name);
    const match = decodeURIComponent(url.pathname).replaceAll('\\', '/').match(/\/native\/([^/]+)\//u);
    return match?.[1];
  } catch { return undefined; }
}
function guardedNative(name, directory) {
  return nativeDirectory(name) === directory && new URL(name).pathname.endsWith('/guard.js');
}
function replaceSearch(config, originalPackage, nativeName) {
  if (!object(config) || !Array.isArray(config.plugins)) return undefined;
  const copy = structuredClone(config);
  for (const row of rowsIn(copy.plugins)) if (row.name === originalPackage) row.name = nativeName;
  return copy;
}
function layerList(value, scope, issue) {
  if (!Array.isArray(value)) { issue('invalid-patch-list', scope); return []; }
  const layers = value.length > 0 && value.every(Array.isArray) ? value : [value];
  for (const layer of layers) for (const patch of layer) {
    if (!object(patch) || (patch.insert !== undefined && !Array.isArray(patch.insert))) issue('invalid-patch-entry', scope);
  }
  return layers;
}

/**
 * Compare reviewed replacements and complete preset configurations after every supplied layer.
 * @param input Explicit baseline, foundation and later user patch data; no paths or live Context are read.
 * @returns All independent issues and the final inert entries; callers must not print entries containing private config.
 */
export function inspectFoundationComposition(input = {}) {
  const issues = [];
  const seenIssues = new Set();
  const issue = (code, scope, row) => {
    const item = { code, scope, ...(row === undefined ? {} : { row }) };
    const key = JSON.stringify(item);
    if (!seenIssues.has(key)) { seenIssues.add(key); issues.push(item); }
  };
  if (!object(input)) return { ok: false, issues: [{ code: 'invalid-input', scope: 'input' }], entries: [] };
  const { baselinePatches = [], foundationPatches = [], userPatches = [], roster = [], expectations = {} } = input;
  const baselineLayers = layerList(baselinePatches, 'baseline', issue);
  const foundationLayers = layerList(foundationPatches, 'foundation', issue);
  const userLayers = layerList(userPatches, 'user', issue);
  const compose = (layers, scope) => {
    try {
      return composeEntries(layers, message => issue(message.startsWith('patch: name mismatch') ? 'patch-name-mismatch'
        : message.includes('not found') ? 'patch-target-missing' : message.includes('not a group') ? 'patch-target-not-group'
          : 'composition-warning', scope));
    } catch { issue('composition-invalid', scope); return []; }
  };
  const baseline = compose(baselineLayers, 'baseline');
  const planned = compose([...baselineLayers, ...foundationLayers], 'foundation');
  const entries = compose([...baselineLayers, ...foundationLayers, ...userLayers], 'final');
  if (!Array.isArray(roster) || !object(expectations)) {
    issue('invalid-expectations', 'input');
    return { ok: false, issues, entries };
  }
  const reviewed = roster.filter(row => object(row) && !row.supportArtifact);
  if (reviewed.length === 0) issue('empty-reviewed-roster', 'input');
  if (reviewed.some(row => !['row', 'replacement', 'package', 'directory'].every(key => typeof row[key] === 'string' && row[key]))) issue('invalid-roster-row', 'input');
  const validRoster = reviewed.filter(row => ['row', 'replacement', 'package', 'directory'].every(key => typeof row[key] === 'string' && row[key]));
  if (validRoster.some(row => row.preferences !== undefined && (!Array.isArray(row.preferences) || row.preferences.some(key => typeof key !== 'string')))) {
    issue('invalid-preference-allowlist', 'input');
    return { ok: false, issues, entries };
  }
  const baselineRows = rowsIn(baseline);
  const plannedRows = rowsIn(planned);
  const finalRows = rowsIn(entries);
  const sourceById = new Map(baselineRows.map(row => [row.id, row]));
  const finalById = new Map(finalRows.map(row => [row.id, row]));
  const plannedById = new Map(plannedRows.map(row => [row.id, row]));
  const checkRows = (rows, scope) => {
    const ids = new Set();
    for (const row of rowsIn(rows)) {
      if (typeof row.id !== 'string' || !row.id) issue('missing-row-id', scope);
      else if (ids.has(row.id)) issue('duplicate-row-id', scope, row.id);
      else ids.add(row.id);
      if (typeof row.name !== 'string' || !row.name) issue('missing-plugin-name', scope, row.id);
      if (row.group === true && !Array.isArray(row.config)) issue('invalid-group-entries', scope, row.id);
    }
  };
  for (const [scope, rows] of [['baseline', baseline], ['foundation', planned], ['final', entries]]) {
    checkRows(rows, scope);
    for (const preset of rowsIn(rows).filter(row => row.name === PRESET_PACKAGE)) {
      if (!object(preset.config) || !Array.isArray(preset.config.plugins)) issue('invalid-preset-config', scope, preset.id);
      else checkRows(preset.config.plugins, `${scope}/preset/${preset.id}`);
    }
  }
  for (const review of validRoster) {
    const source = sourceById.get(review.row);
    const old = finalById.get(review.row);
    const target = finalById.get(review.replacement);
    if (!source || source.name !== review.package) issue('baseline-native-row-mismatch', 'root', review.row);
    if (!old || old.name !== review.package || old.disabled !== true) issue('original-row-not-disabled', 'root', review.row);
    if (!target) { issue('replacement-row-missing', 'root', review.replacement); continue; }
    if (!guardedNative(target.name, review.directory)) issue('replacement-not-guarded-file-url', 'root', review.replacement);
    if (!source) continue;
    if (!disabledKnown(source) || !disabledKnown(target)) issue('unresolved-disabled-expression', 'root', review.replacement);
    else if (enabled(source) !== enabled(target)) issue(review.filesystemProvider ? 'filesystem-provider-state-changed' : 'replacement-state-changed', 'root', review.replacement);
    if (review.browserOnlyReplacement) {
      const copy = (Array.isArray(expectations.rootCopies) ? expectations.rootCopies : []).find(record => object(record) && record.source === review.row);
      if (!copy || !['config', 'inject', 'isolate', 'intercept'].every(key => copy.keys?.includes(key))) issue('original-host-copy-not-reviewed', 'root', review.row);
      if (['config', 'inject', 'isolate', 'intercept'].some(key => Object.hasOwn(target, key))) issue('browser-noop-inherits-host-metadata', 'root', review.replacement);
      if (copy) {
        const wrapper = finalById.get(copy.target);
        if (!wrapper?.name?.startsWith('file:') || !wrapper.name.endsWith('/original-hosts/session-controller.js')) issue('original-host-wrapper-name-invalid', 'root-copy', copy.target);
      }
      const metadata = finalById.get('session-controller-original-typert');
      if (!metadata?.name?.startsWith('file:') || !metadata.name.endsWith('/original-hosts/session-controller-typert.js') || (disabledKnown(source) && enabled(source) !== enabled(metadata))) issue('original-host-typert-owner-invalid', 'root', 'session-controller-original-typert');
      continue;
    }
    const ignored = ['id', 'name', 'disabled', ...(review.preferences ? ['config'] : [])];
    if (!same(omit(source, ignored), omit(target, ignored))) issue('replacement-metadata-not-preserved', 'root', review.replacement);
    if (review.preferences) {
      const allowed = new Set(review.preferences);
      for (const row of [source, target]) {
        if (row.config !== undefined && (!object(row.config) || Object.keys(row.config).some(key => !allowed.has(key)))) issue('unreviewed-preference-config', 'root', review.replacement);
      }
      const projected = row => Object.fromEntries(Object.entries(object(row.config) ? row.config : {}).filter(([key]) => allowed.has(key)));
      if (!same(projected(source), projected(target))) issue('public-preferences-not-preserved', 'root', review.replacement);
    }
  }
  const rootCopies = expectations.rootCopies ?? [];
  if (!Array.isArray(rootCopies)) issue('invalid-root-copy-expectations', 'input');
  else for (const copy of rootCopies) {
    if (!object(copy) || typeof copy.source !== 'string' || typeof copy.target !== 'string' || !Array.isArray(copy.keys)) { issue('invalid-root-copy-expectations', 'input'); continue; }
    const source = sourceById.get(copy.source);
    const target = finalById.get(copy.target);
    if (!source || !target) { issue('root-copy-row-missing', 'root-copy', copy.target); continue; }
    if (!disabledKnown(source) || !disabledKnown(target) || enabled(source) !== enabled(target)) issue('root-copy-state-changed', 'root-copy', copy.target);
    for (const key of copy.keys) {
      if (!ROW_FIELDS.has(key)) { issue('unsupported-root-copy-field', 'root-copy', copy.target); continue; }
      if (!same(source[key], target[key])) issue('root-copy-field-changed', 'root-copy', copy.target);
    }
  }
  // A local replacement must not alter a currently selected remote provider or its connection configuration.
  for (const row of baselineRows.filter(row => /(?:remote|fs-peer)/iu.test(row.name ?? '') && enabled(row))) {
    if (!same(row, finalById.get(row.id))) issue('active-remote-row-changed', 'root', row.id);
  }
  const search = validRoster.find(row => row.directory === 'tool-fs-search');
  const searchTarget = search && finalById.get(search.replacement)?.name;
  const expectedPresets = expectations.presets ?? [];
  if (!Array.isArray(expectedPresets)) issue('invalid-preset-expectations', 'input');
  const presetExpectations = new Map((Array.isArray(expectedPresets) ? expectedPresets : []).filter(object).map(record => [record.row, record]));
  const baselinePresets = baselineRows.filter(row => row.name === PRESET_PACKAGE);
  for (const preset of baselinePresets) {
    const final = finalById.get(preset.id);
    const plannedPreset = plannedById.get(preset.id);
    const expected = presetExpectations.get(preset.id);
    const hasSearch = object(preset.config) && Array.isArray(preset.config.plugins) && search && rowsIn(preset.config.plugins).some(row => row.name === search.package);
    const supported = SUPPORTED_PRESETS.has(preset.config?.id);
    if (hasSearch && !supported && expected === undefined) issue('unsupported-custom-search-preset', 'preset', preset.id);
    const transformed = hasSearch && supported && searchTarget ? replaceSearch(preset.config, search.package, searchTarget) : preset.config;
    if (expected && !same(expected.originalConfig, preset.config)) issue('unsupported-baseline-preset-override', 'preset', preset.id);
    if (expected && !same(expected.patchedConfig, transformed)) issue('preset-expectation-not-search-only', 'preset', preset.id);
    const wanted = expected?.patchedConfig ?? transformed;
    if (!plannedPreset || !same(plannedPreset.config, wanted)) issue('preset-restatement-incomplete', 'foundation', preset.id);
    if (!final || !same(final.config, wanted)) issue('preset-final-config-changed', 'final', preset.id);
    if (!final || !same(omit(final, ['config']), omit(preset, ['config']))) issue('preset-row-metadata-changed', 'final', preset.id);
  }
  for (const [id] of presetExpectations) if (!baselinePresets.some(row => row.id === id)) issue('expected-preset-missing', 'preset', id);
  for (const preset of finalRows.filter(row => row.name === PRESET_PACKAGE && !sourceById.has(row.id))) {
    const children = Array.isArray(preset.config?.plugins) ? rowsIn(preset.config.plugins) : [];
    if (children.some(row => row.name === search?.package || nativeDirectory(row.name) === 'tool-fs-search')) issue('unsupported-added-search-preset', 'preset', preset.id);
  }
  const clientPackages = expectations.clientPackages ?? validRoster.filter(row => row.client).map(row => ({ id: row.replacement, moduleId: row.package, name: finalById.get(row.replacement)?.name }));
  if (!Array.isArray(clientPackages)) issue('invalid-client-expectations', 'input');
  else {
    const expectedIds = new Set();
    const expectedModules = new Set();
    for (const pkg of clientPackages) {
      if (!object(pkg) || typeof pkg.id !== 'string' || typeof pkg.moduleId !== 'string' || typeof pkg.name !== 'string') { issue('invalid-client-expectations', 'input'); continue; }
      if (expectedIds.has(pkg.id) || expectedModules.has(pkg.moduleId)) issue('duplicate-client-expectation', 'client', pkg.id);
      expectedIds.add(pkg.id); expectedModules.add(pkg.moduleId);
      if (finalById.get(pkg.id)?.name !== pkg.name) issue('client-owner-name-changed', 'client', pkg.id);
    }
    const owners = new Map();
    const allRows = [...finalRows, ...finalRows.filter(row => row.name === PRESET_PACKAGE).flatMap(row => Array.isArray(row.config?.plugins) ? rowsIn(row.config.plugins) : [])];
    for (const row of allRows.filter(enabled)) {
      const review = validRoster.find(item => item.client && (row.name === item.package || nativeDirectory(row.name) === item.directory));
      const pkg = clientPackages.find(item => object(item) && row.name === item.name);
      const moduleId = review?.package ?? pkg?.moduleId;
      if (!moduleId) continue;
      const list = owners.get(moduleId) ?? [];
      list.push(row.id); owners.set(moduleId, list);
    }
    for (const [moduleId, ids] of owners) if (ids.length > 1) issue('duplicate-active-client-owner', 'client', validRoster.find(row => row.package === moduleId)?.replacement);
  }
  return { ok: issues.length === 0, issues, entries };
}

/** Compatibility spelling for callers supplying a baseline entry list and one patch list. */
export function analyzeDeploymentPlan({ baseline = [], patches = [], expectations = {}, roster = [] } = {}) {
  const baselinePatches = baseline.some(row => object(row) && typeof row.name === 'string' && row.insert === undefined)
    ? [{ insert: baseline }] : baseline;
  return inspectFoundationComposition({ baselinePatches, foundationPatches: patches, expectations, roster });
}

/** Read only an explicitly named input and patch files; return a compact report without configuration values. */
export function runFoundationPreflightCli(argv) {
  if (argv.length !== 2 || argv[0] !== '--input') return { status: 2, report: { ok: false, issues: [{ code: 'usage-requires-explicit-input', scope: 'input' }] } };
  const path = resolve(argv[1]);
  const readData = file => {
    const bytes = readFileSync(file);
    if (bytes.length > MAX_INPUT_BYTES) throw new Error('bounded-input');
    return load(bytes.toString('utf8'), { schema: entryListSchema });
  };
  let input;
  try { input = readData(path); }
  catch { return { status: 2, report: { ok: false, issues: [{ code: 'input-unreadable-or-invalid', scope: 'input' }] } }; }
  if (!object(input)) return { status: 2, report: { ok: false, issues: [{ code: 'invalid-input', scope: 'input' }] } };
  const loadingIssues = [];
  for (const [scope, field] of [['baseline', 'baselinePatches'], ['foundation', 'foundationPatches'], ['user', 'userPatches']]) {
    const files = input.patchFiles?.[scope];
    if (files === undefined) continue;
    if (!Array.isArray(files) || files.length > 128 || files.some(file => typeof file !== 'string')) { loadingIssues.push({ code: 'invalid-patch-file-list', scope }); continue; }
    const loaded = [];
    for (const file of files) {
      try { loaded.push(loadOverlayPatches('foundation-preflight', resolve(dirname(path), file))); }
      catch { loadingIssues.push({ code: 'patch-file-unreadable-or-invalid', scope }); }
    }
    input[field] = [...(Array.isArray(input[field]) && input[field].length ? (input[field].every(Array.isArray) ? input[field] : [input[field]]) : []), ...loaded];
  }
  const result = inspectFoundationComposition(input);
  const issues = [...loadingIssues, ...result.issues];
  return { status: issues.length === 0 ? 0 : 1, report: { ok: issues.length === 0, issues, entryCount: rowsIn(result.entries).length } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { status, report } = runFoundationPreflightCli(process.argv.slice(2));
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = status;
}
