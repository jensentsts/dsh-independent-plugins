import assert from 'node:assert/strict';
import test from 'node:test';
import { roleFor, appearanceFor, describeMember, memberFor } from '../src/roles.js';
import { DEFAULT_CONFIG } from '../src/config.js';
import { dictionaries } from '../src/locales.js';

test('external producers retain their member identity inside native user-message rows', () => {
  const source = { kind: 'super-agent-io', transport: 'fixture-transport', endpoint: 'group:123', senderId: 'sender-42' };
  const owner = { contractVersion: 1, kind: 'user', part: 'message', source };
  assert.equal(roleFor(owner), 'remote');
  assert.equal(appearanceFor(owner, DEFAULT_CONFIG).align, 'start');
  assert.equal(describeMember(owner, undefined, DEFAULT_CONFIG, key => key).name, 'sender-42');
  const member = { matchType: 'source', matchValue: 'fixture-transport', name: 'External member' };
  assert.equal(memberFor(owner, undefined, 'remote', [member]), member);
  assert.equal(memberFor(owner, undefined, 'remote', [{ ...member, matchValue: source.kind }]).name, member.name);
  assert.equal(roleFor({ ...owner, source: { kind: 'user' } }), 'user');
  assert.equal(roleFor({ ...owner, source: { kind: 'dsh-remote' } }), 'remote');
});

test('committed replies from an external member use that model and the reply tag', () => {
  const owner = { contractVersion: 1, kind: 'user', part: 'message', messageId: 'm', source: { kind: 'super-agent-io', replySource: { actor: 'workstation', provider: 'openai', model: 'gpt-6.1-sol' } } };
  const projection = { version: 1, byMessageId: { m: { provider: 'local', model: 'local-model', effort: 'max', effortOrigin: 'explicit' } } };
  const member = describeMember(owner, projection, DEFAULT_CONFIG, key => key);
  assert.equal(member.name, 'workstation · gpt-6.1-sol');
  assert.equal(member.tag, 'tag.reply');
  assert.equal(member.family, 'gpt');
  assert.equal(appearanceFor(owner, DEFAULT_CONFIG).align, 'start');
});

test('QQ wake and active steering retain distinct tags in native message chrome', () => {
  const source = { kind: 'super-agent-io', transport: 'qq-bridge-001', senderId: 'sender-42', inputMode: 'steer' };
  const owner = { contractVersion: 1, kind: 'context', part: 'message', source };
  const wake = { ...owner, kind: 'turn-trigger', source: { ...source, inputMode: 'queue' } };
  const queuedContext = { ...owner, source: wake.source };
  const otherContext = { ...owner, source: { kind: 'system-prompt', inputMode: 'steer' } };

  assert.equal(describeMember(owner, undefined, DEFAULT_CONFIG, key => dictionaries.zh[key]).tag, '插话');
  assert.equal(describeMember(owner, undefined, DEFAULT_CONFIG, key => dictionaries.en[key]).tag, 'Steer');
  assert.equal(appearanceFor(owner, DEFAULT_CONFIG).variant, 'bubble');
  assert.equal(describeMember(wake, undefined, DEFAULT_CONFIG, key => dictionaries.zh[key]).tag, 'QQ 输入');
  assert.equal(appearanceFor(queuedContext, DEFAULT_CONFIG), null);
  assert.equal(appearanceFor(otherContext, DEFAULT_CONFIG), null);
});
