// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { buildScaffold } from './helpers/scaffold.js';

const FLAVORS_RESPONSE = {
  locations: [
    {
      name: 'Pearl St', address: '1100 Pearl St', url: 'https://sweetcow.com/pearl-st',
      slug: 'pearl-st', flavors: ["Big G's Cookies & Dream", 'Chocolate Chip'],
    },
    {
      name: 'Table Mesa', address: '700 Table Mesa Dr', url: 'https://sweetcow.com/table-mesa',
      slug: 'table-mesa', flavors: ['Chocolate Chip'],
    },
  ],
};

beforeAll(async () => {
  document.body.innerHTML = buildScaffold({
    locGridInner: `
        <a href="https://sweetcow.com/pearl-st/" target="_blank" data-slug="pearl-st">
          <div class="result-card loading">
            <div class="location-name">Pearl St</div>
            <div class="location-address">1100 Pearl St</div>
            <span class="status loading"><span class="loading-spinner">🍦</span> Loading</span>
          </div>
        </a>
        <a href="https://sweetcow.com/table-mesa/" target="_blank" data-slug="table-mesa">
          <div class="result-card loading">
            <div class="location-name">Table Mesa</div>
            <div class="location-address">700 Table Mesa Dr</div>
            <span class="status loading"><span class="loading-spinner">🍦</span> Loading</span>
          </div>
        </a>`,
  });

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(FLAVORS_RESPONSE),
  });

  await import('../public/app.js');
  window.dispatchEvent(new Event('DOMContentLoaded'));

  await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/flavors'));
});

describe('flavor dropdown', () => {
  it('renders initial results correctly for Big Gs', async () => {
    await vi.waitFor(() => {
      const pearl = document.querySelector('[data-slug="pearl-st"] .result-card');
      const mesa = document.querySelector('[data-slug="table-mesa"] .result-card');
      expect(pearl.classList.contains('found')).toBe(true);
      expect(mesa.classList.contains('not-found')).toBe(true);
    });
  });

  it('updates location cards when flavor is changed via the visible dropdown', async () => {
    const select = document.getElementById('flavorSelect');
    select.value = 'Chocolate Chip';
    select.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      const pearl = document.querySelector('[data-slug="pearl-st"] .result-card');
      const mesa = document.querySelector('[data-slug="table-mesa"] .result-card');
      expect(pearl.classList.contains('found')).toBe(true);
      expect(mesa.classList.contains('found')).toBe(true);
    });
  });

  it('updates the subscribe flavor display when flavor changes', async () => {
    const display = document.getElementById('notif-flavor');
    expect(display.textContent).toBe('Chocolate Chip');
  });

  it('updates location cards when switching back to Big Gs', async () => {
    const select = document.getElementById('flavorSelect');
    const bigGsOption = Array.from(select.options).find(o => o.textContent.includes('⭐'));
    select.value = bigGsOption.value;
    select.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      const pearl = document.querySelector('[data-slug="pearl-st"] .result-card');
      const mesa = document.querySelector('[data-slug="table-mesa"] .result-card');
      expect(pearl.classList.contains('found')).toBe(true);
      expect(mesa.classList.contains('not-found')).toBe(true);
    });
  });
});
