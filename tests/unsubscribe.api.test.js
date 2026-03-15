import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));
vi.mock('he', () => ({
  default: {
    escape: (str) =>
      String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;'),
  },
}));

// fetch chain: from().select().eq().single()
// delete chain: from().delete().eq()  — terminal .eq() is awaited directly
const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  single: vi.fn(),
};
const mockSupabase = { from: vi.fn(() => mockChain) };

function mockReq(query = {}) {
  return { method: 'GET', query };
}
function mockRes() {
  return {
    _status: 200,
    _body: null,
    status(c) { this._status = c; return this; },
    send(b) { this._body = b; return this; },
  };
}

describe('GET /api/unsubscribe', () => {
  let handler;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.mock('@supabase/supabase-js', () => ({ createClient: () => mockSupabase }));
    vi.mock('he', () => ({
      default: {
        escape: (str) =>
          String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;'),
      },
    }));
    handler = (await import('../api/unsubscribe.js')).default;
  });

  it('returns 400 when token is missing', async () => {
    const res = mockRes();
    await handler(mockReq({}), res);
    expect(res._status).toBe(400);
  });

  it('returns 200 with HTML body when token is valid', async () => {
    mockChain.single.mockResolvedValueOnce({
      data: { flavor_name: 'Salted Caramel', flavor_pattern: 'saltedcaramel' },
      error: null,
    });
    const res = mockRes();
    await handler(mockReq({ token: 'valid-token' }), res);
    expect(res._status).toBe(200);
    expect(res._body).toContain('unsubscribed');
    expect(res._body).toContain('Salted Caramel');
  });

  it('HTML-escapes malicious flavor_name to prevent XSS', async () => {
    mockChain.single.mockResolvedValueOnce({
      data: { flavor_name: '<script>alert(1)</script>', flavor_pattern: 'malicious' },
      error: null,
    });
    const res = mockRes();
    await handler(mockReq({ token: 'xss-token' }), res);
    expect(res._status).toBe(200);
    expect(res._body).not.toContain('<script>');
    expect(res._body).toContain('&lt;script&gt;');
  });

  it('returns 200 when token is not found (PGRST116 — already unsubscribed)', async () => {
    mockChain.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    });
    const res = mockRes();
    await handler(mockReq({ token: 'stale-token' }), res);
    expect(res._status).toBe(200);
  });

  it('returns 500 on unexpected DB fetch error', async () => {
    mockChain.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'UNEXPECTED', message: 'db error' },
    });
    const res = mockRes();
    await handler(mockReq({ token: 'bad-token' }), res);
    expect(res._status).toBe(500);
  });

  it('returns 500 when delete fails', async () => {
    mockChain.single.mockResolvedValueOnce({
      data: { flavor_name: 'Vanilla', flavor_pattern: 'vanilla' },
      error: null,
    });
    // The delete chain ends with .eq() awaited directly. Override eq() for:
    //   - 1st call (fetch chain): must return mockChain so .single() is reachable
    //   - 2nd call (delete chain): resolve to an error
    mockChain.eq
      .mockReturnValueOnce(mockChain)
      .mockResolvedValueOnce({ error: { message: 'delete failed' } });

    const res = mockRes();
    await handler(mockReq({ token: 'delete-fail-token' }), res);
    expect(res._status).toBe(500);
  });
});
