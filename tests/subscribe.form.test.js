// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { buildScaffold } from './helpers/scaffold.js';

const FLAVORS_RESPONSE = {
  locations: [{
    name: 'Pearl St', address: '1100 Pearl St', url: 'https://sweetcow.com/pearl-st',
    slug: 'pearl-st', flavors: ["Big G's Cookies & Dream"],
  }],
};

beforeAll(async () => {
  document.body.innerHTML = buildScaffold();

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(FLAVORS_RESPONSE),
  });

  await import('../public/app.js');
  window.dispatchEvent(new Event('DOMContentLoaded'));

  // Wait for the initial flavors fetch to complete before any tests run
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/flavors'));
  await vi.waitFor(() =>
    expect(document.querySelector('[data-slug="pearl-st"] .result-card').classList.contains('loading')).toBe(false)
  );
});

beforeEach(() => {
  fetch.mockReset();
  fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(FLAVORS_RESPONSE) });
  document.getElementById('subscribe-email').value = '';
  const msg = document.getElementById('subscribe-message');
  if (msg) { msg.textContent = ''; msg.className = 'subscribe-message'; }
});

describe('subscribe form', () => {
  it('calls POST /api/subscribe when the form is submitted', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'confirm email sent' }),
    });

    document.getElementById('subscribe-email').value = 'test@example.com';
    document.getElementById('subscribe-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    await vi.waitFor(() => {
      const subscribeCalls = fetch.mock.calls.filter(c => c[0] === '/api/subscribe');
      expect(subscribeCalls).toHaveLength(1);
      expect(JSON.parse(subscribeCalls[0][1].body).email).toBe('test@example.com');
    });
  });

  it('shows a success message after subscribing', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'confirm email sent' }),
    });

    document.getElementById('subscribe-email').value = 'test@example.com';
    document.getElementById('subscribe-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    await vi.waitFor(() => {
      const msg = document.getElementById('subscribe-message');
      expect(msg.className).toContain('success');
      expect(msg.textContent).toMatch(/check your email/i);
    });
  });

  it('shows an error message when the API returns an error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid email' }),
    });

    document.getElementById('subscribe-email').value = 'bad@example.com';
    document.getElementById('subscribe-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    await vi.waitFor(() => {
      const msg = document.getElementById('subscribe-message');
      expect(msg.className).toContain('error');
    });
  });
});
