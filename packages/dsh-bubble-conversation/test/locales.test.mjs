import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dictionaries } from '../src/locales.js';
import { describeMember } from '../src/roles.js';
import { DEFAULT_CONFIG } from '../src/config.js';
const ids = ['en', 'zh', 'ja', 'es', 'fr', 'de', 'ru', 'pt'];
const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
const translator = id => (key, values = {}) => {
  assert.equal(Object.hasOwn(dictionaries[id], key), true, `${id}:${key} must exist without English fallback`);
  return dictionaries[id][key].replace(/\{(\w+)\}/g, (_, name) => values[name]);
};

test('all eight locales provide explicit complete text with matching named placeholders', () => {
  assert.deepEqual(Object.keys(dictionaries).sort(), ids.toSorted());
  const baseline = Object.keys(dictionaries.en).sort();
  for (const id of ids) {
    assert.deepEqual(Object.keys(dictionaries[id]).sort(), baseline, id);
    for (const key of baseline) {
      const value = dictionaries[id][key];
      assert.equal(typeof value, 'string'); assert.ok(value.trim(), `${id}:${key}`);
      assert.doesNotMatch(value, /[\u200b\ufeff]/u);
      assert.deepEqual(placeholders(value), placeholders(dictionaries.en[key]), `${id}:${key}`);
    }
  }
});

test('secondary-language explanatory text is not populated with English defaults', () => {
  const explanatory = ['description', 'placement.auto', 'avatar.notice', 'save.failed', 'error.file', 'error.config', 'status.supported', 'status.unsupported',
    'status.disabled', 'status.settings', 'questions.notice', 'effort.explicit', 'effort.default', 'effort.unrecorded', 'effort.mismatch'];
  for (const id of ['ja', 'es', 'fr', 'de', 'ru', 'pt']) {
    for (const key of explanatory) assert.notEqual(dictionaries[id][key], dictionaries.en[key], `${id}:${key}`);
  }
});

test('switching locale translates role tags while recorded models, effort and tool ids remain verbatim', () => {
  const fact = { provider: 'api', model: 'gpt-a', effort: 'high', effortOrigin: 'explicit', turn: 1, step: 1 };
  const projection = { version: 1, byStep: { '1:1': fact }, byMessageId: {}, byCallId: {} };
  for (const id of ids) {
    const t = translator(id);
    const model = describeMember({ kind: 'assistant-step', turn: 1, step: 1 }, projection, DEFAULT_CONFIG, t);
    const tool = describeMember({ kind: 'tool-call', part: 'tool', toolName: 'read' }, undefined, DEFAULT_CONFIG, t);
    assert.equal(model.name, 'gpt-a:high'); assert.equal(model.tag, dictionaries[id]['tag.reply']);
    assert.equal(tool.name, 'read'); assert.equal(tool.tag, dictionaries[id]['tag.read']);
    assert.equal(t('avatar.alt', { name: 'Alice-阿明' }).includes('Alice-阿明'), true);
    assert.equal(t('effort.explicit', { effort: 'high' }).includes('high'), true);
  }
});

test('plugin-manager metadata is available for each registered global locale', async () => {
  const english = JSON.parse(await readFile(new URL('../locale/en.json', import.meta.url), 'utf8'));
  for (const id of ids) {
    const value = JSON.parse(await readFile(new URL(`../locale/${id}.json`, import.meta.url), 'utf8'));
    assert.ok(value.meta.title.length > 0); assert.ok(value.meta.description.length > 20);
    assert.equal(value.meta.detail, 'README.md');
    if (id !== 'en') assert.notEqual(value.meta.description, english.meta.description, id);
  }
});
