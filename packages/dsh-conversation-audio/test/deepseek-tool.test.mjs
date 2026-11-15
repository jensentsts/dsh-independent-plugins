import assert from 'node:assert/strict'
import test from 'node:test'
import { apply } from '../index.mjs'
import { deepSeekSpeechTool } from '../deepseek-tool.mjs'

class FakeSocket {
  constructor() { this.listeners = new Map(); queueMicrotask(() => this.emit('open')) }
  addEventListener(name, fn) { this.listeners.set(name, fn) }
  emit(name, event = {}) { this.listeners.get(name)?.(event) }
  send(data) { if (JSON.parse(data).event === 'finish_text') queueMicrotask(() => {
    this.emit('message', { data: Uint8Array.of(1, 2, 3, 4).buffer })
    this.emit('message', { data: JSON.stringify({ event: 'finish', code: 'success' }) })
  }) }
  close() {}
}

test('explicit DeepSeek speech produces a native playable attachment via the existing credential', async () => {
  let lookups = 0, requests = 0, saved
  const tool = deepSeekSpeechTool({
    credentials: { async resolve(ref) { lookups++; assert.equal(ref, 'DEEPSEEK_API_KEY'); return { value: 'fixture-key' } } },
    attachments: { async saveFile({ data, name }) { saved = Buffer.from(data); return { attachmentId: 'sha256:' + 'a'.repeat(64), name, bytes: data.length } } },
    webSocketFactory: () => { requests++; return new FakeSocket() },
  })
  assert.equal(requests, 0); assert.equal(lookups, 0)
  const result = await tool.execute({ text: '你好，大肥鱼', voice: 'stella' }, { signal: new AbortController().signal })
  assert.equal(result.ok, true); assert.equal(lookups, 1); assert.equal(requests, 1)
  assert.equal(saved.toString('ascii', 0, 4), 'RIFF'); assert.match(result.attachment.name, /\.wav$/)
  assert.deepEqual(tool.output.render({}, result).map(block => block.type), ['text', 'file'])
})

test('missing credentials or cancelled input does not open a network request', async () => {
  let requests = 0
  const tool = deepSeekSpeechTool({ credentials: { resolve: async () => undefined }, attachments: {}, webSocketFactory: () => { requests++ } })
  const missing = await tool.execute({ text: 'hello' }, { signal: new AbortController().signal })
  assert.deepEqual(missing, { ok: false, code: 'DEEPSEEK_TTS_MISSING_CREDENTIAL' })
  const abort = new AbortController(); abort.abort()
  assert.deepEqual(await tool.execute({ text: 'hello' }, { signal: abort.signal }), { ok: false, code: 'ABORTED' })
  assert.equal(requests, 0)
})

test('the existing audio plugin registers the tool lazily and starts no speech request', () => {
  let definition, disposed = 0
  const child = { credentials: { resolve() { throw new Error('must not resolve at startup') } }, attachments: {},
    tools: { register(tool) { definition = tool; return () => { disposed++ } } },
    effect(callback) { this.dispose = callback() } }
  const ctx = { attachments: {}, connection: { fetch: { register: () => () => {} } }, effect(callback) { this.dispose = callback() },
    inject(services, callback) { assert.deepEqual(services, ['tools', 'credentials']); callback(child) } }
  apply(ctx)
  assert.equal(definition.name, 'deepseek_tts')
  child.dispose(); ctx.dispose(); assert.equal(disposed, 1)
})
