import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createProjectionDefinition, initialProjection, applyProjection } from '../src/projection.js';
const zodFile = process.env.DSH_BUBBLE_ZOD;

test('runtime projection state and wire values pass the deployed Zod API', { skip: !zodFile && 'Set DSH_BUBBLE_ZOD to an existing zod/index.js to run runtime schema validation.' }, async () => {
  const { z } = await import(pathToFileURL(zodFile).href);
  const definition = createProjectionDefinition(z);
  let state = initialProjection();
  for (const event of [
    { type: 'request/header', seq: 0, data: { header: { config: { provider: 'api', model: 'gpt-a', reasoningEffort: 'high' } } } },
    { type: 'step/start', seq: 1, data: { turn: 1, step: 1 } },
    { type: 'assistant/message', surfaceOp: 'append', seq: 2, data: { turn: 1, step: 1, message: { id: 'a', source: { kind: 'model', provider: 'api', model: 'gpt-a' } } } },
  ]) state = applyProjection(state, event);
  assert.deepEqual(definition.stateSchema.parse(JSON.parse(JSON.stringify(state))), state);
  assert.deepEqual(definition.wire.viewSchema.parse(definition.wire.view(state)), state.view);
  assert.equal(definition.key, 'bubbleConversation'); assert.equal(definition.stateVersion, 1); assert.equal(definition.wire.summary, false);
});
