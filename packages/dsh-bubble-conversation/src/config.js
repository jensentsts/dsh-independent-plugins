/** Validated member settings shared by the Host and browser. */
export const SETTINGS_NAMESPACE = 'dsh-bubble-conversation';
export const MAX_AVATAR_BYTES = 262144;
export const MAX_MEMBERS = 128;
export const MODEL_FAMILIES = Object.freeze(['deepseek', 'gpt', 'claude', 'grok', 'glm', 'kimi', 'gemini', 'doubao']);
export const ROLE_IDS = Object.freeze(['user', 'reply', 'thinking', 'read', 'edit', 'search', 'command', 'tool', 'task', 'subagent', 'plugin', 'trigger', 'question', 'remote', 'unknown']);
export const DEFAULT_CONFIG = Object.freeze({
  enabled: true, showTags: true, showNames: true, showAvatars: true,
  avatarPlacement: 'auto', questionLayout: 'aggregate', members: [],
});
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

/** Accept owned raster images only; remote URLs and executable SVG uploads are not loaded. */
export function validateAvatar(value) {
  if (value === '' || value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new TypeError('Avatar must be a raster data URL');
  const match = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) throw new TypeError('Avatar must be a raster data URL');
  const bytes = match[2].length / 4 * 3 - (match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0);
  if (bytes > MAX_AVATAR_BYTES) throw new RangeError('Avatar exceeds 256 KiB');
  if (bytes < 8) throw new TypeError('Avatar has no image payload');
  return value;
}

/** Resolve partial configuration without hiding malformed persisted values. */
export function normalizeConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Configuration must be an object');
  const result = { ...DEFAULT_CONFIG, ...input };
  for (const key of ['enabled', 'showTags', 'showNames', 'showAvatars']) {
    if (typeof result[key] !== 'boolean') throw new TypeError(`${key} must be boolean`);
  }
  if (!['header', 'auto'].includes(result.avatarPlacement)) throw new TypeError('Unsupported avatar placement');
  if (!['aggregate', 'individual'].includes(result.questionLayout)) throw new TypeError('Unsupported question layout');
  if (!Array.isArray(result.members) || result.members.length > MAX_MEMBERS) throw new RangeError('Invalid member count');
  const ids = new Set();
  result.members = result.members.map(member => {
    if (!member || typeof member !== 'object' || Array.isArray(member)) throw new TypeError('Invalid member');
    const { id, matchType, matchValue = '', name = '', avatar = '' } = member;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_.-]{1,80}$/.test(id) || FORBIDDEN_KEYS.has(id) || ids.has(id)) throw new TypeError('Invalid or duplicate member id');
    ids.add(id);
    if (!['role', 'family', 'model', 'tool', 'source'].includes(matchType)) throw new TypeError('Invalid member matcher');
    if (typeof matchValue !== 'string' || matchValue.length < 1 || matchValue.length > 200) throw new TypeError('Invalid member match value');
    if (matchType === 'role' && !ROLE_IDS.includes(matchValue)) throw new TypeError('Unknown member role');
    if (matchType === 'family' && !MODEL_FAMILIES.includes(matchValue)) throw new TypeError('Unknown model family');
    if (typeof name !== 'string' || name.length > 120 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(name)) throw new TypeError('Invalid member name');
    return { id, matchType, matchValue, name, avatar: validateAvatar(avatar) };
  });
  return { enabled: result.enabled, showTags: result.showTags, showNames: result.showNames, showAvatars: result.showAvatars,
    avatarPlacement: result.avatarPlacement, questionLayout: result.questionLayout, members: result.members };
}

/** Build the Host Config schema using the deployed Schemastery identity. */
export function createConfigSchema(z) {
  const member = z.object({
    id: z.string().pattern(/^[a-zA-Z0-9_.-]{1,80}$/).required(),
    matchType: z.union(['role', 'family', 'model', 'tool', 'source']).default('role'),
    matchValue: z.string().required(), name: z.string().default(''), avatar: z.string().default(''),
  });
  return z.object({
    enabled: z.boolean().default(true).volatile(),
    showTags: z.boolean().default(true).volatile(),
    showNames: z.boolean().default(true).volatile(),
    showAvatars: z.boolean().default(true).volatile(),
    avatarPlacement: z.union(['header', 'auto']).default('auto').volatile(),
    questionLayout: z.union(['aggregate', 'individual']).default('aggregate').volatile(),
    members: z.transform(z.array(member), members => {
      const ids = new Set();
      if (members.length > 128) throw new Error('At most 128 members are supported');
      for (const value of members) {
        if (ids.has(value.id) || ['__proto__', 'prototype', 'constructor'].includes(value.id)) throw new Error('Invalid or duplicate member id');
        ids.add(value.id);
        if (!value.matchValue || value.matchValue.length > 200 || value.name.length > 120) throw new Error('Invalid member text');
        if (value.matchType === 'role' && !['user', 'reply', 'thinking', 'read', 'edit', 'search', 'command', 'tool', 'task', 'subagent', 'plugin', 'trigger', 'question', 'remote', 'unknown'].includes(value.matchValue)) throw new Error('Unknown member role');
        if (value.matchType === 'family' && !['deepseek', 'gpt', 'claude', 'grok', 'glm', 'kimi', 'gemini', 'doubao'].includes(value.matchValue)) throw new Error('Unknown model family');
        if (value.avatar) {
          const match = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value.avatar);
          if (!match || match[2].length % 4 !== 0 || match[2].length > 349528 || match[2].length < 12) throw new Error('Invalid avatar data');
          const size = match[2].length / 4 * 3 - (match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0);
          if (size > 262144) throw new Error('Avatar exceeds 256 KiB');
        }
      }
      return members;
    }).default([]).volatile(),
  });
}
