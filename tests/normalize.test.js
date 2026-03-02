import { describe, it, expect } from 'vitest';
import { normalizeFlavorName, isValidFlavor, isBigGsFlavor } from '../lib/normalize.js';

describe('normalizeFlavorName', () => {
  it("normalizes Big G's Cookies & Dream to biggcookiedream", () => {
    expect(normalizeFlavorName("Big G's Cookies & Dream")).toBe('biggcookiedream');
  });

  it('handles curly apostrophe variant', () => {
    expect(normalizeFlavorName('Big G\u2019s Cookies & Dream')).toBe('biggcookiedream');
  });

  it('handles straight apostrophe variant', () => {
    expect(normalizeFlavorName("Big G's Cookies & Dream")).toBe('biggcookiedream');
  });

  it('normalizes gigantic variant', () => {
    expect(normalizeFlavorName("Big Gigantic Cookies & Dream")).toBe('biggiganticcookiedream');
  });

  it('strips punctuation and spaces', () => {
    expect(normalizeFlavorName('Salted Caramel!')).toBe('saltedcaramel');
  });

  it('lowercases everything', () => {
    expect(normalizeFlavorName('VANILLA')).toBe('vanilla');
  });

  it('handles cookies plural', () => {
    expect(normalizeFlavorName("Big G's Cookies & Dream")).toBe('biggcookiedream');
  });

  it('two normalized different names are not equal', () => {
    expect(normalizeFlavorName('Vanilla')).not.toBe(normalizeFlavorName('Chocolate'));
  });

  it('two normalized same names with different punctuation are equal', () => {
    expect(normalizeFlavorName('Salted Caramel')).toBe(normalizeFlavorName('Salted  Caramel!'));
  });
});

describe('isBigGsFlavor', () => {
  it("returns true for Big G's Cookies & Dream (straight apostrophe)", () => {
    expect(isBigGsFlavor("Big G's Cookies & Dream")).toBe(true);
  });

  it('returns true for curly apostrophe variant', () => {
    expect(isBigGsFlavor('Big G\u2019s Cookies & Dream')).toBe(true);
  });

  it('returns true for Big Gigantic Cookies & Dream', () => {
    expect(isBigGsFlavor('Big Gigantic Cookies & Dream')).toBe(true);
  });

  it('returns false for Salted Caramel', () => {
    expect(isBigGsFlavor('Salted Caramel')).toBe(false);
  });

  it('returns false for an unrelated flavor', () => {
    expect(isBigGsFlavor('Chocolate')).toBe(false);
  });
});

describe('isValidFlavor', () => {
  it('returns false for empty string', () => {
    expect(isValidFlavor('')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isValidFlavor(null)).toBe(false);
    expect(isValidFlavor(undefined)).toBe(false);
  });

  it('returns false for strings of 3 chars or fewer', () => {
    expect(isValidFlavor('Ice')).toBe(false);
    expect(isValidFlavor('AB')).toBe(false);
  });

  it('returns false for hashtags', () => {
    expect(isValidFlavor('#sweetcow')).toBe(false);
  });

  it('returns false for sweetcow (no space) references', () => {
    expect(isValidFlavor('sweetcow')).toBe(false);
    expect(isValidFlavor('sweetcow.com')).toBe(false);
  });

  it("returns false for Today's Flavors header", () => {
    expect(isValidFlavor("Today's Flavors")).toBe(false);
    expect(isValidFlavor('Todays Flavor')).toBe(false);
  });

  it('returns false for Directions', () => {
    expect(isValidFlavor('Directions')).toBe(false);
  });

  it('returns true for valid flavor names', () => {
    expect(isValidFlavor('Salted Caramel')).toBe(true);
    expect(isValidFlavor("Big G's Cookies & Dream")).toBe(true);
    expect(isValidFlavor('Vanilla Bean')).toBe(true);
    expect(isValidFlavor('Dark Chocolate')).toBe(true);
  });
});
