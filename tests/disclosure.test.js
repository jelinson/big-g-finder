// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
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
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/flavors'));
  // Wait for hydration
  await vi.waitFor(() =>
    expect(document.getElementById('notif-section').style.display).not.toBe('none')
  );
});

describe('notification disclosure', () => {
  it('form is hidden by default', () => {
    expect(document.getElementById('notif-form').classList.contains('open')).toBe(false);
  });

  it('clicking trigger opens the form', () => {
    document.getElementById('notif-trigger').click();
    expect(document.getElementById('notif-form').classList.contains('open')).toBe(true);
  });

  it('trigger gets .open class when open', () => {
    expect(document.getElementById('notif-trigger').classList.contains('open')).toBe(true);
  });

  it('clicking trigger again closes the form', () => {
    document.getElementById('notif-trigger').click();
    expect(document.getElementById('notif-form').classList.contains('open')).toBe(false);
  });

  it('trigger loses .open class when closed', () => {
    expect(document.getElementById('notif-trigger').classList.contains('open')).toBe(false);
  });
});
