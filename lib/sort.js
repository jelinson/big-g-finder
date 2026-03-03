/**
 * Sort location results so that available locations appear first,
 * then unavailable locations, preserving relative order within each group
 * (i.e. the existing distance-from-South-Boulder ordering is maintained).
 *
 * @param {Array<{found: boolean, [key: string]: any}>} results
 * @returns {Array} new sorted array
 */
export function sortLocationResults(results) {
  return [...results].sort((a, b) => (b.found ? 1 : 0) - (a.found ? 1 : 0));
}
