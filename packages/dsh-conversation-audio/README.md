# Conversation audio

An independent DSH plugin that adds browser audio controls immediately after a native conversation file card. Original file references, cards and message text remain unchanged. Playback is user-initiated; the player uses `controls` and `preload="none"`, with no autoplay.

## Native integration

The Client consumes the parent-owned file-media positions whose owner supplies `{ file: FileAttachmentRef }`:

- `conversation.chat.user.file-media` renders after each user file card.
- `conversation.chat.message.file-media` renders after a durable `file` block in Assistant content.
- `tool.call.file-media` renders after a `file` block in a settled Tool result.

The native `ui-chat` and `ui-tool` contributions declare those positions and render the original file card first. This plugin registers through `ctx.slots.inject`; it does not depend on bubble, QQ, IO or resource-picker plugins and does not replace the Chat renderer. A non-audio file keeps its card and receives no player.

The package registers a `conversation-audio` resource protocol. The slot reads its descriptor through the framework `useResource` hook; the descriptor contains a same-origin playback URL, original name, byte count and media type. It contains no filesystem path. English and Chinese labels use the standard locale seat.

## Attachment playback

The Host injects the official `connection` and `attachments` services and owns `GET /api/conversation-audio?attachmentId=sha256%3A…&bytes=…&name=…` through `connection.fetch.register`. The Connection carrier applies its existing authentication and owner-only exact-route policy before dispatch. The handler uses the original durable `{ attachmentId, bytes, name }` reference with `attachments.readFileStream(ref, signal)`. It never interprets the attachment ID as a filesystem path, scans directories or constructs an attachment storage path.

The response streams backend chunks with backpressure and cancellation rather than collecting the entire file in memory. MIME is selected from the persisted filename extension: MP3/MP2, WAV, OGG/OGA/Opus, M4A/M4B, AAC, FLAC, WebM, AMR and AIFF/AIF. Actual codec support belongs to the browser. Unsupported extensions keep their native file card without an audio control. A playback failure shows a localized notice and leaves the original card available.

The handler accepts one HTTP byte range (`bytes=start-end`, `bytes=start-`, or `bytes=-suffix`) and answers `206 Partial Content` with `Accept-Ranges` and `Content-Range`. An unsatisfiable range answers `416` with `Content-Range: bytes */<length>`; a multi-range or malformed header serves the complete file. Partial responses stream through the provider's `readFileStream`, discard bytes before the requested start and stop after the requested end. A complete response drains the provider iterator so its final content-address digest check still rejects a corrupt stored file; partial responses verify the durable reference fields before the first byte and never reinterpret a path. An absent file maps to `404`, an invalid reference to `400`, and an unsupported backend to `501`.

Registration belongs to the plugin effect. Unloading removes the route and aborts active reads.

## Build and installation

Run `node build.mjs` to generate the browser module artifact. The bundle patch inserts `independent-conversation-audio`; installing this package is separate from authoring it. The native `ui-chat`/`ui-tool` file-media positions must be present in the running application. No replacement server, profile edit or page refresh is performed by this package's build.

The implementation includes the manifest, typed locale keys, English/Chinese metadata, original MIT-licensed SVG icon and Host/Client entries. Normal build completion is not a claim of installed or rendered playback verification.

## Model Experience

### What the model sees

The `deepseek_tts` tool generates speech when explicitly requested. It resolves `DEEPSEEK_API_KEY` through the native DSH credentials service, uses the DeepSeek TTS WebSocket API, and returns a durable WAV attachment. `stella` and `tide` are available. The API charges by character; no request is made when the plugin loads. It does not send the result to QQ or another destination.

### Token effect

Playback controls do not add model content. The on-demand tool adds its declaration and, when called, a tool result referencing the generated attachment.

### KV Cache effect

The tool declaration is part of the available tool set. The plugin does not modify existing Session messages or headers.

## Known Limitations and Deferred Work

- Browser playback requires support for the stored audio codec. No transcoding or codec installation is performed.
- Partial responses stop at the requested end, so the provider's whole-file digest check runs only for complete responses.
- A file block rendered by a toolview that replaces the generic Tool card does not receive a file-media position unless that view declares one; the built-in generic card, Assistant file blocks and user file cards are covered.
- A compatible native slot, mounted attachment backend and authenticated Connection route are required. Installation, real GUI playback and visual behavior are not claimed by this implementation-only delivery.
