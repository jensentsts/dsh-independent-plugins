# Bubble conversation / 气泡会话

An independent DSH plugin for role labels, member names and avatars over native message chrome. This package does not replace Chat nodes, copy native tool cards, parse transcript DOM, modify Session events or change billing. It has no dependency on the workspace-reference, selector, IO, remote or QQ packages.

## Current delivery status

Bundle 0.1.0 is active in the linked desktop installation with the matching message-chrome v1 foundation. The desktop shows the member settings, message bubbles and a native conversation preview with the recorded model, reasoning effort and portrait. A composition without the chrome capability keeps the native message view and shows the capability status in settings.

## Features

- Native body, fold, Details/Inspect, copy/branch, media and cost-meter locations remain owned by DSH.
- Per-message role tags and exact role/tool/source/model/family member matchers; independent member-list settings with owned avatar-file controls.
- Historical request attribution comes from the `bubbleConversation` Host projection, not current model preferences. Recorded explicit and adapter-default effort render `model:effort`; absent effort does not append a colon. Route mismatches do not borrow a different route's effort.
- Family defaults cover DeepSeek, GPT, Claude, Grok, GLM, Kimi, Gemini and Doubao with eight AI-generated original adult whale-girl portraits, not official brand marks. The 256×256 local WebP files are under 18 KiB each and embedded in the Client artifact; generic/user roles retain geometric SVG fallbacks. Actual source, prompts, tool versions, hashes and rights limitations are recorded in `artwork/GENERATION.md`.
- Language follows the global locale service. All UI labels, explanations, status messages, accessibility text and plugin-manager metadata are supplied explicitly in Chinese, English, Japanese, Spanish, French, German, Russian and Portuguese. Recorded model/tool names, user names and named placeholder values remain verbatim. No dictionary is populated by spreading English defaults.
- With native question-presentation v1, settings can select an aggregated native box or individual per-question native boxes. This mode-only contribution never receives question bodies or answer callbacks. Missing capability keeps the native aggregated presentation, and disabling/unloading this plugin releases its preference. No question or approval operation is rewritten.

## Configuration

The bundle row and Settings namespace are `dsh-bubble-conversation`. Its independent page is registered into native `settings.section`, order 45. It provides enable/name/tag/avatar toggles, header/auto placement and member rows. Exact matcher precedence is provider/model, tool, source kind, model family, then display role. Human display names never mutate durable source kinds.

The plugin decodes its own served section from the public ConfigForms describe mirror when a serialized Host transform lacks its runtime callback. Host validation remains in the Config schema; writes retain the native form queue and revision checks. Snapshots and subscriptions belong to the plugin lifetime.

External transport sources retain their own member identity in native user-message rows and use the incoming-message side. Exact source matching accepts the recorded source kind, transport or endpoint; names use the recorded display name or sender before the transport fallback. Ordinary human messages retain the user member and alignment. This behavior consumes public source fields without importing any later transport package.

A committed external reply with public `replySource` metadata uses the reply tag and the origin model's portrait. Its member name includes the actor and recorded model; local request effort is not attributed to the external model. The metadata stays separate from the original message text.

Avatar files must be PNG, JPEG, WebP or GIF, at most 256 KiB, and are stored as bounded data URLs in this plugin's settings. The owned file picker validates image magic bytes. Remote URLs, filesystem paths and user-uploaded SVG are not accepted. With `uiChatChrome.avatarPlacementVersion === 1`, `auto` requests native outer-margin placement. Each actual Chat or read-only preview owns its available-space decision: at least 40px of unclipped side space allows the native 28px avatar outside the body; narrow views keep it in the header. `header` always keeps the avatar inline, as do reasoning and atomic tool rows. Missing placement capability reports that limitation and retains header placement. The plugin publishes no layout CSS or fabricated gutter geometry, and body width is not reduced by an avatar column.

## Build and test

No installation is performed by these commands. Use an already available Node executable and esbuild package. A build environment explicitly supplies `DSH_BUBBLE_ESBUILD` with the absolute path to its existing esbuild `lib/main.js`; this is a build-tool dependency only, never an old DSH runtime import.

```powershell
$env:DSH_BUBBLE_ESBUILD = '<existing esbuild>/lib/main.js'
node scripts/build.mjs
node scripts/check.mjs
node --test test/*.test.mjs
```

Optional runtime Zod validation uses `DSH_BUBBLE_ZOD=<existing zod>/index.js`. When absent that one schema test reports skipped rather than fabricating verification. The Client artifact uses only the shared React baseline and its own code; Host schemas use the provided Schemastery and Zod identities. There are no install scripts.

A real Host composition fixture in `test/fixtures/cordis.yml` loads the production Host, official Session and session-projection plugins through Cordis Loader/Include. Its exact-release test checks ACTIVE entries, effective default Config, serialized schema validation, durable model/effort history, checkpoint recovery and projection removal on plugin unload without changing native messages. Run it with `DSH_SOURCE_ROOT` and the lead's exact-source-loader import; it is separate from a live installed profile.

The base-chrome teammate reported two separate native-composition results before the new raster-avatar build: the exact-release opt-in `bubble-integration.client.spec.tsx` passed (1/1; focused three-spec run 197/197), and the subsequent actual 65,457-byte artifact SHA-256 `08c9150b43d2c1e1528a4f45713e285114757b284704044dd190abc022243c61` passed through real Loader, ClientModuleSystem and production Slots with five native factories. The latter exercised Conversation → ChatFlow → QuestionReply DOM, individual/aggregate mode changes, transparent question identity chrome, disable/unload restoration, and retained native question/answer/skipped/copy identities. These were executed by the base-chrome owner, not this package's author. They are not authenticated browser or end-to-end billing verification, and the newer image-bearing artifact requires its own integration pass.

## Performance and storage

Canonical historical facts are retained once per step. Matching finalized messages do not duplicate facts or publish a new view; only actual source overrides require `byMessageId` entries. Same-route, same-effort request headers keep the view reference. Unrelated events retain the state reference. Checkpoint and suffix replay are plain JSON.

The three indexes intentionally remain simple flat records. Inserting a new step/call copies that index, and the official projection carrier validates and serializes the whole view. Storage is linear in indexed history; cumulative long-log replay and live whole-view traffic are not constant-time. The independent benchmark covers 12,000 durable events/3,000 steps and reports elapsed time, publication count and view bytes. It is not a product-scale latency guarantee. A paged indexed query protocol is deferred rather than hidden behind a Client full-log scan.

## Model Experience

No model-facing tools or prompt text are registered. The plugin reads existing durable request and message records and contributes only visual UI. It never appends a Session event or expands tool authority.

### KV Cache effect

None. Provider request messages, tools, system prompts and cached prefixes are unchanged.

## Known limitations and deferred work

- The desktop startup, member settings, GPT portrait, native preview and cost footer were observed after the foundation repair. The focused external-source role checks are offline; delivery from a configured peer and transport remains separate.
- The corresponding native and consumer Client builds include automatic outer-margin avatar placement. The separate conversation audio package supplies the native attachment players. All eight UI dictionaries are present; translated text wrapping and the remaining portraits have no final desktop review.
- Whole projection values grow with history; see the explicit cost model above. Historical model facts need owner turn/step coordinates unless an actual-message override exists.
- The initial generic Client file-input policy rejects executable/remote images. More advanced attachment-backed avatar storage can be designed separately without loosening that policy.
- If capability v1 is missing or different, the native transcript remains unchanged and settings report unsupported. There is no private renderer or DOM-observer fallback.

The seam fields and consumer invariants are specified in `CONTRACT.md`. Original art licensing is recorded in `ARTWORK.md`.
