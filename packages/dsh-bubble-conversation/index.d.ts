import type { Context } from '@deepseek-ai/cordis';
import type { SessionProjectionMap } from '@deepseek-ai/dsh-session-projection/types';

/** Record derived solely from a historical request header and actual model message source. */
export interface BubbleModelFact {
  readonly provider: string;
  readonly model: string;
  readonly effort?: string;
  readonly effortOrigin: 'explicit' | 'adapter-default' | 'unrecorded' | 'route-mismatch';
  readonly headerSeq?: number;
  readonly messageId?: string;
  readonly seq?: number;
  readonly turn: number;
  readonly step: number;
}
/** Wire projection delivered through the native per-session useProjection hook. */
export interface BubbleConversationView {
  readonly version: 1;
  readonly byMessageId: Readonly<Record<string, BubbleModelFact>>;
  readonly byStep: Readonly<Record<string, BubbleModelFact>>;
  readonly byCallId: Readonly<Record<string, { readonly toolName: string; readonly turn: number; readonly step: number }>>;
}
/** One exact matcher with an optional owned raster avatar and display name. */
export interface BubbleMember {
  id: string;
  matchType: 'role' | 'family' | 'model' | 'tool' | 'source';
  matchValue: string;
  name: string;
  avatar: string;
}
export interface BubbleConfig {
  enabled: boolean;
  showTags: boolean;
  showNames: boolean;
  showAvatars: boolean;
  avatarPlacement: 'header' | 'auto';
  questionLayout: 'aggregate' | 'individual';
  members: BubbleMember[];
}
declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap { bubbleConversation: BubbleConversationView }
}
export declare const name: 'dsh-bubble-conversation';
export declare const inject: readonly ['sessionProjections'];
export declare const Config: unknown;
export declare function apply(ctx: Context, config: BubbleConfig): Promise<void>;
