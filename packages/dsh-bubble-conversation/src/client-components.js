import React from 'react';
import { DEFAULT_CONFIG, MAX_AVATAR_BYTES, normalizeConfig, validateAvatar } from './config.js';
import { defaultAvatar, rasterMime } from './avatars.js';
import { describeMember, appearanceFor } from './roles.js';
import { modelFactFor, PROJECTION_KEY } from './projection.js';
const h = React.createElement;

function configOf(snapshot) {
  if (snapshot?.status !== 'ready') return { ...DEFAULT_CONFIG, enabled: false };
  return normalizeConfig(snapshot.value ?? {});
}
function canDecorate(owner, config) {
  const appearance = appearanceFor(owner, config);
  return appearance?.variant === 'bubble' || owner.kind === 'question-reply' && appearance?.variant === 'transparent';
}
function useDescription(props) {
  const config = configOf(props.useBubbleConfig(value => value));
  const fact = props.useProjection(PROJECTION_KEY, view => modelFactFor(view, props.owner));
  const projection = fact ? { version: 1, byMessageId: {}, byCallId: {}, byStep: { [`${fact.turn}:${fact.step}`]: fact } } : undefined;
  const owner = fact ? { ...props.owner, turn: fact.turn, step: fact.step, messageId: undefined, callId: undefined } : props.owner;
  return { config, description: describeMember(owner, projection, config, props.t) };
}

/** Native chrome owns the body. This component contributes header text only. */
export function MessageHeader(props) {
  const { config, description } = useDescription(props);
  if (!canDecorate(props.owner, config) || !config.showNames && !config.showTags) return null;
  const { role, name, model, tag, fact } = description;
  const effortTitle = !fact ? undefined : fact.effortOrigin === 'explicit' ? props.t('effort.explicit', { effort: fact.effort })
    : props.t(fact.effortOrigin === 'adapter-default' ? 'effort.default' : fact.effortOrigin === 'route-mismatch' ? 'effort.mismatch' : 'effort.unrecorded');
  return h('div', { className: 'dbc-header', 'data-dbc-role': role },
    config.showTags && h('span', { className: 'dbc-tag' }, tag),
    config.showNames && h('span', { className: 'dbc-name', title: effortTitle }, name),
    config.showNames && model && model !== name && h('span', { className: 'dbc-model', title: effortTitle }, model));
}

/** Avatars occupy only the host-allocated header/gutter, never a body flex column. */
export function MessageAvatar(props) {
  const { config, description } = useDescription(props);
  if (!canDecorate(props.owner, config) || !config.showAvatars) return null;
  return h('img', { className: 'dbc-avatar', src: description.avatar || defaultAvatar(description.family, description.role),
    alt: props.t('avatar.alt', { name: description.name }), width: 28, height: 28, draggable: false });
}

/** Read one user-selected raster into an owned bounded data URL. */
export async function avatarFromFile(file) {
  if (!file || file.size > MAX_AVATAR_BYTES || file.size < 8) throw new TypeError('Invalid avatar file');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = rasterMime(bytes);
  if (!mime) throw new TypeError('Invalid avatar format');
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return validateAvatar(`data:${mime};base64,${btoa(binary)}`);
}

