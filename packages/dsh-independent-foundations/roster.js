/** Native package and Loader identities reviewed for the exact release. */
export const FOUNDATION_RUNTIME = '0.2.2-rc.1';
export const FOUNDATION_COMMIT = '66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db';
export const FOUNDATION_ROSTER = Object.freeze([
  { directory: 'ui-renderer', package: '@deepseek-ai/dsh-client-ui-renderer', row: 'ui-renderer', replacement: 'ui-renderer-independent', source: 'packages/client/ui-renderer', client: true },
  { directory: 'ui-chat', package: '@deepseek-ai/dsh-client-ui-chat', row: 'ui-chat', replacement: 'ui-chat-independent', source: 'packages/client/ui-chat', client: true, preferences: ['transcriptView', 'collapseTiming', 'foldedReplies', 'performanceUsage', 'linkOpening'] },
  { directory: 'ui-tool', package: '@deepseek-ai/dsh-client-ui-tool', row: 'ui-tool', replacement: 'ui-tool-independent', source: 'packages/client/ui-tool', client: true },
  { directory: 'ui-input-trigger', package: '@deepseek-ai/dsh-client-ui-input-trigger', row: 'ui-input-trigger', replacement: 'ui-input-trigger-independent', source: 'packages/client/ui-input-trigger', client: true },
  { directory: 'ui-user-questions', package: '@deepseek-ai/dsh-client-ui-user-questions', row: 'ui-user-questions', replacement: 'ui-user-questions-independent', source: 'packages/client/ui-user-questions', client: true },
  { directory: 'ui-conversation', package: '@deepseek-ai/dsh-client-ui-conversation', row: 'ui-conversation', replacement: 'ui-conversation-independent', source: 'packages/client/ui-conversation', client: true, preferences: ['busyEnter'] },
  { directory: 'ui-session', package: '@deepseek-ai/dsh-client-ui-session', row: 'ui-session', replacement: 'ui-session-independent', source: 'packages/client/ui-session', client: true },
  { directory: 'api-session-controller', package: '@deepseek-ai/dsh-api-session-controller', source: 'packages/api/session-controller', client: false, supportArtifact: true },
  { directory: 'fs-sandbox', package: '@deepseek-ai/dsh-fs-sandbox', row: 'fs-sandbox', replacement: 'fs-sandbox-independent', source: 'packages/fs/fs-sandbox', client: false, filesystemProvider: true },
  { directory: 'fs-local', package: '@deepseek-ai/dsh-fs-local', source: 'packages/fs/fs-local', client: false, supportArtifact: true },
  { directory: 'tool-fs-search', package: '@deepseek-ai/dsh-tool-fs-search', row: 'tool-fs-search', replacement: 'tool-fs-search-independent', source: 'packages/fs/tool-fs-search', client: false },
].map(row => Object.freeze(row)));

/** Every directly referenced entry must be accounted even if the generated record omits it. */
export const REQUIRED_FOUNDATION_FILES = Object.freeze([
  'index.js', 'verify.js', 'roster.js', 'package.json', 'cordis.patch.yml',
  'original-hosts/session-controller.js', 'original-hosts/session-controller-typert.js',
  ...FOUNDATION_ROSTER.flatMap(row => [
    `native/${row.directory}/package.json`, `native/${row.directory}/lib/index.js`, `native/${row.directory}/guard.js`,
    ...(row.client ? [`native/${row.directory}/lib/client.js`] : []),
  ]),
]);
