/** Generated original model-family portraits plus package-authored geometric fallbacks. */
import { whaleGirlImages } from './avatar-images.js';
const FAMILIES = ['deepseek', 'gpt', 'claude', 'grok', 'glm', 'kimi', 'gemini', 'doubao'];
const PALETTES = ['#335dff', '#23756a', '#b65c38', '#333947', '#6659b5', '#2c756d', '#4b6bda', '#4979bb'];
const svgUrl = svg => `data:image/svg+xml,${encodeURIComponent(svg)}`;

/** Use a local generated adult portrait for a known model family; never an official vendor avatar. */
export function defaultAvatar(family = null, role = 'reply') {
  if (FAMILIES.includes(family) && role !== 'user' && role !== 'question') return whaleGirlImages[family];
  return placeholderAvatar(family, role);
}

/** Retain original geometric artwork for generic roles and explicit fallback needs. */
export function placeholderAvatar(family = null, role = 'reply') {
  const index = FAMILIES.indexOf(family);
  const color = index < 0 ? '#596574' : PALETTES[index];
  const shape = role === 'user' || role === 'question'
    ? '<circle cx="32" cy="24" r="10" fill="white"/><path d="M14 55a18 18 0 0 1 36 0" fill="white"/>'
    : '<path d="M12 32c0-11 9-18 21-18 9 0 17 6 19 14l6-3-2 11-6-2c-4 12-13 17-25 14-8-2-13-8-13-16Z" fill="white"/><circle cx="39" cy="28" r="2.5" fill="' + color + '"/><path d="m20 15 5-7 5 8" fill="white"/>';
  const badge = index < 0 ? '' : `<circle cx="51" cy="51" r="8" fill="white"/><path d="M${47 + index % 3} 48v6m-3-3h6" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="${color}"/>${shape}${badge}</svg>`);
}

/** Validate MIME from actual magic bytes before storing a user-selected raster image. */
export function rasterMime(bytes) {
  if (!(bytes instanceof Uint8Array)) return null;
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value)) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  const text = (...positions) => positions.map(index => String.fromCharCode(bytes[index] ?? 0)).join('');
  if (bytes.length >= 12 && text(0, 1, 2, 3) === 'RIFF' && text(8, 9, 10, 11) === 'WEBP') return 'image/webp';
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(text(0, 1, 2, 3, 4, 5))) return 'image/gif';
  return null;
}
