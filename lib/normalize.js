export const INVALID_PATTERNS = [
  /^#/,
  /sweetcow/i,
  /today'?s?\s+flavor/i,
  /direction/i,
  /^$/,
];

export function normalizeFlavorName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/big\s*g[''']?s?/i, 'bigg')
    .replace(/gigantic[''']?s?/i, 'gigantic')
    .replace(/cookie[s]?/i, 'cookie')
    .replace(/dream[s]?/i, 'dream');
}

export function isValidFlavor(flavor) {
  if (!flavor || flavor.length <= 3) return false;
  return !INVALID_PATTERNS.some(p => p.test(flavor));
}
