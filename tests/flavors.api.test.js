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
  };
  // Last call in chain resolves the promise
  Object.defineProperty(chain, 'then', {
    get() {
      return (resolve) => resolve({ data, error });
    },
  });
  // Support Promise.all by making the chain itself a thenable
  chain[Symbol.toStringTag] = 'Promise';
  return chain;
}

// Helper mock req/res
function mockRes() {
  const res = {
    _status: 200,
    _body: null,
    _headers: {},
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
    setHeader(k, v) { this._headers[k] = v; },
  };
  return res;
}

describe('GET /api/flavors', () => {
  let handler;

  beforeEach(async () => {
    vi.resetModules();
    handler = (await import('../api/flavors.js')).default;
  });

  it('returns 405 for non-GET requests', async () => {
    const req = { method: 'POST' };
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('returns locations with flavors grouped by slug', async () => {
    const locations = [
      { slug: 'south-boulder', name: 'South Boulder', url: 'https://sweetcow.com/south-boulder/', address: '669 S Broadway', active: true },
    ];
    const flavors = [
      { location: 'south-boulder', flavor_name: "Big G's Cookies & Dream" },
      { location: 'south-boulder', flavor_name: 'Salted Caramel' },
    ];

    mockFrom.mockImplementation((table) => {
      if (table === 'locations') return mockChain(locations);
      if (table === 'flavors') return mockChain(flavors);
    });

    const req = { method: 'GET' };
    const res = mockRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body.locations).toHaveLength(1);
    expect(res._body.locations[0].flavors).toContain("Big G's Cookies & Dream");
    expect(res._body.locations[0].flavors).toContain('Salted Caramel');
  });

  it('returns empty flavors array for locations with no flavors today', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'locations') return mockChain([
        { slug: 'highlands', name: 'Highlands', url: 'https://sweetcow.com/highlands/', address: null, active: true },
      ]);
      if (table === 'flavors') return mockChain([]);
    });

    const req = { method: 'GET' };
    const res = mockRes();
    await handler(req, res);

    expect(res._body.locations[0].flavors).toEqual([]);
  });
});
