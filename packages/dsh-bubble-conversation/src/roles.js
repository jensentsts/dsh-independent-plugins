/** Pure role classification. A display role never changes a Session message's source. */
import { modelFactFor, modelLabel } from './projection.js';
const own = (value, key) => Object.hasOwn(value, key);
const sourceRecord = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const isIoSteering = source => source.kind === 'super-agent-io' && source.inputMode === 'steer';
const isQqInput = source => source.kind === 'qq' || (source.kind === 'super-agent-io' && source.transport === 'qq-bridge-001');
const externalReply = source => {
  const reply = sourceRecord(source.replySource);
  return source.kind === 'super-agent-io' && ['actor', 'provider', 'model'].every(key => typeof reply[key] === 'string' && reply[key] !== '') ? reply : undefined;
};
const TOOL_ROLES = Object.freeze({
  read: 'read', read_image: 'read', read_file: 'read', glob: 'search', grep: 'search', web_search: 'search', web_fetch: 'search',
  write: 'edit', edit: 'edit', apply_patch: 'edit', bash: 'command', pwsh: 'command', exec_command: 'command',
  todo_write: 'task', create_goal: 'task', update_goal: 'task', get_goal: 'task',
  ask_user_question: 'question', request_user_input: 'question',
});

/** Resolve one of the configured model families from a recorded route. */
export function modelFamily(fact) {
  const value = `${fact?.provider ?? ''}/${fact?.model ?? ''}`.toLowerCase();
  if (/deepseek/.test(value)) return 'deepseek';
  if (/claude|anthropic/.test(value)) return 'claude';
  if (/grok|xai|x-ai/.test(value)) return 'grok';
  if (/glm|zhipu|z\.ai|z-ai/.test(value)) return 'glm';
  if (/kimi|moonshot/.test(value)) return 'kimi';
  if (/gemini|google/.test(value)) return 'gemini';
  if (/doubao|豆包/.test(value)) return 'doubao';
  if (/(?:^|[/_.-])(gpt|o[134](?:[-/]|$))|openai|chatgpt/.test(value)) return 'gpt';
  return null;
}

/** Classify a complete visible message owner without looking at DOM or translated text. */
export function roleFor(owner) {
  if (owner.part === 'reasoning' || owner.groupPart === 'reasoning') return 'thinking';
  if (owner.part === 'tool') {
    const name = owner.toolName ?? '';
    if (name === 'subagent' || name.startsWith('subagent_') || name === 'spawn_teammate') return 'subagent';
    if (name.includes('plugin') || name.startsWith('cordis_')) return 'plugin';
    return own(TOOL_ROLES, name) ? TOOL_ROLES[name] : 'tool';
  }
  const source = sourceRecord(owner.source);
  if (owner.kind === 'turn-trigger' && ['team-message', 'agent-message', 'subagent-settled'].includes(source.kind)) return 'subagent';
  if (externalReply(source)) return 'reply';
  if (['remote', 'dsh-remote', 'super-agent-io', 'qq'].includes(source.kind)) return 'remote';
  if (owner.pending || owner.echo || owner.kind === 'user' || owner.kind === 'steering') return 'user';
  if (owner.kind === 'assistant-step') return 'reply';
  if (owner.kind === 'question-reply') return 'question';
  if (owner.kind === 'turn-trigger') {
    return 'trigger';
  }
  if (owner.kind === 'command' || owner.kind === 'manual-compaction') return 'command';
  if (owner.kind === 'tool-call') return 'tool';
  return 'unknown';
}

/** Select a member using exact matchers before broad model-family and role defaults. */
export function memberFor(owner, fact, role, members) {
  const source = sourceRecord(owner.source);
  const sources = [source.kind, source.transport, source.endpoint].filter(value => typeof value === 'string' && value !== '');
  const candidates = { model: fact ? `${fact.provider}/${fact.model}` : '', tool: owner.toolName ?? '', family: modelFamily(fact) ?? '', role };
  for (const type of ['model', 'tool', 'source', 'family', 'role']) {
    const member = members.find(item => item.matchType === type && (type === 'source' ? sources.includes(item.matchValue) : item.matchValue === candidates[type]));
    if (member) return member;
  }
  return undefined;
}

/** Render-ready data retains actual routes even when a custom display name is selected. */
export function describeMember(owner, projection, config, t) {
  const role = roleFor(owner);
  const source = sourceRecord(owner.source);
  const reply = externalReply(source);
  const fact = reply ? { provider: reply.provider, model: reply.model, effortOrigin: 'unrecorded' } : modelFactFor(projection, owner) ?? (source.kind === 'model' && typeof source.provider === 'string' && typeof source.model === 'string'
    ? { provider: source.provider, model: source.model, effortOrigin: 'unrecorded' } : undefined);
  const member = memberFor(owner, fact, role, config.members);
  const model = role === 'reply' || role === 'thinking' ? modelLabel(fact) : '';
  const externalName = role === 'remote' ? [source.senderId, source.endpoint, source.transport].find(value => typeof value === 'string' && value !== '') : '';
  const defaultName = (reply && model ? `${reply.actor} · ${model}` : model) || owner.toolName || (typeof source.displayName === 'string' ? source.displayName : '') || externalName || t(`role.${role}`);
  let tag = role;
  if (role === 'remote') {
    if (owner.kind !== 'turn-trigger' && isIoSteering(source)) tag = 'steer';
    else if (isQqInput(source)) tag = 'qqInput';
  }
  return { role, family: modelFamily(fact), name: member?.name || defaultName, model, fact,
    tag: t(`tag.${tag}`), avatar: member?.avatar || '', memberId: member?.id ?? null };
}

/** Only native-owned visible message positions opt into bubble styling. */
export function appearanceFor(owner, config, avatarPlacementSupported = false) {
  if (!config.enabled || owner.contractVersion !== 1) return null;
  if (['turn-tail', 'turn-process', 'system-prompt'].includes(owner.kind)) return null;
  if (owner.kind === 'context' && !isIoSteering(sourceRecord(owner.source))) return null;
  const placement = avatarPlacementSupported ? { avatarPlacement: config.avatarPlacement } : {};
  if (owner.kind === 'question-reply') return { variant: 'transparent', align: 'end', ...placement };
  if (owner.kind === 'tool-call' && owner.part !== 'tool') return { variant: 'transparent' };
  if (owner.part === 'container' || owner.part === 'control') return { variant: 'transparent' };
  const shape = owner.part === 'reasoning' ? ' dbc-message--thinking'
    : owner.kind === 'assistant-step' && owner.part === 'message' ? ' dbc-message--reply' : '';
  return { variant: 'bubble', align: roleFor(owner) === 'user' ? 'end' : 'start',
    ...placement, className: 'dbc-message' + shape, variables: {
      '--dsh-message-background': 'var(--dsw-alias-bg-layer-1)',
      '--dsh-message-border-color': 'var(--dsw-alias-border-l2)', '--dsh-message-radius': '12px',
    } };
}
