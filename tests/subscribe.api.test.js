import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing handler
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));
vi.mock('resend', () => ({
  Resend: vi.fn(() => mockResend),
}));
vi.mock('../lib/emails.js', () => ({
  buildConfirmEmail: vi.fn(() => ({
    from: 'test@biggfinder.jelinson.com',
    subject: 'Confirm',
    html: '<p>confirm</p>',
  })),
}));

const mockResend = { emails: { send: vi.fn().mockResolvedValue({ id: 'email-id' }) } };

// Chainable Supabase mock
const mockChain = {
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { confirm_token: 'tok-123' }, error: null }),
};
const mockSupabase = { from: vi.fn(() => mockChain) };

function mockReq(method, body = {}, query = {}) {
  return { method, body, query };
}
function mockRes() {
  const res = {
    _status: 200, _body: null, _redirect: null,
    status(c) { this._status = c; return this; },
    json(b) { this._body = b; return this; },
    redirect(code, url) { this._status = code; this._redirect = url; },
  };
  return res;
}

describe('POST /api/subscribe', () => {
  let handler;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    // Re-apply mocks after resetModules
    vi.mock('@supabase/supabase-js', () => ({ createClient: () => mockSupabase }));
    vi.mock('resend', () => ({ Resend: vi.fn(() => mockResend) }));
    vi.mock('../lib/emails.js', () => ({
      buildConfirmEmail: vi.fn(() => ({ from: 'x', subject: 'y', html: 'z' })),
    }));
    handler = (await import('../api/subscribe.js')).default;
  });

  it('returns 400 when email is missing', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { flavorPattern: 'biggcookiedream' }), res);
    expect(res._status).toBe(400);
  });

  it('returns 400 when flavorPattern is missing', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { email: 'test@example.com' }), res);
    expect(res._status).toBe(400);
  });

  it('accepts a non-Big-G flavor (Salted Caramel)', async () => {
    mockChain.single.mockResolvedValueOnce({ data: { confirm_token: 'salted-tok' }, error: null });
    const res = mockRes();
    await handler(mockReq('POST', { email: 'fan@example.com', flavorPattern: 'Salted Caramel' }), res);
    expect(res._status).toBe(200);
    expect(res._body?.ok).toBe(true);
  });

  it('returns 405 for unsupported methods', async () => {
    const res = mockRes();
    await handler(mockReq('DELETE'), res);
    expect(res._status).toBe(405);
  });
});

describe('GET /api/subscribe (confirm)', () => {
  let handler;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.mock('@supabase/supabase-js', () => ({ createClient: () => mockSupabase }));
    vi.mock('resend', () => ({ Resend: vi.fn(() => mockResend) }));
    vi.mock('../lib/emails.js', () => ({
      buildConfirmEmail: vi.fn(() => ({ from: 'x', subject: 'y', html: 'z' })),
    }));
    handler = (await import('../api/subscribe.js')).default;
  });

  it('returns 400 when confirm token is missing', async () => {
    const res = mockRes();
    await handler(mockReq('GET', {}, {}), res);
    expect(res._status).toBe(400);
  });

  it('redirects to /?subscribed=1 on success', async () => {
    mockChain.eq.mockResolvedValueOnce({ error: null });
    const res = mockRes();
    await handler(mockReq('GET', {}, { confirm: 'valid-token' }), res);
    expect(res._redirect).toContain('subscribed=1');
  });
});
