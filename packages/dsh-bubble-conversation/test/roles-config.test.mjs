import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, normalizeConfig, validateAvatar } from '../src/config.js';
import { roleFor, appearanceFor, memberFor, modelFamily, describeMember } from '../src/roles.js';
import { defaultAvatar, placeholderAvatar, rasterMime } from '../src/avatars.js';
import { dictionaries } from '../src/locales.js';
const t = (key, values) => dictionaries.en[key]?.replace(/\{(\w+)\}/g, (_, name) => values[name]) ?? key;
const image = `data:image/png;base64,${Buffer.from([137,80,78,71,13,10,26,10]).toString('base64')}`;

test('default configuration is independent and validates unique member rows', () => {
  assert.deepEqual(normalizeConfig({}), DEFAULT_CONFIG);
  assert.throws(() => normalizeConfig({ members: [{ id: 'a', matchType: 'role', matchValue: 'reply' }, { id: 'a', matchType: 'role', matchValue: 'reply' }] }), /duplicate/);
  assert.throws(() => normalizeConfig({ members: [{ id: '__proto__', matchType: 'role', matchValue: 'reply' }] }));
  assert.throws(() => normalizeConfig({ enabled: 'yes' }));
});
test('avatar inputs reject remote URLs, SVG, malformed and oversized data', () => {
  assert.equal(validateAvatar(image), image);
  for (const value of ['https://site/avatar.png', 'file:///secret.png', 'data:image/svg+xml;base64,PHN2Zy8+', 'data:image/png;base64,a']) assert.throws(() => validateAvatar(value));
  assert.throws(() => validateAvatar(`data:image/png;base64,${'A'.repeat(350000)}`), /256/);
});
test('member matching uses exact model/tool/source ahead of broad family and role', () => {
  const members = normalizeConfig({ members: [
    { id: 'r', matchType: 'role', matchValue: 'reply', name: 'Role' }, { id: 'f', matchType: 'family', matchValue: 'gpt', name: 'Family' },
    { id: 'm', matchType: 'model', matchValue: 'api/gpt-a', name: 'Exact' },
  ] }).members;
  assert.equal(memberFor({}, { provider: 'api', model: 'gpt-a' }, 'reply', members).name, 'Exact');
  assert.equal(memberFor({}, { provider: 'api', model: 'gpt-b' }, 'reply', members).name, 'Family');
});
test('all requested model families resolve without rewriting recorded model ids', () => {
  for (const [name, family] of [['deepseek-v4', 'deepseek'], ['gpt-6', 'gpt'], ['claude-opus', 'claude'], ['grok-4', 'grok'], ['glm-5', 'glm'], ['kimi-k2', 'kimi'], ['gemini-3', 'gemini'], ['doubao-pro', 'doubao']]) assert.equal(modelFamily({ provider: 'api', model: name }), family);
  assert.equal(modelFamily({ model: 'unknown' }), null);
});
test('tool, thinking, trigger and transport roles remain separate', () => {
  assert.equal(roleFor({ kind: 'assistant-step', part: 'reasoning' }), 'thinking');
  assert.equal(roleFor({ part: 'tool', toolName: 'read' }), 'read');
  assert.equal(roleFor({ part: 'tool', toolName: 'edit' }), 'edit');
  assert.equal(roleFor({ part: 'tool', toolName: 'subagent_fork' }), 'subagent');
  assert.equal(roleFor({ kind: 'turn-trigger', source: { kind: 'schedule' } }), 'trigger');
  assert.equal(roleFor({ kind: 'context', source: { kind: 'qq' } }), 'remote');
});
test('control/container, parent tool tree and disabled modes do not double-wrap native output', () => {
  assert.equal(appearanceFor({ contractVersion: 1, kind: 'turn-tail' }, DEFAULT_CONFIG), null);
  assert.equal(appearanceFor({ contractVersion: 1, kind: 'assistant-step', part: 'container' }, DEFAULT_CONFIG).variant, 'transparent');
  assert.equal(appearanceFor({ contractVersion: 1, kind: 'tool-call', part: 'message' }, DEFAULT_CONFIG).variant, 'transparent');
  assert.equal(appearanceFor({ contractVersion: 1, kind: 'tool-call', part: 'tool' }, DEFAULT_CONFIG).variant, 'bubble');
  assert.equal(appearanceFor({ contractVersion: 1, kind: 'question-reply', part: 'message' }, DEFAULT_CONFIG).variant, 'transparent');
  assert.equal(appearanceFor({ contractVersion: 1, kind: 'user' }, { ...DEFAULT_CONFIG, enabled: false }), null);
  assert.equal(appearanceFor({ contractVersion: 2, kind: 'user' }, DEFAULT_CONFIG), null);
});
test('custom member name keeps actual model:effort available as metadata', () => {
  const config = normalizeConfig({ members: [{ id: 'a', matchType: 'family', matchValue: 'gpt', name: 'Friend' }] });
  const fact = { provider: 'api', model: 'gpt-a', effort: 'high', effortOrigin: 'explicit', turn: 1, step: 1 };
  const view = { version: 1, byStep: { '1:1': fact } };
  const value = describeMember({ kind: 'assistant-step', turn: 1, step: 1 }, view, config, t);
  assert.equal(value.name, 'Friend'); assert.equal(value.model, 'gpt-a:high');
});
test('missing projection may show only the actual source model without inventing effort', () => {
  const value = describeMember({ kind: 'assistant-step', source: { kind: 'model', provider: 'api', model: 'gpt-a' } }, undefined, DEFAULT_CONFIG, t);
  assert.equal(value.name, 'gpt-a'); assert.equal(value.fact.effortOrigin, 'unrecorded');
});

test('generated model-family portraits retain geometric generic fallbacks and raster byte validation', () => {
  assert.match(defaultAvatar('deepseek'), /^data:image\/webp;base64,/);
  assert.match(placeholderAvatar('deepseek'), /^data:image\/svg\+xml,/);
  assert.match(defaultAvatar(null, 'user'), /^data:image\/svg\+xml,/);
  assert.match(defaultAvatar('deepseek', 'question'), /^data:image\/svg\+xml,/);
  assert.notEqual(defaultAvatar('deepseek'), defaultAvatar('gpt'));
  assert.equal(rasterMime(new Uint8Array([137,80,78,71,13,10,26,10])), 'image/png');
  assert.equal(rasterMime(new Uint8Array([1,2,3,4,5,6,7,8])), null);
});
test('all registered locales keep the complete baseline key set', () => {
  for (const [id, dictionary] of Object.entries(dictionaries)) assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(dictionaries.en).sort(), id);
});
