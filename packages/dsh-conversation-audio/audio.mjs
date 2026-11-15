/** Browser audio descriptors for durable Session file references. */
export const AUDIO_PATH = '/api/conversation-audio'
export const AUDIO_PROTOCOL = 'conversation-audio'
const audioTypes = {
  mp3: 'audio/mpeg', mp2: 'audio/mpeg', wav: 'audio/wav', wave: 'audio/wav',
  ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg',
  m4a: 'audio/mp4', m4b: 'audio/mp4', aac: 'audio/aac',
  flac: 'audio/flac', webm: 'audio/webm', amr: 'audio/amr', aiff: 'audio/aiff', aif: 'audio/aiff',
}
/** Use the persisted display-name extension; codecs remain the browser's responsibility. */
export function audioType(name) { return audioTypes[name.slice(name.lastIndexOf('.') + 1).toLowerCase()] }
export function audioDescriptor(file) {
  const mediaType = audioType(file.name)
  if (!mediaType) return null
  const params = new URLSearchParams({ attachmentId: file.attachmentId, bytes: String(file.bytes), name: file.name })
  return { name: file.name, bytes: file.bytes, mediaType, src: `${AUDIO_PATH}?${params}` }
}
export function resourceAddress(file) { return `dsh-resource://${AUDIO_PROTOCOL}/${encodeURIComponent(JSON.stringify({ attachmentId: file.attachmentId, bytes: file.bytes, name: file.name }))}` }
