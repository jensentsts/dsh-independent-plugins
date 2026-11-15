import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { defaultAvatar, rasterMime } from '../src/avatars.js';
import { MODEL_FAMILIES, MAX_AVATAR_BYTES, validateAvatar } from '../src/config.js';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('all eight local portraits match their recorded hashes and embedded runtime bytes', async () => {
  const manifest = JSON.parse(await readFile(new URL('../artwork/avatar-manifest.json', import.meta.url), 'utf8'));
  assert.deepEqual(manifest.avatars.map(value => value.family), [...MODEL_FAMILIES]);
  const hashes = new Set();
  for (const avatar of manifest.avatars) {
    const bytes = await readFile(new URL(`../${avatar.file}`, import.meta.url));
    assert.equal(bytes.length, avatar.bytes); assert.equal(sha256(bytes), avatar.sha256);
    assert.equal(avatar.width, 256); assert.equal(avatar.height, 256);
    assert.ok(bytes.length <= MAX_AVATAR_BYTES);
    assert.equal(rasterMime(bytes), 'image/webp');
    assert.deepEqual(Buffer.from(defaultAvatar(avatar.family).split(',')[1], 'base64'), bytes);
    assert.equal(validateAvatar(defaultAvatar(avatar.family)), defaultAvatar(avatar.family));
    hashes.add(avatar.sha256);
  }
  assert.equal(hashes.size, 8);
  const source = await readFile(new URL(`../${manifest.sheet}`, import.meta.url));
  assert.equal(source.subarray(1, 4).toString('ascii'), 'PNG');
  assert.equal(sha256(source), manifest.sheetSha256);
});

test('generated art record preserves the actual request and does not claim official vendor or human authorship', async () => {
  const record = await readFile(new URL('../artwork/GENERATION.md', import.meta.url), 'utf8');
  const prompt = await readFile(new URL('../artwork/submitted-prompt.txt', import.meta.url), 'utf8');
  assert.match(record, /2026-11-10/); assert.match(record, /requested subscription provider was `gpt`/);
  assert.match(record, /AI-generated/); assert.match(record, /not a human illustrator/);
  assert.match(prompt, /25岁以上成年/); assert.match(prompt, /无文字\/数字\/水印\/logo/);
});
