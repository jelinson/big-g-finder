// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';

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
  document.body.innerHTML = `
    <div class="container">
      <div id="loading"></div>
      <select id="flavorSelect"></select>
      <div id="results"></div>
      <div id="subscribe-section" style="display:none">
        <span id="subscribe-flavor-display"></span>
        <form id="subscribe-form">
          <input type="email" id="subscribe-email">
          <div id="location-checkboxes"></div>
          <button type="submit" id="subscribe-btn">Notify Me!</button>
        </form>
        <div id="subscribe-message"></div>
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
  await vi.waitFor(() => expect(document.getElementById('results').innerHTML).not.toBe(''));
});

describe('flavor dropdown', () => {
  it('renders initial results correctly for Big Gs', async () => {
    await vi.waitFor(() => {
      const cards = document.querySelectorAll('.result-card');
      expect(cards.length).toBe(2);
      const pearlCard = Array.from(cards).find(c => c.textContent.includes('Pearl St'));
      const tableMesaCard = Array.from(cards).find(c => c.textContent.includes('Table Mesa'));
      expect(pearlCard.classList.contains('found')).toBe(true);
      expect(tableMesaCard.classList.contains('not-found')).toBe(true);
    });
  });

  it('updates location cards when flavor is changed via the visible dropdown', async () => {
    const visibleSelect = document.getElementById('flavorSelectVisible');
    expect(visibleSelect).not.toBeNull();

    // Chocolate Chip is at both locations — both should flip to found
    visibleSelect.value = 'Chocolate Chip';
    visibleSelect.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      const cards = document.querySelectorAll('.result-card');
      expect(cards.length).toBe(2);
      cards.forEach(card => expect(card.classList.contains('found')).toBe(true));
    });
  });

  it('updates the subscribe flavor display when flavor changes', async () => {
    const display = document.getElementById('subscribe-flavor-display');
    expect(display.textContent).toBe('Chocolate Chip');
  });

  it('updates location cards when switching back to Big Gs', async () => {
    const visibleSelect = document.getElementById('flavorSelectVisible');
    const bigGsOption = Array.from(visibleSelect.options).find(o => o.textContent.includes('⭐'));
    visibleSelect.value = bigGsOption.value;
    visibleSelect.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      const cards = document.querySelectorAll('.result-card');
      const pearlCard = Array.from(cards).find(c => c.textContent.includes('Pearl St'));
      const tableMesaCard = Array.from(cards).find(c => c.textContent.includes('Table Mesa'));
      expect(pearlCard.classList.contains('found')).toBe(true);
      expect(tableMesaCard.classList.contains('not-found')).toBe(true);
    });
  });
});
