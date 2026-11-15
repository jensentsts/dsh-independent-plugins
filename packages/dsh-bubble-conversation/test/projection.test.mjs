import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProjection, applyProjection, modelFactFor, modelLabel } from '../src/projection.js';
const event = (type, seq, data, extra = {}) => ({ type, seq, time: seq * 10, data, ...extra });
const header = (seq, model, effort, defaults = false) => event('request/header', seq, { header: { config: { provider: 'api', model, ...(effort ? { reasoningEffort: effort } : {}) }, ...(defaults ? { adapterDefaults: { reasoningEffort: true } } : {}) } });
const message = (seq, turn, step, id, model) => event('assistant/message', seq, { turn, step, message: { id, source: { kind: 'model', provider: 'api', model }, content: [] } }, { surfaceOp: 'append' });
const fold = entries => entries.reduce(applyProjection, initialProjection());

test('historical messages retain their own model and effort after model switches', () => {
  const state = fold([header(0, 'gpt-a', 'high'), event('step/start', 1, { turn: 1, step: 1 }), message(2, 1, 1, 'm1', 'gpt-a'),
    event('step/end', 3, { turn: 1, step: 1 }), header(4, 'claude-b', 'medium'), event('step/start', 5, { turn: 2, step: 1 }), message(6, 2, 1, 'm2', 'claude-b')]);
  assert.equal(modelLabel(modelFactFor(state.view, { messageId: 'm1', turn: 1, step: 1 })), 'gpt-a:high');
  assert.equal(modelLabel(modelFactFor(state.view, { messageId: 'm2', turn: 2, step: 1 })), 'claude-b:medium');
});
test('request header after step/start updates the active attempt', () => {
  const state = fold([event('step/start', 0, { turn: 1, step: 1 }), header(1, 'gpt-a', 'low')]);
  assert.equal(modelLabel(modelFactFor(state.view, { turn: 1, step: 1 })), 'gpt-a:low');
});
test('recorded adapter-default effort is shown while unrecorded effort has no suffix', () => {
  const defaults = fold([header(0, 'gpt-a', 'high', true), message(1, 1, 1, 'm', 'gpt-a')]);
  assert.equal(modelLabel(defaults.view.byStep['1:1']), 'gpt-a:high');
  assert.equal(defaults.view.byStep['1:1'].effortOrigin, 'adapter-default');
  const unknown = fold([message(0, 1, 1, 'u', 'gpt-b')]);
  assert.equal(modelLabel(unknown.view.byStep['1:1']), 'gpt-b');
  assert.equal(unknown.view.byStep['1:1'].effortOrigin, 'unrecorded');
});
test('actual source route overrides a stale request route without borrowing its effort', () => {
  const state = fold([header(0, 'gpt-a', 'high'), event('step/start', 1, { turn: 1, step: 1 }), message(2, 1, 1, 'm', 'gpt-b')]);
  assert.deepEqual(state.view.byMessageId.m, { provider: 'api', model: 'gpt-b', turn: 1, step: 1, effortOrigin: 'route-mismatch', messageId: 'm', seq: 2 });
});
test('replacement copies do not erase visible transcript attribution', () => {
  const state = fold([header(0, 'gpt-a', 'high'), message(1, 1, 1, 'm', 'gpt-a')]);
  const replacement = { ...message(2, 1, 1, 'm', 'gpt-b'), surfaceOp: 'replace' };
  assert.equal(applyProjection(state, replacement), state);
});
test('ignored events retain state and view references; header-only changes retain view', () => {
  const state = initialProjection();
  assert.equal(applyProjection(state, event('tool/result', 0, {})), state);
  assert.equal(applyProjection(state, header(1, 'gpt-a', 'low')).view, state.view);
});
test('tool and PTC call ids correlate to the correct step without names-as-identity', () => {
  const state = fold([header(0, 'gpt-a', 'high'), event('step/start', 1, { turn: 1, step: 2 }),
    event('tool/call', 2, { callId: 'root', name: 'parallel', turn: 1, step: 2 }),
    event('tool/ptc-dispatch-start', 3, { rootCallId: 'root', subCallId: 'nested', name: 'read' })]);
  assert.equal(modelFactFor(state.view, { callId: 'nested' }).model, 'gpt-a');
  assert.equal(state.view.byCallId.nested.toolName, 'read');
});
test('hostile dictionary keys stay own properties without prototype mutation', () => {
  const state = fold([header(0, 'gpt-a', 'high'), event('step/start', 1, { turn: 1, step: 1 }), message(2, 1, 1, '__proto__', 'gpt-b')]);
  assert.equal(modelFactFor(state.view, { messageId: '__proto__' }).model, 'gpt-b');
  assert.equal(modelFactFor(state.view, { messageId: 'constructor' }), undefined);
});
test('state checkpoints round-trip as plain JSON', () => {
  const state = fold([header(0, 'gpt-a', 'high'), event('step/start', 1, { turn: 1, step: 1 }), message(2, 1, 1, 'm', 'gpt-a')]);
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
});
