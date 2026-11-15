import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettingsSource } from '../src/settings-source.js';

function observed(value) {
  const listeners = new Set();
  return { getSnapshot: () => value, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    replace(next) { value = next; for (const listener of listeners) listener(); }, count: () => listeners.size };
}
test('bubble settings decode their served namespace when runtime transform callbacks are absent from wire schemas', () => {
  const form = observed({ status: 'loading', value: undefined, writable: true, revision: 1 });
  const description = observed({ view: { writable: true, namespaces: [
    { ns: 'other', value: { private: 'unrelated' }, revision: 5 },
    { ns: 'bubble', value: { enabled: true, members: [] }, revision: 1 },
  ] } });
  const source = createSettingsSource(form, description, 'bubble');
  const first = source.getSnapshot();
  assert.equal(first.status, 'ready');
  assert.equal(first.value.enabled, true);
  assert.equal(first.writable, true);
  assert.equal(JSON.stringify(first).includes('unrelated'), false);
  assert.equal(source.getSnapshot(), first);
  let calls = 0;
  const off = source.subscribe(() => { calls++; });
  description.replace({ view: { writable: true, namespaces: [{ ns: 'bubble', value: { enabled: false, members: [] }, revision: 2 }] } });
  assert.equal(calls, 1);
  assert.equal(source.getSnapshot().value.enabled, false);
  assert.equal(source.getSnapshot().revision, 2);
  off();
  assert.equal(form.count(), 0);
  assert.equal(description.count(), 0);
});
test('invalid or absent bubble settings remain unavailable and native ready forms retain their stable snapshot', () => {
  const form = observed({ status: 'loading', value: undefined, writable: false });
  const description = observed({ view: { writable: true, namespaces: [{ ns: 'bubble', value: { enabled: 'invalid' } }] } });
  const source = createSettingsSource(form, description, 'bubble');
  assert.equal(source.getSnapshot().status, 'unavailable');
  assert.equal(source.getSnapshot().writable, false);
  description.replace({ view: { writable: true, namespaces: [] } });
  assert.equal(source.getSnapshot(), form.getSnapshot());
  form.replace({ status: 'ready', value: { enabled: true }, writable: true });
  assert.equal(source.getSnapshot(), form.getSnapshot());
});
