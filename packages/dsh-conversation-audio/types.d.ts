import type { Context } from '@deepseek-ai/cordis'

/** Locale keys owned by the audio control. */
export interface AudioDictionary {
  player: string
  loading: string
  unavailable: string
  playbackFailed: string
}
/** One browser media source; it addresses the authenticated attachment route, never a host path. */
export interface ConversationAudio {
  name: string
  bytes: number
  mediaType: string
  src: string
}
export declare const name: 'conversation-audio'
export declare const inject: readonly ['connection', 'attachments']
/** Register the authenticated audio attachment route for this plugin's lifetime. */
export declare function apply(ctx: Context): void

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface ResourceProtocolMap {
    'conversation-audio': ConversationAudio | null
  }
}
