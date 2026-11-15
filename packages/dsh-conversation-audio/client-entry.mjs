import React from 'react'
import { AUDIO_PROTOCOL, audioDescriptor, audioType, resourceAddress } from './audio.mjs'
import en from './locale/en.json' with { type: 'json' }
import zh from './locale/zh.json' with { type: 'json' }
const h = React.createElement
const NS = 'independent.conversationAudio'
/** @type {Record<'en' | 'zh', import('./types.d.ts').AudioDictionary>} */
const dictionaries = { en: en.ui, zh: zh.ui }
const css = `.dsh-conversation-audio{display:flex;flex-direction:column;gap:6px;max-width:100%;margin:0;color:var(--dsw-alias-label-primary)}.dsh-conversation-audio audio{display:block;width:360px;max-width:100%;height:40px}.dsh-conversation-audio small{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}.dsh-conversation-audio [role=alert]{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px}`
const SLOTS = ['conversation.chat.user.file-media', 'conversation.chat.message.file-media', 'tool.call.file-media']
function Player({ audio, t }) {
  const [failed, setFailed] = React.useState(false)
  return h('div', { className: 'dsh-conversation-audio' }, h('style', null, css),
    h('audio', { controls: true, preload: 'none', src: audio.src, 'aria-label': t('player', { name: audio.name }), onError: () => setFailed(true) }),
    failed && h('p', { role: 'alert' }, t('playbackFailed')))
}
function FileAudio({ file, useResource, t }) {
  const media = audioType(file.name)
  const state = useResource(media ? resourceAddress(file) : '')
  if (!media) return null
  if (state.status === 'loading') return h('small', null, t('loading'))
  if (state.status === 'failed') return h('small', { role: 'alert' }, t('unavailable'))
  if (!state.value) return null
  return h(Player, { key: `${file.attachmentId}:${file.name}:${file.bytes}`, audio: state.value, t })
}
export const inject = ['slots', 'locale', 'resources']
export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'conversation-audio: locale')
  ctx.effect(() => ctx.resources.register({
    protocol: AUDIO_PROTOCOL,
    async *open(address, { signal }) {
      if (signal.aborted) return
      let file
      try { file = JSON.parse(decodeURIComponent(new URL(address).pathname.slice(1))) }
      catch (error) { yield { ok: false, error: { code: 'INVALID_AUDIO_RESOURCE', message: 'Invalid audio resource address.' } }; return }
      yield { ok: true, value: audioDescriptor(file) }
    },
  }), 'conversation-audio: file resources')
  // Each native position renders the durable file card; this contribution only
  // appends the player after that card and leaves the original attachment intact.
  for (const name of SLOTS) {
    ctx.slots.inject(name, () => ctx.slots.register({ name, locale: NS }, FileAudio))
  }
}
