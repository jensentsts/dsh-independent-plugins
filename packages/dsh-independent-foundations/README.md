# Local preparation

Before installing this package, run `node prepare.mjs` from this directory. The script writes the local URL of the alias-aware search component into the three shipped preset entries. It may be rerun after moving the package. The checked-in preset entries use the official search component until preparation.

The historical deployment verifier expects generated guard files and a deployment manifest, which are not included in this source snapshot.

The matching upstream source changes are available in `../../patches/dsh-0.2.2-rc.1.patch`.
# Independent extension foundations

Matching-release extensions for DSH 0.2.2-rc.1. Bubble conversations, workspace references, resource picking, message IO, remote links, QQ, and audio remain independent business packages.

## Runtime composition

The bundle replaces seven browser presentation packages: Chat, Tool, Input Trigger, User Questions, Conversation, Session UI, and the Slot renderer. Native message bodies, folding, actions, language selection, and billing positions remain owned by those native components.

The official Session controller row stays mounted with its existing Host, wire metadata, and interactive Client service. A separate session-previews-independent row supplies passive readers through sessionPreviews; Session UI supplies the optional uiSessionPreview adapter. Chat and Conversation register previews while these capabilities are available. Preview loading follows its own lifecycle alongside ordinary conversation startup.

The local filesystem replacement exposes reversible workspace path aliases while retaining the installed FileSystem, FsError, and sandbox policy identities. Standard, PTC, and Creator presets use the matching alias-aware search consumer. search-presets.patch.yml is generated from the exact release's public preset definitions and changes their search module location; higher-priority user preset overrides retain normal DSH precedence.

Staged filesystem manifests declare external runtime imports as peers, including imports inherited from inlined fs-local. The official linked-package resolver supplies the installed filesystem helpers, watcher, native Windows dependency, and search executable.

## Build

From the independent-plugins project, set DSH_SOURCE_ROOT to the matching checkout and use the existing tools/exact-source-loader.mjs with Node. Run tools/build-foundation-artifacts.mjs for the seven presentation components, tools/build-session-previews.mjs for the passive-reader extension, tools/build-filesystem-artifacts.mjs fs-sandbox tool-fs-search for path aliases, and tools/build-foundation-search-presets.mjs for preset locations.

The artifact directory is linked from the Desktop profile. Rebuilding updates the files consumed on the next load. Install and toggle the bundle through Plugin Manager. Changes to shared filesystem or renderer providers may require a complete application restart so consumers read the same generation.

## Rollback

Turning the bundle off removes its inserted rows and restores the official composition. Original entries and saved settings stay in the profile. Workspace-reference consumers require an alias-capable filesystem while enabled. A deployment using a remote filesystem selects the remote provider built with the same alias support; it selects one root filesystem provider at a time.

## Model experience

Presentation and preview extensions add no model messages or requests. Filesystem aliases and search resolve paths supplied to existing tools. Model-visible workspace syntax belongs to the workspace-reference plugin.

## License

Native source retains the upstream MIT license and notices. The foundation icon is an original geometric drawing.

