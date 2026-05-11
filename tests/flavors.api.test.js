import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase before importing the handler
const mockFrom = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}));

// Build a chainable Supabase mock that resolves with given data.
// Supports select/eq/order/limit/range chains; the promise resolves when awaited.
function mockChain(data, error = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  };
  Object.defineProperty(chain, 'then', {
    get() {
      return (resolve) => resolve({ data, error });
    },
  });
  chain[Symbol.toStringTag] = 'Promise';
  return chain;
}

// Helper to create a mock Request
function mockRequest(method = 'GET') {
  return new Request('http://localhost/api/flavors', { method });
}

// Helper to parse a Response body
async function parseResponse(response) {
  const body = await response.json();
  return { status: response.status, body };
}

describe('GET /api/flavors', () => {
  let handler;

  beforeEach(async () => {
    vi.resetModules();
    handler = (await import('../api/flavors.js')).default;
  });

  it('returns 405 for non-GET requests', async () => {
    const req = mockRequest('POST');
    const response = await handler(req);
    expect(response.status).toBe(405);
  });

  it('returns locations with flavors grouped by slug (single page)', async () => {
    const locations = [
      { slug: 'south-boulder', name: 'South Boulder', url: 'https://sweetcow.com/south-boulder/', address: '669 S Broadway', active: true },
    ];
    // Fewer than PAGE_SIZE rows — no second-page fetch needed
    const flavors = [
      { location: 'south-boulder', flavor_name: "Big G's Cookies & Dream", last_seen: '2026-03-04' },
      { location: 'south-boulder', flavor_name: 'Salted Caramel', last_seen: '2026-03-04' },
    ];

    mockFrom.mockImplementation((table) => {
      if (table === 'locations') return mockChain(locations);
      if (table === 'flavors') return mockChain(flavors);
    });

    const req = mockRequest('GET');
    const response = await handler(req);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    expect(body.locations).toHaveLength(1);
    expect(body.locations[0].flavors).toContain("Big G's Cookies & Dream");
    expect(body.locations[0].flavors).toContain('Salted Caramel');
  });

  it('returns empty flavors array for locations with no flavors', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'locations') return mockChain([
        { slug: 'highlands', name: 'Highlands', url: 'https://sweetcow.com/highlands/', address: null, active: true },
      ]);
      if (table === 'flavors') return mockChain([]);
    });

    const req = mockRequest('GET');
    const response = await handler(req);
    const { body } = await parseResponse(response);

    expect(body.locations[0].flavors).toEqual([]);
  });

  it('returns empty flavors when no scrape data exists', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'locations') return mockChain([
        { slug: 'highlands', name: 'Highlands', url: 'https://sweetcow.com/highlands/', address: null, active: true },
      ]);
      if (table === 'flavors') return mockChain([]);
    });

    const req = mockRequest('GET');
    const response = await handler(req);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    expect(body.locations[0].flavors).toEqual([]);
  });

  it('refetches all rows for the latest date when page 1 is saturated (no duplicates from overlap)', async () => {
    const PAGE_SIZE = 200;
    const locations = [
      { slug: 'south-boulder', name: 'South Boulder', url: 'https://sweetcow.com/south-boulder/', address: '669 S Broadway', active: true },
      { slug: 'highlands', name: 'Highlands', url: 'https://sweetcow.com/highlands/', address: null, active: true },
    ];

    const latestDate = '2026-03-04';
    // Page 1: 200 south-boulder rows, all dated latestDate.
    const page1Rows = Array.from({ length: PAGE_SIZE }, (_, i) => ({
      location: 'south-boulder',
      flavor_name: `SB ${i}`,
      last_seen: latestDate,
    }));
    // The refetch mocks what a real `.eq('last_seen', latestDate)` query returns:
    // EVERY row matching that date, including the 200 already seen in page 1
    // plus 10 highlands rows that weren't in page 1. The old offset-based code
    // would concat these onto page 1's rows and double-count SB 0..199.
    const highlandsRows = Array.from({ length: 10 }, (_, i) => ({
      location: 'highlands',
      flavor_name: `HL ${i}`,
      last_seen: latestDate,
    }));
    const allTodayRows = [...page1Rows, ...highlandsRows];

    let flavorsCallCount = 0;
    let overflowChain;
    mockFrom.mockImplementation((table) => {
      if (table === 'locations') return mockChain(locations);
      if (table === 'flavors') {
        flavorsCallCount += 1;
        if (flavorsCallCount === 1) return mockChain(page1Rows);
        overflowChain = mockChain(allTodayRows);
        return overflowChain;
      }
    });

    const req = mockRequest('GET');
    const response = await handler(req);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    const sb = body.locations.find(l => l.slug === 'south-boulder');
    const hl = body.locations.find(l => l.slug === 'highlands');
    // No duplicates: south-boulder should have exactly 200 unique flavors,
    // not 400 (which is what concat-with-page-1 would produce).
    expect(sb.flavors).toHaveLength(PAGE_SIZE);
    expect(new Set(sb.flavors).size).toBe(PAGE_SIZE);
    expect(hl.flavors).toHaveLength(10);
    expect(new Set(hl.flavors).size).toBe(10);
    expect(flavorsCallCount).toBe(2);
    // The refetch should filter by date, not paginate by offset (offset pagination
    // on tied last_seen values is not stable across queries).
    expect(overflowChain.eq).toHaveBeenCalledWith('last_seen', latestDate);
    expect(overflowChain.range).not.toHaveBeenCalled();
  });

  it('does not artificially cap the latest-date refetch at a low row count', async () => {
    const PAGE_SIZE = 200;
    const locations = [
      { slug: 'south-boulder', name: 'South Boulder', url: 'https://sweetcow.com/south-boulder/', address: '669 S Broadway', active: true },
    ];
    const latestDate = '2026-03-04';
    // 2000 rows on the same date — well above the old `.range(200, 1200)` ceiling.
    const allTodayRows = Array.from({ length: 2000 }, (_, i) => ({
      location: 'south-boulder',
      flavor_name: `SB ${i}`,
      last_seen: latestDate,
    }));
    const page1Rows = allTodayRows.slice(0, PAGE_SIZE);

    let flavorsCallCount = 0;
    let overflowChain;
    mockFrom.mockImplementation((table) => {
      if (table === 'locations') return mockChain(locations);
      if (table === 'flavors') {
        flavorsCallCount += 1;
        if (flavorsCallCount === 1) return mockChain(page1Rows);
        overflowChain = mockChain(allTodayRows);
        return overflowChain;
      }
    });

    const req = mockRequest('GET');
    const response = await handler(req);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    expect(body.locations[0].flavors).toHaveLength(2000);
    // Ceiling must be high enough to fit a realistic worst case (2000+ rows),
    // not the ~1000-row range cap the original implementation used.
    expect(overflowChain.limit).toHaveBeenCalled();
    const limitArg = overflowChain.limit.mock.calls[0][0];
    expect(limitArg).toBeGreaterThanOrEqual(2000);
  });

  it('returns 500 when the latest-date refetch query fails', async () => {
    const PAGE_SIZE = 200;
    const locations = [
      { slug: 'south-boulder', name: 'South Boulder', url: 'https://sweetcow.com/south-boulder/', address: '669 S Broadway', active: true },
    ];

    const latestDate = '2026-03-04';
    const page1Rows = Array.from({ length: PAGE_SIZE }, (_, i) => ({
      location: 'south-boulder',
      flavor_name: `Flavor ${i}`,
      last_seen: latestDate,
    }));

    let flavorsCallCount = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'locations') return mockChain(locations);
      if (table === 'flavors') {
        flavorsCallCount += 1;
        if (flavorsCallCount === 1) return mockChain(page1Rows);
        return mockChain(null, { message: 'DB error' }); // overflow query fails
      }
    });

    const req = mockRequest('GET');
    const response = await handler(req);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBe('Failed to load flavors');
  });

  it('returns 500 when the locations or flavors initial query fails', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'locations') return mockChain(null, { message: 'DB error' });
      if (table === 'flavors') return mockChain([]);
    });

    const req = mockRequest('GET');
    const response = await handler(req);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBe('Failed to load flavors');
  });
});
