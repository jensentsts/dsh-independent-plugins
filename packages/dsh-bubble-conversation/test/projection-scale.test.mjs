import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { initialProjection, applyProjection } from '../src/projection.js';
const header = (seq, model) => ({ type: 'request/header', seq, data: { header: { config: { provider: 'api', model, reasoningEffort: 'high' } } } });

test('same step attribution avoids redundant message and header publications', () => {
  let state = applyProjection(initialProjection(), header(0, 'gpt-a'));
  state = applyProjection(state, { type: 'step/start', seq: 1, data: { turn: 1, step: 1 } });
  const before = state;
  const message = { type: 'assistant/message', surfaceOp: 'append', seq: 2, data: { turn: 1, step: 1, message: { id: 'm', source: { kind: 'model', provider: 'api', model: 'gpt-a' } } } };
  assert.equal(applyProjection(state, message), before);
  assert.equal(applyProjection(state, header(3, 'gpt-a')).view, state.view);
  assert.equal(Object.keys(state.view.byMessageId).length, 0);
});

test('flat canonical indexes report a bounded replay benchmark without claiming constant wire costs', t => {
  let state = initialProjection();
  let publications = 0;
  const started = performance.now();
  for (let step = 1; step <= 3000; step += 1) {
    for (const event of [header(step * 4, 'gpt-a'), { type: 'step/start', seq: step * 4 + 1, data: { turn: 1, step } },
      { type: 'assistant/message', surfaceOp: 'append', seq: step * 4 + 2, data: { turn: 1, step, message: { id: `m${step}`, source: { kind: 'model', provider: 'api', model: 'gpt-a' } } } },
      { type: 'step/end', seq: step * 4 + 3, data: { turn: 1, step } }]) {
      const next = applyProjection(state, event); if (next.view !== state.view) publications += 1; state = next;
    }
  }
  const ms = performance.now() - started;
  const bytes = Buffer.byteLength(JSON.stringify(state.view));
  assert.equal(Object.keys(state.view.byStep).length, 3000);
  assert.equal(Object.keys(state.view.byMessageId).length, 0);
  assert.equal(publications, 3000);
  t.diagnostic(`12000 durable events / 3000 steps: ${ms.toFixed(1)} ms; current whole wire view ${bytes} bytes; ${publications} publications. Flat copy and whole-view serialization remain linear per new step.`);
});
