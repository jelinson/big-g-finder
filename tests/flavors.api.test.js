import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase before importing the handler
const mockFrom = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}));

// Build a chainable Supabase mock that resolves with given data
function mockChain(data, error = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
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

  it('returns locations with flavors grouped by slug', async () => {
    const locations = [
      { slug: 'south-boulder', name: 'South Boulder', url: 'https://sweetcow.com/south-boulder/', address: '669 S Broadway', active: true },
    ];
    const flavors = [
      { location: 'south-boulder', flavor_name: "Big G's Cookies & Dream" },
      { location: 'south-boulder', flavor_name: 'Salted Caramel' },
    ];

    // flavors table is called twice: once for latest date, once for actual flavors
    let flavorsCallCount = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'locations') return mockChain(locations);
      if (table === 'flavors') {
        flavorsCallCount++;
        if (flavorsCallCount === 1) return mockChain([{ last_seen: '2026-03-04' }]);
        return mockChain(flavors);
      }
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
    let flavorsCallCount = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'locations') return mockChain([
        { slug: 'highlands', name: 'Highlands', url: 'https://sweetcow.com/highlands/', address: null, active: true },
      ]);
      if (table === 'flavors') {
        flavorsCallCount++;
        if (flavorsCallCount === 1) return mockChain([{ last_seen: '2026-03-04' }]);
        return mockChain([]);
      }
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
});
