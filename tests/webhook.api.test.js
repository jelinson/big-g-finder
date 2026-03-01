import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { Readable } from 'stream';

// Mock Supabase before importing the handler
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

const mockChain = {
  delete: vi.fn().mockReturnThis(),
  in:     vi.fn().mockResolvedValue({ error: null }),
};
const mockSupabase = { from: vi.fn(() => mockChain) };

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEST_SECRET = 'whsec_' + Buffer.from('test-secret-32-bytes-padded!!!!!').toString('base64');

function makeSignature(body, msgId, timestamp) {
  const secretBytes   = Buffer.from(TEST_SECRET.replace(/^whsec_/, ''), 'base64');
  const signedContent = `${msgId}.${timestamp}.${body}`;
  const sig           = createHmac('sha256', secretBytes).update(signedContent).digest('base64');
  return `v1,${sig}`;
}

function validHeaders(body, { msgId = 'msg-1', timestamp } = {}) {
  const ts = timestamp ?? Math.floor(Date.now() / 1000).toString();
  return {
    'svix-id':        msgId,
    'svix-timestamp': ts,
    'svix-signature': makeSignature(body, msgId, ts),
  };
}

function mockReq(body, headers = {}, method = 'POST') {
  const stream = new Readable({ read() { this.push(Buffer.from(body)); this.push(null); } });
  stream.method  = method;
  stream.headers = headers;
  return stream;
}

function mockRes() {
  const res = {
    _status: 200,
    _body:   null,
    status(c)  { this._status = c; return this; },
    json(b)    { this._body = b;   return this; },
  };
  return res;
}

// ── verifySignature unit tests ─────────────────────────────────────────────────

describe('verifySignature', () => {
  let verifySignature;

  beforeEach(async () => {
    vi.resetModules();
    vi.mock('@supabase/supabase-js', () => ({ createClient: () => mockSupabase }));
    ({ verifySignature } = await import('../api/webhooks/resend.js'));
  });

  it('returns true for a valid signature', () => {
    const body    = '{"type":"email.bounced"}';
    const headers = validHeaders(body);
    expect(verifySignature(body, headers, TEST_SECRET)).toBe(true);
  });

  it('returns false for a wrong secret', () => {
    const body       = '{"type":"email.bounced"}';
    const headers    = validHeaders(body);
    const wrongSecret = 'whsec_' + Buffer.from('wrong-secret-32-bytes-padded!!!!').toString('base64');
    expect(verifySignature(body, headers, wrongSecret)).toBe(false);
  });

  it('returns false when headers are missing', () => {
    expect(verifySignature('{}', {}, TEST_SECRET)).toBe(false);
  });

  it('returns false for an expired timestamp', () => {
    const body      = '{"type":"email.bounced"}';
    const oldTs     = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 min ago
    const headers   = validHeaders(body, { timestamp: oldTs });
    expect(verifySignature(body, headers, TEST_SECRET)).toBe(false);
  });

  it('accepts multiple svix-signature entries when one matches', () => {
    const body    = '{"type":"email.bounced"}';
    const headers = validHeaders(body);
    // Prepend a bogus v1 signature
    headers['svix-signature'] = 'v1,badsig== ' + headers['svix-signature'];
    expect(verifySignature(body, headers, TEST_SECRET)).toBe(true);
  });
});

// ── Handler integration tests ──────────────────────────────────────────────────

describe('POST /api/webhooks/resend', () => {
  let handler;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.mock('@supabase/supabase-js', () => ({ createClient: () => mockSupabase }));
    process.env.RESEND_WEBHOOK_SECRET   = TEST_SECRET;
    process.env.SUPABASE_URL            = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_KEY    = 'service-key';
    handler = (await import('../api/webhooks/resend.js')).default;
  });

  it('returns 405 for non-POST requests', async () => {
    const res = mockRes();
    await handler(mockReq('{}', {}, 'GET'), res);
    expect(res._status).toBe(405);
  });

  it('returns 401 for an invalid signature', async () => {
    const body = '{"type":"email.bounced"}';
    const req  = mockReq(body, { 'svix-id': 'x', 'svix-timestamp': '123', 'svix-signature': 'v1,badsig' });
    const res  = mockRes();
    await handler(req, res);
    expect(res._status).toBe(401);
  });

  it('deletes subscriber on email.bounced and returns 200', async () => {
    const body    = JSON.stringify({ type: 'email.bounced', data: { to: ['victim@example.com'] } });
    const res     = mockRes();
    await handler(mockReq(body, validHeaders(body)), res);
    expect(res._status).toBe(200);
    expect(mockChain.in).toHaveBeenCalledWith('email', ['victim@example.com']);
  });

  it('deletes subscriber on email.complained and returns 200', async () => {
    const body = JSON.stringify({ type: 'email.complained', data: { to: ['unhappy@example.com'] } });
    const res  = mockRes();
    await handler(mockReq(body, validHeaders(body)), res);
    expect(res._status).toBe(200);
    expect(mockChain.in).toHaveBeenCalledWith('email', ['unhappy@example.com']);
  });

  it('returns 200 without touching the DB for unrelated event types', async () => {
    const body = JSON.stringify({ type: 'email.delivered', data: { to: ['user@example.com'] } });
    const res  = mockRes();
    await handler(mockReq(body, validHeaders(body)), res);
    expect(res._status).toBe(200);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns 500 when RESEND_WEBHOOK_SECRET is not set', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const res = mockRes();
    await handler(mockReq('{}', {}), res);
    expect(res._status).toBe(500);
  });

  it('returns 500 when the DB delete fails', async () => {
    mockChain.in.mockResolvedValueOnce({ error: { message: 'db error' } });
    const body = JSON.stringify({ type: 'email.bounced', data: { to: ['x@example.com'] } });
    const res  = mockRes();
    await handler(mockReq(body, validHeaders(body)), res);
    expect(res._status).toBe(500);
  });
});
