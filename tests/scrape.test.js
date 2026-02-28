import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeLocation, discoverLocations } from '../scripts/scrape.js';

const SAMPLE_LOCATION_HTML = `
<!DOCTYPE html>
<html>
<body>
  <nav><a href="/south-boulder/">South Boulder</a></nav>
  <h3>Today's Flavors</h3>
  <h3>Big G's Cookies &amp; Dream</h3>
  <h3>Salted Caramel</h3>
  <h3>Dark Chocolate</h3>
  <h3>#sweetcow</h3>
  <h3>Ice</h3>
</body>
</html>`;

const SAMPLE_HOME_HTML = `
<!DOCTYPE html>
<html>
<body>
  <nav>
    <a href="/south-boulder/">South Boulder</a>
    <a href="/north-boulder/">North Boulder</a>
    <a href="/louisville/">Louisville</a>
    <a href="/about/">About</a>
    <a href="/catering/">Catering</a>
    <a href="https://order.sweetcow.com/">Order</a>
  </nav>
</body>
</html>`;

describe('scrapeLocation', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('extracts valid h3 flavor text', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_LOCATION_HTML,
    });

    const flavors = await scrapeLocation({ url: 'https://sweetcow.com/south-boulder/' });
    expect(flavors).toContain("Big G's Cookies & Dream");
    expect(flavors).toContain('Salted Caramel');
    expect(flavors).toContain('Dark Chocolate');
  });

  it('filters out invalid entries', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_LOCATION_HTML,
    });

    const flavors = await scrapeLocation({ url: 'https://sweetcow.com/south-boulder/' });
    expect(flavors).not.toContain("Today's Flavors");
    expect(flavors).not.toContain('#sweetcow');
    expect(flavors).not.toContain('Ice'); // too short
  });

  it('throws on HTTP error', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 404 });
    await expect(scrapeLocation({ url: 'https://sweetcow.com/fake/' })).rejects.toThrow('HTTP 404');
  });
});

describe('discoverLocations', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('extracts location slugs from homepage nav', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_HOME_HTML,
    });

    const locations = await discoverLocations();
    const slugs = locations.map(l => l.slug);
    expect(slugs).toContain('south-boulder');
    expect(slugs).toContain('north-boulder');
    expect(slugs).toContain('louisville');
  });

  it('excludes known non-location pages', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_HOME_HTML,
    });

    const locations = await discoverLocations();
    const slugs = locations.map(l => l.slug);
    expect(slugs).not.toContain('about');
    expect(slugs).not.toContain('catering');
  });

  it('excludes external URLs', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_HOME_HTML,
    });

    const locations = await discoverLocations();
    const urls = locations.map(l => l.url);
    expect(urls.every(u => u.startsWith('https://sweetcow.com/'))).toBe(true);
  });

  it('generates title-cased names from slugs', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_HOME_HTML,
    });

    const locations = await discoverLocations();
    const southBoulder = locations.find(l => l.slug === 'south-boulder');
    expect(southBoulder?.name).toBe('South Boulder');
  });

  it('throws on fetch failure', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(discoverLocations()).rejects.toThrow();
  });
});
