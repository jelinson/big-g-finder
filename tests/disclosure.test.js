// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';

const FLAVORS_RESPONSE = {
  locations: [{
    name: 'Pearl St', address: '1100 Pearl St', url: 'https://sweetcow.com/pearl-st',
    slug: 'pearl-st', flavors: ["Big G's Cookies & Dream"],
  }],
};

beforeAll(async () => {
  document.body.innerHTML = `
    <div class="container">
      <div class="flavor-pill"><select id="flavorSelect"></select></div>
      <div id="results"></div>
      <div id="loc-summary">
        <div id="loc-summary-text">🔍 Checking all locations…</div>
        <div id="notif-section" style="display:none">
          <button type="button" id="notif-trigger">🔔 Get notified</button>
          <div id="notif-form" style="display:none">
            <form id="subscribe-form">
              <input type="email" id="subscribe-email">
              <span id="notif-flavor"></span>
              <div id="location-checkboxes"></div>
              <button type="submit" id="subscribe-btn">Notify Me!</button>
            </form>
            <div id="subscribe-message"></div>
          </div>
        </div>
      </div>
      <div id="loc-grid">
        <a href="https://sweetcow.com/pearl-st/" target="_blank" data-slug="pearl-st">
          <div class="result-card loading">
            <span class="status loading">⟳ Loading</span>
          </div>
        </a>
      </div>
    </div>
  `;

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
    expect(document.getElementById('notif-form').style.display).toBe('none');
  });

  it('clicking trigger opens the form', () => {
    document.getElementById('notif-trigger').click();
    expect(document.getElementById('notif-form').style.display).toBe('block');
  });

  it('trigger gets .open class when open', () => {
    expect(document.getElementById('notif-trigger').classList.contains('open')).toBe(true);
  });

  it('clicking trigger again closes the form', () => {
    document.getElementById('notif-trigger').click();
    expect(document.getElementById('notif-form').style.display).toBe('none');
  });

  it('trigger loses .open class when closed', () => {
    expect(document.getElementById('notif-trigger').classList.contains('open')).toBe(false);
  });
});
