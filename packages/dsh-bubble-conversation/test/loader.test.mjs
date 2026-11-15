import test from 'node:test';
import assert from 'node:assert/strict';
const enabled = Boolean(process.env.DSH_SOURCE_ROOT);

test('official Loader boots the production Host, retains historical effort and disposes the projection', { skip: !enabled && 'Set DSH_SOURCE_ROOT and import the matching exact-source loader.' }, async () => {
  const [{ Context, FiberState }, { default: Loader }, { default: Include }, { default: Schema }, { createAssistantMessage }, production] = await Promise.all([
    import('@deepseek-ai/cordis'), import('@deepseek-ai/cordis-plugin-loader'), import('@deepseek-ai/cordis-plugin-include'),
    import('@deepseek-ai/schemastery'), import('@deepseek-ai/dsh-llm'), import('../index.js'),
  ]);
  const ctx = new Context();
  try {
    await ctx.plugin(Loader); ctx.loader.builtins.include = Include;
    await ctx.loader.create({ name: 'cordis:include', config: { path: new URL('./fixtures/cordis.yml', import.meta.url).href } });
    await ctx.loader.await();
    const entries = [...ctx.loader.entries()];
    for (const id of ['sessions', 'projections', 'bubble-conversation']) {
      const entry = entries.find(value => value.options.id === id);
      assert.ok(entry, `Loader entry ${id}`); assert.equal(entry.fiber?.state, FiberState.ACTIVE, `${id}: ${entry.error?.message ?? ''}`);
    }
    const entry = entries.find(value => value.options.id === 'bubble-conversation');
    assert.equal(entry.fiber.effectiveConfig.enabled.get(), true);
    assert.equal(entry.fiber.effectiveConfig.questionLayout.get(), 'aggregate');
    assert.deepEqual(entry.fiber.effectiveConfig.members.get(), []);
    const initialFiber = entry.fiber;
    const initialEnabled = entry.fiber.effectiveConfig.enabled;
    const initialLayout = entry.fiber.effectiveConfig.questionLayout;
    await entry.update({ config: { questionLayout: 'individual' } });
    assert.equal(entry.fiber, initialFiber);
    assert.equal(entry.fiber.effectiveConfig.enabled, initialEnabled);
    assert.equal(entry.fiber.effectiveConfig.questionLayout, initialLayout);
    assert.equal(initialLayout.get(), 'individual');
    assert.deepEqual(ctx.sessionProjections.summaryKeys().has('bubbleConversation'), false);
    const restoredSchema = new Schema(JSON.parse(JSON.stringify(production.Config)));
    const restoredConfig = restoredSchema({ questionLayout: 'individual', members: [{ id: 'whale', matchType: 'family', matchValue: 'deepseek', name: 'Whale' }] });
    assert.equal(restoredConfig.questionLayout.get(), 'individual');
    assert.equal(restoredConfig.members.get()[0].name, 'Whale');
    assert.throws(() => restoredSchema({ questionLayout: 'unboxed' }));
    assert.throws(() => restoredSchema({ members: [{ id: 'one', matchType: 'family', matchValue: 'not-a-family' }] }));

    const session = ctx.sessions.create('bubble-real-loader');
    const before = session.seq;
    const startStep = (turn, model, effort, adapterDefault = false) => {
      session.append('turn/start', { turn });
      session.append('request/header', { reason: 'change', header: { config: { provider: 'fixture', model, ...(effort === undefined ? {} : { reasoningEffort: effort }) },
        ...(adapterDefault ? { adapterDefaults: { reasoningEffort: true } } : {}) } });
      session.append('step/start', { turn, step: 1 });
      session.append('assistant/message', { turn, step: 1, stream: [], message: createAssistantMessage({ content: [{ type: 'text', text: `native reply ${turn}` }], source: { provider: 'fixture', model } }) }, { surfaceOp: 'append' });
      session.append('step/end', { turn, step: 1 });
      session.append('turn/end', { turn, reason: { kind: 'completed' } });
    };
    startStep(1, 'gpt-a', 'high'); startStep(2, 'deepseek-v4', 'medium', true); startStep(3, 'kimi-k2');
    assert.equal(session.seq, before + 18, 'projection does not append hidden Session records');
    const snapshot = ctx.sessionProjections.snapshot(session);
    assert.equal(snapshot.values.bubbleConversation.byStep['1:1'].model, 'gpt-a');
    assert.equal(snapshot.values.bubbleConversation.byStep['1:1'].effort, 'high');
    assert.equal(snapshot.values.bubbleConversation.byStep['2:1'].effortOrigin, 'adapter-default');
    assert.equal(snapshot.values.bubbleConversation.byStep['3:1'].effort, undefined);
    assert.equal(session.deriveMessages().filter(message => message.role === 'assistant').length, 3);
    const checkpoint = ctx.sessionProjections.checkpoint(session);
    assert.deepEqual(ctx.sessionProjections.viewCheckpoint(JSON.parse(JSON.stringify(checkpoint))).bubbleConversation, snapshot.values.bubbleConversation);
    const history = session.snapshotEvents();
    const recovered = ctx.sessionProjections.restore({}, history, 0, session.header, session.inheritedEventCount);
    assert.deepEqual(recovered.snapshot.values.bubbleConversation, snapshot.values.bubbleConversation);

    await ctx.registry.delete(entry.fiber.runtime.callback);
    assert.equal(ctx.sessionProjections.snapshot(session).values.bubbleConversation, undefined);
    assert.equal(session.deriveMessages().filter(message => message.role === 'assistant').length, 3);
    assert.equal(session.seq, before + 18);
  } finally { await ctx.fiber.dispose(); }
});
