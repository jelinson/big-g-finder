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

  it('fetches a second page when page 1 is full and all rows share the latest date', async () => {
    const PAGE_SIZE = 200;
    const locations = [
      { slug: 'south-boulder', name: 'South Boulder', url: 'https://sweetcow.com/south-boulder/', address: '669 S Broadway', active: true },
      { slug: 'highlands', name: 'Highlands', url: 'https://sweetcow.com/highlands/', address: null, active: true },
    ];

    // Build a page-1 result that is exactly PAGE_SIZE rows, all dated '2026-03-04'
    const latestDate = '2026-03-04';
    const page1Rows = Array.from({ length: PAGE_SIZE }, (_, i) => ({
      location: 'south-boulder',
      flavor_name: `Flavor ${i}`,
      last_seen: latestDate,
    }));

    // The overflow rows returned by the .eq + .range query
    const overflowRows = [
      { location: 'highlands', flavor_name: 'Overflow Flavor', last_seen: latestDate },
    ];

    // Track how many times 'flavors' has been queried so we can serve page1 then overflow
    let flavorsCallCount = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'locations') return mockChain(locations);
      if (table === 'flavors') {
        flavorsCallCount += 1;
        if (flavorsCallCount === 1) return mockChain(page1Rows); // page 1
        return mockChain(overflowRows);                          // page 2 (.eq + .range)
      }
    });

    const req = mockRequest('GET');
    const response = await handler(req);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    // page 1 contributed 200 south-boulder flavors
    expect(body.locations.find(l => l.slug === 'south-boulder').flavors).toHaveLength(PAGE_SIZE);
    // overflow row landed in highlands
    expect(body.locations.find(l => l.slug === 'highlands').flavors).toContain('Overflow Flavor');
    // flavors table was queried twice
    expect(flavorsCallCount).toBe(2);
  });

  it('returns 500 when the page-2 overflow query fails', async () => {
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
