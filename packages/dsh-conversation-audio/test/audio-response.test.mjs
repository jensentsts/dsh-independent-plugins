import assert from 'node:assert/strict'
import test from 'node:test'
import { apply } from '../index.mjs'

const reference = { attachmentId: `sha256:${'a'.repeat(64)}`, name: 'voice.mp3', bytes: 10 }
function playerRoute({ failure, digestFailure } = {}) {
  let fetch, cleanup
  const state = { opened: 0, verified: false, closed: false }
  const ctx = {
    effect(callback) { cleanup = callback() },
    connection: { fetch: { register(route) { fetch = route.fetch; return () => {} } } },
    attachments: { async *readFileStream(ref, signal) {
      assert.deepEqual(ref, reference)
      state.opened++
      try {
        signal.throwIfAborted()
        if (failure) throw Object.assign(new Error(failure), { code: failure })
        const bytes = new TextEncoder().encode('0123456789')
        for (let offset = 0; offset < bytes.length; offset += 3) {
          signal.throwIfAborted()
          yield bytes.subarray(offset, offset + 3)
        }
        if (digestFailure) throw new Error('Attachment digest mismatch')
        state.verified = true
      } finally { state.closed = true }
    } },
  }
  apply(ctx)
  const request = range => fetch(new Request(`https://dsh.invalid/api/conversation-audio?${new URLSearchParams(reference)}`, {
    ...(range ? { headers: { range } } : {}),
  }))
  return { request, state, cleanup: () => cleanup() }
}

test('audio playback streams full verified content and surfaces a final integrity failure', async () => {
  const route = playerRoute()
  const response = await route.request()
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-length'), '10')
  assert.equal(await response.text(), '0123456789')
  assert.equal(route.state.verified, true)
  await route.cleanup()
  const corrupt = playerRoute({ digestFailure: true })
  await assert.rejects((await corrupt.request()).text(), /digest mismatch/)
  await corrupt.cleanup()
})

test('audio seeking returns exact inclusive, open-ended and suffix ranges', async () => {
  for (const [range, text, contentRange] of [
    ['bytes=2-6', '23456', 'bytes 2-6/10'],
    ['bytes=7-', '789', 'bytes 7-9/10'],
    ['bytes=-4', '6789', 'bytes 6-9/10'],
    ['bytes=8-99', '89', 'bytes 8-9/10'],
    ['bytes=0-9', '0123456789', 'bytes 0-9/10'],
  ]) {
    const route = playerRoute()
    const response = await route.request(range)
    assert.equal(response.status, 206)
    assert.equal(response.headers.get('content-range'), contentRange)
    assert.equal(response.headers.get('content-length'), String(text.length))
    assert.equal(await response.text(), text)
    assert.equal(route.state.closed, true)
    if (range === 'bytes=0-9') assert.equal(route.state.verified, true)
    await route.cleanup()
  }
})

test('out-of-range requests report 416 and malformed or multiple ranges use a full response', async () => {
  const route = playerRoute()
  const response = await route.request('bytes=10-')
  assert.equal(response.status, 416)
  assert.equal(response.headers.get('content-range'), 'bytes */10')
  assert.equal(route.state.opened, 0)
  for (const range of ['bytes=0-1,4-5', 'invalid', 'bytes=-']) {
    const fallback = await route.request(range)
    assert.equal(fallback.status, 200)
    assert.equal(await fallback.text(), '0123456789')
  }
  await route.cleanup()
})

test('missing and unsupported durable audio references retain provider failures', async () => {
  for (const [failure, status] of [['ATTACHMENT_NOT_FOUND', 404], ['INVALID_ATTACHMENT_REF', 400], ['ATTACHMENT_FILES_UNSUPPORTED', 501]]) {
    const route = playerRoute({ failure })
    const response = await route.request('bytes=1-3')
    assert.equal(response.status, status)
    assert.equal(route.state.closed, true)
    await route.cleanup()
  }
})

test('unloading the audio plugin closes an active playback reader', async () => {
  const route = playerRoute()
  const response = await route.request()
  const reader = response.body.getReader()
  await reader.read()
  await route.cleanup()
  await assert.rejects(async () => { while (!(await reader.read()).done) {} }, error => error.name === 'AbortError')
  assert.equal(route.state.closed, true)
})
