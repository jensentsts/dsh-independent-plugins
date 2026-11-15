import { AUDIO_PATH, audioType } from './audio.mjs'
import { deepSeekSpeechTool } from './deepseek-tool.mjs'

export const name = 'conversation-audio'
export const inject = ['connection', 'attachments']

function requestFile(request) {
  const params = new URL(request.url).searchParams
  const attachmentId = params.get('attachmentId'); const name = params.get('name'); const rawBytes = params.get('bytes')
  const bytes = rawBytes === null ? NaN : Number(rawBytes)
  if (!attachmentId || !/^sha256:[a-f0-9]{64}$/.test(attachmentId) || !name || !/^\d+$/.test(rawBytes ?? '') || !Number.isSafeInteger(bytes) || bytes < 0) return undefined
  return { attachmentId, bytes, name }
}
/**
 * Parse one single-range `Range` header against the durable byte length.
 * @param {string | null} header - request Range header.
 * @param {number} total - durable attachment byte length.
 * @returns {{ start: number, end: number } | 'unsatisfiable' | null} the inclusive range, an unsatisfiable marker, or null to serve the full file.
 */
function parseRange(header, total) {
  if (header === null) return null
  const match = /^bytes=(\d*)-(\d*)$/u.exec(header.trim())
  if (match === null) return null
  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') return null
  if (rawStart === '') {
    const suffix = Number(rawEnd)
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null
    if (total === 0) return 'unsatisfiable'
    return { start: Math.max(0, total - suffix), end: total - 1 }
  }
  const start = Number(rawStart)
  const end = rawEnd === '' ? total - 1 : Number(rawEnd)
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0) return null
  if (total === 0 || start >= total) return 'unsatisfiable'
  if (end < start) return null
  return { start, end: Math.min(end, total - 1) }
}
function readFailure(error) {
  const code = error?.code
  const status = code === 'ATTACHMENT_NOT_FOUND' ? 404 : code === 'INVALID_ATTACHMENT_REF' ? 400 : code === 'ATTACHMENT_FILES_UNSUPPORTED' ? 501 : 500
  return new Response('Audio attachment could not be read.', { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })
}
/**
 * Stream a durable file through the provider's verifying reader, emitting only
 * the requested inclusive bytes. A full response drains the iterator so the
 * provider's final digest check still runs; a partial response closes after
 * the last requested byte.
 * @param {{ attachmentId: string, bytes: number, name: string }} ref - durable content-addressed reference.
 * @param {AbortSignal} signal - request, plugin-lifetime, and local cancellation.
 * @param {AbortController} cancelled - local cancellation for consumer aborts.
 * @param {AsyncIterator<Uint8Array>} iterator - the provider reader already warmed up for failure mapping.
 * @param {{ start: number, end: number } | null} range - inclusive byte range or null.
 * @param {IteratorResult<Uint8Array>} first - warm-up item used to report read failures before responding.
 * @returns {ReadableStream<Uint8Array>} the bounded response body.
 */
function fileStream(ref, signal, cancelled, iterator, range, first) {
  const start = range === null ? 0 : range.start
  const end = range === null ? ref.bytes - 1 : range.end
  const full = range === null || (start === 0 && end === ref.bytes - 1)
  let offset = 0
  let pending = first
  return new ReadableStream({
    async pull(controller) {
      try {
        while (true) {
          signal.throwIfAborted()
          if (!full && offset > end) {
            await iterator.return?.()
            controller.close()
            return
          }
          const item = pending ?? await iterator.next(); pending = undefined
          if (item.done) {
            if (!full && offset <= end) {
              controller.error(new Error('Attachment ended before the requested range.'))
              return
            }
            controller.close()
            return
          }
          const chunk = item.value
          const chunkStart = offset
          offset += chunk.byteLength
          if (offset <= start) continue
          const from = Math.max(start - chunkStart, 0)
          const to = Math.min(end - chunkStart, chunk.byteLength - 1)
          if (to >= from) {
            controller.enqueue(chunk.subarray(from, to + 1))
            return
          }
        }
      } catch (error) { controller.error(error); await iterator.return?.() }
    },
    async cancel(reason) { cancelled.abort(reason); await iterator.return?.() },
  })
}
async function audioResponse(attachments, request, lifetime) {
  const ref = requestFile(request)
  if (!ref) return new Response('A durable file attachment reference is required.', { status: 400 })
  const mediaType = audioType(ref.name)
  if (!mediaType) return new Response('This file has no supported audio extension.', { status: 415 })
  const range = parseRange(request.headers.get('range'), ref.bytes)
  if (range === 'unsatisfiable') {
    return new Response(null, { status: 416, headers: {
      'content-range': `bytes */${ref.bytes}`,
      'accept-ranges': 'bytes',
      'cache-control': 'no-store',
    } })
  }
  const cancelled = new AbortController()
  const signal = AbortSignal.any([request.signal, lifetime, cancelled.signal])
  const iterator = attachments.readFileStream(ref, signal)[Symbol.asyncIterator]()
  let first
  try { first = await iterator.next() }
  catch (error) { return readFailure(error) }
  const contentLength = range === null ? ref.bytes : range.end - range.start + 1
  return new Response(fileStream(ref, signal, cancelled, iterator, range, first), {
    status: range === null ? 200 : 206,
    headers: {
      'content-type': mediaType,
      'content-length': String(contentLength),
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'accept-ranges': 'bytes',
      ...range === null ? {} : { 'content-range': `bytes ${range.start}-${range.end}/${ref.bytes}` },
    },
  })
}
/** Connection authenticates the owner before exact-route dispatch. */
export function apply(ctx) {
  ctx.effect(() => {
    const lifetime = new AbortController()
    const remove = ctx.connection.fetch.register({
      path: AUDIO_PATH, methods: ['GET'], requestBody: 'buffered',
      fetch: request => audioResponse(ctx.attachments, request, lifetime.signal),
    })
    return async () => { lifetime.abort(); await remove() }
  }, 'conversation-audio: authenticated attachment playback')
  if (typeof ctx.inject === 'function') ctx.inject(['tools', 'credentials'], toolCtx => {
    toolCtx.effect(() => toolCtx.tools.register(deepSeekSpeechTool({ credentials: toolCtx.credentials, attachments: toolCtx.attachments })), 'conversation-audio: DeepSeek speech tool')
  })
}
