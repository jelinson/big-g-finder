import { describe, it, expect } from 'vitest';
import { sortLocationResults } from '../lib/sort.js';

function loc(name, found) {
  return { location: name, found };
}

describe('sortLocationResults', () => {
  it('puts available locations before unavailable ones', () => {
    const results = [loc('A', false), loc('B', true), loc('C', false), loc('D', true)];
    const sorted = sortLocationResults(results);
    expect(sorted[0].found).toBe(true);
    expect(sorted[1].found).toBe(true);
    expect(sorted[2].found).toBe(false);
    expect(sorted[3].found).toBe(false);
  });

  it('preserves distance order within the available group', () => {
    // B is closer than D (both available); distance order should be maintained
    const results = [loc('A', false), loc('B', true), loc('C', false), loc('D', true)];
    const sorted = sortLocationResults(results);
    expect(sorted[0].location).toBe('B');
    expect(sorted[1].location).toBe('D');
  });

  it('preserves distance order within the unavailable group', () => {
    // A is closer than C (both unavailable); distance order should be maintained
    const results = [loc('A', false), loc('B', true), loc('C', false), loc('D', true)];
    const sorted = sortLocationResults(results);
    expect(sorted[2].location).toBe('A');
    expect(sorted[3].location).toBe('C');
  });

  it('returns all locations when none have the flavor', () => {
    const results = [loc('South Boulder', false), loc('Highlands', false)];
    const sorted = sortLocationResults(results);
    expect(sorted).toHaveLength(2);
    expect(sorted.every(r => !r.found)).toBe(true);
    expect(sorted[0].location).toBe('South Boulder');
    expect(sorted[1].location).toBe('Highlands');
  });

  it('returns all locations when all have the flavor', () => {
    const results = [loc('South Boulder', true), loc('Highlands', true)];
    const sorted = sortLocationResults(results);
    expect(sorted).toHaveLength(2);
    expect(sorted.every(r => r.found)).toBe(true);
    expect(sorted[0].location).toBe('South Boulder');
    expect(sorted[1].location).toBe('Highlands');
  });

  it('does not mutate the original array', () => {
    const results = [loc('A', false), loc('B', true)];
    const original = [...results];
    sortLocationResults(results);
    expect(results[0].location).toBe(original[0].location);
    expect(results[1].location).toBe(original[1].location);
  });
});
