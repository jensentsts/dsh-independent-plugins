# Native message chrome v1 consumer

This package is an independent consumer of the reviewed DSH 0.2.2-rc.1 message-chrome patch, not an alternative Chat renderer. The upstream baseline is release commit `66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`. Unpatched DSH remains supported only in the explicit unsupported/native-only mode: settings report the missing capability, and no transcript renderer is replaced.

## Required native capability

The apply-world service `ctx.uiChatChrome` has `contractVersion: 1` and `registerAppearance({ id, priority?, select(owner) }): disposer`. The selector is pure, closes over one validated configuration snapshot, and returns `{variant:'bubble'|'transparent'|'native',align?:'start'|'end',className?,variables?:Record<`--${string}`,string|number>}` or null to delegate. A configuration change disposes and re-registers the appearance contribution. The plugin lifetime owns all registrations.

The native body stays at its existing outlet, with its existing React key, reference, anchors, fold ownership and callbacks. This package never receives `children`, native component values, SlotCore entries or rendering continuations.

Two native single/session slots are consumed: `conversation.chat.message.header` and `conversation.chat.message.avatar`. Their props are `{ owner }` plus the normal framework scope/locale/inject shares. The official `conversation.chat.message.chrome` Factory owns the slots. Bodies are never dispatched from this plugin.

```ts
interface Owner {
  contractVersion: 1
  instanceKey: string
  kind: string
  part?: 'message' | 'reasoning' | 'tool' | 'pending' | 'container' | 'control'
  groupPart?: string
  nodeKey?: string
  turn?: number
  step?: number
  messageId?: string
  callId?: string
  toolName?: string
  phase?: 'preparing' | 'start' | 'result'
  source?: unknown
  pending?: boolean
  echo?: boolean
  blockIndex?: number
  gutter: { available: false; width: 0 }
}
```

Controls and containers resolve transparent in the native service regardless of the plugin selector. Reasoning and atomic Tool positions have their own identity positions; their parent containers must not create a second bubble. `turn-tail` keeps accounting and actions in their original native positions. Hidden system/context rows are not made visible.

## Historical model attribution

The Host registers one `sessionProjections` unit named `bubbleConversation`, stateVersion 1, with a Zod state schema and `wire.viewSchema`/`wire.view`. The browser reads it using `useProjection('bubbleConversation', selector)`, never by folding Session events or current model preferences.

```ts
interface ModelFact {
  provider: string
  model: string
  effort?: string
  effortOrigin: 'explicit' | 'adapter-default' | 'unrecorded' | 'route-mismatch'
  headerSeq?: number
  messageId?: string
  seq?: number
  turn: number
  step: number
}
interface View {
  version: 1
  byMessageId: Record<string, ModelFact>
  byStep: Record<`${number}:${number}`, ModelFact>
  byCallId: Record<string, {toolName:string; turn:number; step:number}>
}
```

`request/header.data.header.config` is inherited by later attempts until replaced. `assistant/message.data.message.source` owns the actual provider/model. A mismatching actual route does not inherit the old effort. A recorded explicit or adapter-default effort renders `model:effort`; absent or mismatching effort renders the model without a colon. The tooltip distinguishes a recorded adapter default from explicit selection. Replaced model-only surface copies are not treated as new transcript messages. No Session event is added and no billing state is modified.

`byStep` stores canonical request facts. Normal finalized messages matching that fact do not duplicate it or publish a new view; `byMessageId` contains only actual-message overrides that differ from the step fact. Header changes with the same route/effort retain the view reference. The three indexes are simple immutable JSON records. Each new indexed step/call copies its record, and the native wire sends and validates the whole view: necessary state is linear in the number of indexed steps/calls and total replay/live-wire cost is not constant. A different indexed query transport is deferred rather than simulated with a private cache.

## Settings and media

The bundle entry id and ConfigForm namespace are `dsh-bubble-conversation`; it owns settings.section id `dsh-bubble-conversation`, order 45. Shared ConfigForm data arrives through the framework inject `hooks` compartment, not component-created subscriptions. All edits use the Host settings queue and revision fencing.

Known model families use eight packaged AI-generated adult whale-girl WebP portraits embedded as local data URLs. Each is 256×256 and under 18 KiB; unknown families and generic/user roles keep the package-authored geometric SVG fallback. The requested-provider-GPT original source, actual prompts, processing versions, hashes and rights limitations are recorded in `artwork/GENERATION.md` and `artwork/avatar-manifest.json`. These images are not official vendor identities, licensed third-party stock or a claimed human illustrator's work.

User-selected raster data URLs are limited to 256 KiB each. A file input owned by this package accepts PNG/JPEG/WebP/GIF and validates magic bytes; remote image URLs, arbitrary filesystem paths and user SVG are rejected.

The optional `ctx.uiChatChrome.avatarPlacementVersion === 1` enables appearance requests `avatarPlacement:'auto'|'header'`. This package supplies the configured request only when that capability exists. Native `ChatViewport` owns real scroll/list/column clearance and its style-query flags; auto uses an unclipped 40px outer margin for the 28px avatar, while narrow views, reasoning/tool rows, unsupported style queries, and explicit header requests retain the header. The legacy identity-v1 `owner.gutter` still carries no geometry and is not permission for contribution-owned positioning CSS. Missing native placement capability is reported independently in settings. Avatars never form a flex column beside the body.

## Optional native question presentation v1

The independent optional service `ctx.uiQuestionPresentation` must have `contractVersion: 1` and `registerPresentation({id,priority?,mode:'aggregate'|'individual'}): disposer`. The provider owns a stable `presentation` observable with `{mode}` and defaults to `aggregate`. This package receives neither question bodies nor answer/approval callbacks. It never passes a boxed=false option or mounts an alternative question renderer.

A separate `questionSupport` observable reports this capability independently from message-chrome support. Only an enabled plugin with ready validated settings registers `questionLayout`; a mode change disposes/re-registers that mode-only contribution. Unrelated member/name changes retain it. Configuration disable, capability removal and plugin unload release it, leaving the provider's default or another contributor's preference. Missing or mismatched v1 capability is explicitly unsupported in the question settings area; native aggregated questions remain unchanged. All native draft, approval, pager, skip-batch and historical-copy behavior stays with the provider.

`question-reply` outer appearance is transparent to avoid a second border around native question boxes. When chrome v1 is available, the existing header/avatar slots may still supply identity above that unchanged native body.
