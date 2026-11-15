import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { DEFAULT_CONFIG } from '../src/config.js';

const artifact = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
function harness({ chrome = false, questions = false, questionVersion = 1 } = {}) {
  let plugin;
  const effects = [];
  const slotEntries = [];
  const configListeners = new Set();
  const appearanceEntries = new Map();
  const questionEntries = new Map();
  let questionRegistrations = 0;
  let questionEffectOff;
  let pendingQuestionChild;
  let snapshot = { status: 'ready', value: { ...DEFAULT_CONFIG }, writable: true };
  let styleCount = 0;
  let activeLocale = 'en';
  const registeredLocales = new Map();
  const form = { getSnapshot: () => snapshot, subscribe(fn) { configListeners.add(fn); return () => configListeners.delete(fn); }, set: async () => true };
  const service = { contractVersion: 1, registerAppearance(entry) { assert.equal(appearanceEntries.has(entry.id), false); appearanceEntries.set(entry.id, entry); return () => appearanceEntries.delete(entry.id); } };
  const questionService = { contractVersion: questionVersion, registerPresentation(entry) {
    assert.equal(questionEntries.has(entry.id), false); questionEntries.set(entry.id, entry); questionRegistrations += 1;
    return () => questionEntries.delete(entry.id);
  } };
  const questionChild = { get: key => key === 'uiQuestionPresentation' ? questionService : undefined,
    effect(fn) { const off = fn(); if (typeof off === 'function') { questionEffectOff = off; effects.push(() => { if (questionEffectOff === off) { off(); questionEffectOff = undefined; } }); } } };
  const context = {
    locale: { register(namespace, values) { registeredLocales.set(namespace, values); return () => registeredLocales.delete(namespace); },
      bind: namespace => (key, values = {}) => (registeredLocales.get(namespace)?.[activeLocale]?.[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => values[name]) },
    configForms: { get: namespace => { assert.equal(namespace, 'dsh-bubble-conversation'); return form; } },
    effect(fn) { const off = fn(); if (typeof off === 'function') effects.push(off); },
    inject(keys, fn) {
      if (keys[0] === 'uiQuestionPresentation') { pendingQuestionChild = fn; if (questions) fn(questionChild); return; }
      assert.deepEqual(Array.from(keys), ['uiChatChrome']); if (chrome) fn(context);
    },
    get: key => key === 'uiChatChrome' && chrome ? service : undefined,
    slots: { inject(name, fn) { const off = fn(); if (typeof off === 'function') effects.push(off); }, register(options, component) {
      const value = { options, component }; slotEntries.push(value); return () => { const i = slotEntries.indexOf(value); if (i >= 0) slotEntries.splice(i, 1); };
    } },
  };
  const fakeReact = { createElement() {}, useState() {} };
  vm.runInNewContext(artifact, { window: { __ModuleLoader__: { load(value) { plugin = value.factory(name => { assert.equal(name, 'react'); return fakeReact; }); } } },
    document: { createElement: () => ({ dataset: {}, remove() { styleCount -= 1; } }), head: { appendChild() { styleCount += 1; } } }, console });
  plugin.apply(context);
  return { context, slotEntries, appearanceEntries, questionEntries, get questionRegistrations() { return questionRegistrations; },
    get questionMode() { return questionEntries.values().next().value?.mode ?? 'aggregate'; },
    enterQuestions() { pendingQuestionChild(questionChild); }, leaveQuestions() { questionEffectOff?.(); questionEffectOff = undefined; },
    get styleCount() { return styleCount; }, configListeners, registeredLocales,
    setLocale(id) { activeLocale = id; },
    update(value) { snapshot = { ...snapshot, value }; for (const listener of configListeners) listener(); },
    setSnapshot(value) { snapshot = value; for (const listener of configListeners) listener(); },
    dispose() { for (const off of effects.reverse()) off(); } };
}

test('unpatched host keeps native transcript untouched and exposes an unsupported settings state', () => {
  const host = harness();
  assert.deepEqual(host.slotEntries.map(entry => entry.options.name), ['settings.section']);
  const injected = host.slotEntries[0].options.inject();
  assert.equal(injected.hooks.chromeSupport.getSnapshot().supported, false);
  assert.equal(host.appearanceEntries.size, 0);
  host.dispose(); assert.equal(host.styleCount, 0); assert.equal(host.slotEntries.length, 0);
});

test('v1 installs only header/avatar plus pure appearance, and cleans up on unload', () => {
  const host = harness({ chrome: true });
  assert.equal(host.appearanceEntries.size, 1);
  assert.deepEqual(host.slotEntries.map(entry => entry.options.name), ['settings.section', 'conversation.chat.message.header', 'conversation.chat.message.avatar']);
  assert.equal(host.appearanceEntries.get('dsh-bubble-conversation').select({ contractVersion: 1, kind: 'user' }).variant, 'bubble');
  host.update({ ...DEFAULT_CONFIG, enabled: false });
  assert.equal(host.appearanceEntries.get('dsh-bubble-conversation').select({ contractVersion: 1, kind: 'user' }), null);
  host.dispose(); assert.equal(host.appearanceEntries.size, 0); assert.equal(host.configListeners.size, 0); assert.equal(host.slotEntries.length, 0); assert.equal(host.styleCount, 0);
});

test('artifact registers complete locale dictionaries and settings navigation follows global language', () => {
  const host = harness();
  const section = host.slotEntries.find(entry => entry.options.name === 'settings.section');
  const values = host.registeredLocales.get('dsh-bubble-conversation');
  const expected = { ja: '会話メンバー', es: 'Miembros de la conversación', fr: 'Membres de la conversation', de: 'Gesprächsmitglieder', ru: 'Участники разговора', pt: 'Membros da conversa' };
  const baseline = Object.keys(values.en).sort();
  for (const [locale, label] of Object.entries(expected)) {
    host.setLocale(locale);
    assert.equal(section.options.label(), label);
    assert.deepEqual(Object.keys(values[locale]).sort(), baseline);
    assert.notEqual(values[locale]['status.unsupported'], values.en['status.unsupported']);
  }
  host.dispose(); assert.equal(host.registeredLocales.size, 0);
});

test('question capability enters and leaves independently of chrome without extra slots', () => {
  const host = harness();
  const before = host.slotEntries.slice();
  const support = host.slotEntries[0].options.inject().hooks;
  assert.equal(support.questionSupport.getSnapshot().supported, false);
  host.enterQuestions();
  assert.equal(support.questionSupport.getSnapshot().supported, true);
  assert.equal(support.chromeSupport.getSnapshot().supported, false);
  host.update({ ...DEFAULT_CONFIG, questionLayout: 'individual' });
  assert.equal(host.questionMode, 'individual');
  assert.equal(host.slotEntries.length, 1); assert.equal(host.slotEntries[0], before[0]);
  host.leaveQuestions();
  assert.equal(host.questionMode, 'aggregate'); assert.equal(host.configListeners.size, 0);
  assert.equal(support.questionSupport.getSnapshot().supported, false);
  host.enterQuestions(); assert.equal(host.questionMode, 'individual');
  host.dispose(); assert.equal(host.questionEntries.size, 0); assert.equal(host.configListeners.size, 0);
});

test('question mode changes with configuration and disabled/unloaded plugin restores native aggregate', () => {
  const host = harness({ chrome: true, questions: true });
  assert.equal(host.questionMode, 'aggregate'); assert.equal(host.questionRegistrations, 1);
  const nativeHeader = host.slotEntries[1];
  host.update({ ...DEFAULT_CONFIG, showTags: false });
  assert.equal(host.questionRegistrations, 1);
  host.update({ ...DEFAULT_CONFIG, questionLayout: 'individual' });
  assert.equal(host.questionMode, 'individual'); assert.equal(host.questionRegistrations, 2);
  host.update({ ...DEFAULT_CONFIG, questionLayout: 'individual', enabled: false });
  assert.equal(host.questionEntries.size, 0); assert.equal(host.questionMode, 'aggregate');
  host.update({ ...DEFAULT_CONFIG, questionLayout: 'individual' });
  assert.equal(host.questionMode, 'individual'); assert.equal(host.slotEntries[1], nativeHeader);
  host.dispose(); assert.equal(host.questionMode, 'aggregate'); assert.equal(host.questionEntries.size, 0);
});

test('unready or invalid settings release a question preference without claiming capability removal', () => {
  const host = harness({ questions: true });
  const support = host.slotEntries[0].options.inject().hooks.questionSupport;
  host.update({ ...DEFAULT_CONFIG, questionLayout: 'individual' });
  assert.equal(host.questionMode, 'individual');
  host.setSnapshot({ status: 'loading', writable: false });
  assert.equal(host.questionMode, 'aggregate'); assert.equal(host.questionEntries.size, 0);
  assert.equal(support.getSnapshot().supported, true);
  host.setSnapshot({ status: 'ready', writable: true, value: { ...DEFAULT_CONFIG, questionLayout: 'unboxed' } });
  assert.equal(host.questionEntries.size, 0); assert.equal(support.getSnapshot().supported, true);
  assert.equal(support.getSnapshot().error, 'invalid-config-or-registration');
  host.update({ ...DEFAULT_CONFIG, questionLayout: 'individual' });
  assert.equal(host.questionMode, 'individual'); assert.equal(support.getSnapshot().error, null);
  host.dispose();
});

test('unknown question capability versions cannot register presentation preferences', () => {
  const host = harness({ questions: true, questionVersion: 2 });
  const support = host.slotEntries[0].options.inject().hooks.questionSupport.getSnapshot();
  assert.equal(support.supported, false); assert.equal(support.error, 'unsupported-version');
  assert.equal(host.questionEntries.size, 0); host.dispose();
});

test('client artifact has no transcript DOM discovery or private renderer dependencies', () => {
  assert.doesNotMatch(artifact, /MutationObserver|querySelector|entriesOfSlot|conversation\.chat\.node["']/);
  assert.doesNotMatch(artifact, /require\(["']@deepseek-ai\//);
});