/** A standalone member list; writes use DSH's shared ConfigForm queue. */
export function MemberSettings({ useBubbleConfig, useChromeSupport, useQuestionSupport, useGutterSupport, saveField, t }) {
  const snapshot = useBubbleConfig(value => value);
  const support = useChromeSupport(value => value);
  const questionsSupport = useQuestionSupport(value => value);
  const gutterSupport = useGutterSupport(value => value);
  let config;
  let invalid = false;
  try { config = configOf(snapshot); } catch (error) { invalid = true; config = { ...DEFAULT_CONFIG, enabled: false }; }
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const writable = snapshot?.status === 'ready' && snapshot.writable === true && !busy;
  const write = async (field, value) => {
    setBusy(true); setError(null);
    try { if (!await saveField(field, value)) setError(t('save.failed')); }
    catch (failure) { setError(t('save.failed')); }
    finally { setBusy(false); }
  };
  const updateMember = (id, field, value) => {
    const defaultMatches = { role: 'reply', family: 'deepseek', model: 'provider/model', tool: 'read', source: 'qq' };
    const members = config.members.map(member => member.id === id ? { ...member, [field]: value,
      ...(field === 'matchType' ? { matchValue: defaultMatches[value] } : {}) } : member);
    try { normalizeConfig({ ...config, members }); } catch (failure) { setError(t('error.config')); return; }
    void write('members', members);
  };
  const status = invalid || support.error && support.error !== 'unsupported-version' ? 'error.config' : !support.supported ? 'status.unsupported'
    : snapshot?.status !== 'ready' ? 'status.settings' : !config.enabled ? 'status.disabled' : 'status.supported';
  const checkbox = field => h('label', { className: 'dbc-toggle', key: field }, h('input', { type: 'checkbox', checked: config[field], disabled: !writable,
    onChange: event => { void write(field, event.target.checked); } }), t(field));
  return h('section', { className: 'dbc-settings' },
    h('h2', null, t('title')), h('p', { className: 'dbc-note' }, t('description')),
    h('div', { className: 'dbc-status', role: 'status', 'data-error': invalid || !support.supported }, t(status)),
    h('div', { className: 'dbc-toggles' }, ['enabled', 'showTags', 'showNames', 'showAvatars'].map(checkbox)),
    h('label', { className: 'dbc-field' }, t('avatarPlacement'), h('select', { className: 'dbc-select', value: config.avatarPlacement, disabled: !writable || !gutterSupport.supported,
      onChange: event => { void write('avatarPlacement', event.target.value); } },
    h('option', { value: 'auto' }, t('placement.auto')), h('option', { value: 'header' }, t('placement.header')))),
    h('p', { className: 'dbc-note', role: 'status' }, t(gutterSupport.supported ? 'placement.supported' : 'placement.unsupported')),
    h('div', { className: 'dbc-toolbar' }, h('h3', null, t('members')), h('button', { className: 'dbc-button', type: 'button', disabled: !writable || config.members.length >= 128,
      onClick: () => { void write('members', [...config.members, { id: `member-${crypto.randomUUID()}`, matchType: 'role', matchValue: 'reply', name: '', avatar: '' }]); } }, t('add'))),
    config.members.map(member => h(MemberEditor, { key: member.id, member, t, disabled: !writable,
      onUpdate: (field, value) => updateMember(member.id, field, value),
      onRemove: () => { void write('members', config.members.filter(value => value.id !== member.id)); },
      onError: () => setError(t('error.file')) })),
    h('p', { className: 'dbc-note' }, t('avatar.notice')),
    h('div', { className: 'dbc-status', role: 'status', 'data-error': !questionsSupport.supported || !!questionsSupport.error },
      t(!questionsSupport.supported ? 'questions.unsupported' : questionsSupport.error ? 'questions.failed' : !config.enabled ? 'questions.disabled' : 'questions.supported')),
    h('label', { className: 'dbc-field' }, t('questions'), h('select', { className: 'dbc-select', value: config.questionLayout,
      disabled: !writable || !questionsSupport.supported || !config.enabled,
      onChange: event => { void write('questionLayout', event.target.value); } },
      h('option', { value: 'aggregate' }, t('questions.aggregate')), h('option', { value: 'individual' }, t('questions.individual')))), 
    h('p', { className: 'dbc-note' }, t('questions.notice')),
    busy && h('p', { role: 'status', className: 'dbc-note' }, t('saving')),
    error && h('p', { role: 'alert', className: 'dbc-error' }, error));
}

function MemberEditor({ member, t, disabled, onUpdate, onRemove, onError }) {
  const fields = [
    h('label', { className: 'dbc-field', key: 'type' }, t('matchType'), h('select', { className: 'dbc-select', value: member.matchType, disabled,
      onChange: event => onUpdate('matchType', event.target.value) }, ['role', 'family', 'model', 'tool', 'source'].map(value => h('option', { key: value, value }, t(`match.${value}`))))),
    h('label', { className: 'dbc-field', key: 'match' }, t('matchValue'), h('input', { className: 'dbc-input', defaultValue: member.matchValue, key: `${member.id}:value:${member.matchValue}`, disabled,
      onBlur: event => { if (event.target.value !== member.matchValue) onUpdate('matchValue', event.target.value); } })),
    h('label', { className: 'dbc-field', key: 'name' }, t('name'), h('input', { className: 'dbc-input', defaultValue: member.name, key: `${member.id}:name:${member.name}`, maxLength: 120, disabled,
      onBlur: event => { if (event.target.value !== member.name) onUpdate('name', event.target.value); } })),
  ];
  return h('div', { className: 'dbc-member' }, h('img', { className: 'dbc-avatar-preview', width: 40, height: 40, alt: t('avatar.alt', { name: member.name || member.matchValue }), src: member.avatar || defaultAvatar(member.matchType === 'family' ? member.matchValue : null, member.matchValue) }),
    h('div', { className: 'dbc-fields' }, fields,
      h('div', { className: 'dbc-actions' }, h('label', { className: 'dbc-field' }, t('avatar.choose'), h('input', { className: 'dbc-file-input', type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', disabled,
        onChange: async event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
          try { onUpdate('avatar', await avatarFromFile(file)); } catch (failure) { onError(failure); } } })),
      h('button', { className: 'dbc-button', type: 'button', disabled, onClick: () => onUpdate('avatar', '') }, t('avatar.reset')),
      h('button', { className: 'dbc-button', type: 'button', disabled, onClick: onRemove }, t('remove')))));
}
