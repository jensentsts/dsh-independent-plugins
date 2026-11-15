import { randomUUID } from 'node:crypto'
import { createDeepSeekSpeech } from './official-voice.mjs'

/** Explicit on-demand synthesis; returning a durable file makes native audio controls available. */
export function deepSeekSpeechTool({ credentials, attachments, webSocketFactory }) {
  const speak = createDeepSeekSpeech({
    resolveApiKey: async () => (await credentials.resolve('DEEPSEEK_API_KEY'))?.value,
    ...(webSocketFactory ? { webSocketFactory } : {}),
  })
  return {
    name: 'deepseek_tts',
    description: '用户要求语音朗读或生成语音时调用 DeepSeek 官方 TTS，生成可在 DSH 播放的音频附件。此服务按字符计费；stella 为女声，tide 为男声。',
    parameters: { type: 'object', properties: {
      text: { type: 'string', minLength: 1, maxLength: 3000, description: '需要朗读的文本。' },
      voice: { type: 'string', enum: ['stella', 'tide'], description: '官方音色；默认 stella。' },
    }, required: ['text'], additionalProperties: false },
    timeoutMs: 130000,
    output: {
      schema: { type: 'object', properties: {
        ok: { type: 'boolean' }, code: { type: 'string' }, voice: { type: 'string' },
        attachment: { type: 'object', properties: { attachmentId: { type: 'string' }, bytes: { type: 'integer' }, name: { type: 'string' } }, required: ['attachmentId', 'bytes', 'name'], additionalProperties: false },
      }, required: ['ok', 'code'], additionalProperties: false },
      render: (_args, value) => value.ok && value.attachment
        ? [{ type: 'text', text: `已生成 DeepSeek 官方语音（${value.voice}）。` }, { type: 'file', attachment: value.attachment }]
        : [{ type: 'text', text: `DeepSeek 语音生成失败：${value.code}` }],
    },
    async execute(args, exec) {
      if (!args || typeof args.text !== 'string' || !args.text.trim() || args.text.length > 3000 || args.voice !== undefined && !['stella', 'tide'].includes(args.voice)) return { ok: false, code: 'INVALID_INPUT' }
      if (exec?.signal?.aborted) return { ok: false, code: 'ABORTED' }
      const voice = args.voice ?? 'stella'
      try {
        const audio = await speak(args.text, { enabled: true, maxChars: 3000, deepseekVoice: voice }, { signal: exec?.signal })
        if (!audio) return { ok: false, code: 'DEEPSEEK_TTS_EMPTY' }
        exec?.signal?.throwIfAborted()
        const attachment = await attachments.saveFile({ data: audio, name: `deepseek-voice-${randomUUID()}.wav` })
        exec?.signal?.throwIfAborted()
        return { ok: true, code: 'DEEPSEEK_TTS_READY', voice, attachment }
      } catch (error) {
        return { ok: false, code: exec?.signal?.aborted ? 'ABORTED' : String(error?.code ?? 'DEEPSEEK_TTS_FAILED').slice(0, 80) }
      }
    },
  }
}
