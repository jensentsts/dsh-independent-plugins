import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import ToolsService from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { executeToolFixture } from '@deepseek-ai/dsh-tool-testkit'
import * as audio from '../index.mjs'

test('the official DSH runtime registers and disposes the on-demand voice tool without a request', async () => {
  const ctx = new Context(), routes = new Set(); let lookups = 0
  try {
    await ctx.plugin(SystemPrompt, {}); await ctx.plugin(ToolsService)
    ctx.provide('connection', { fetch: { register(route) { routes.add(route.path); return () => routes.delete(route.path) } } })
    ctx.provide('attachments', {})
    ctx.provide('credentials', { async resolve() { lookups++; return undefined } })
    const fiber = ctx.plugin(audio); await fiber
    assert.equal(routes.size, 1); assert.ok(ctx.get('tools')); assert.ok(ctx.get('credentials'))
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.ok(ctx.tools.get('deepseek_tts')); assert.equal(lookups, 0)
    await fiber.dispose()
    assert.equal(ctx.tools.get('deepseek_tts'), undefined); assert.equal(routes.size, 0)
  } finally { await ctx.fiber.dispose() }
})

test('the real DSH tool pipeline emits a native file block for completed official speech', async () => {
  const ctx = new Context(), original = globalThis.WebSocket
  globalThis.WebSocket = class {
    constructor() { this.listeners = new Map(); queueMicrotask(() => this.listeners.get('open')?.({})) }
    addEventListener(name, fn) { this.listeners.set(name, fn) }
    send(data) { if (JSON.parse(data).event === 'finish_text') queueMicrotask(() => {
      this.listeners.get('message')?.({ data: Uint8Array.of(1, 2, 3, 4).buffer })
      this.listeners.get('message')?.({ data: JSON.stringify({ event: 'finish', code: 'success' }) })
    }) }
    close() {}
  }
  try {
    await ctx.plugin(SystemPrompt, {}); await ctx.plugin(ToolsService)
    ctx.provide('connection', { fetch: { register: () => () => {} } })
    ctx.provide('attachments', { saveFile: async ({ data, name }) => ({ attachmentId: 'sha256:' + 'b'.repeat(64), bytes: data.length, name }) })
    ctx.provide('credentials', { resolve: async () => ({ value: 'fixture-key' }) })
    const fiber = ctx.plugin(audio); await fiber; await new Promise(resolve => setTimeout(resolve, 0))
    const result = await executeToolFixture(ctx, { callId: 'speech-fixture', name: 'deepseek_tts', arguments: { text: '你好' }, signal: new AbortController().signal })
    assert.equal(result.isError, false); assert.equal(result.value.ok, true)
    assert.deepEqual(result.content.map(block => block.type), ['text', 'file'])
    assert.match(result.content[1].attachment.name, /\.wav$/)
    await fiber.dispose()
  } finally { globalThis.WebSocket = original; await ctx.fiber.dispose() }
})
