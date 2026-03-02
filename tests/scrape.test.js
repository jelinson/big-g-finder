import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeLocation, discoverLocations, reconcileLocations } from '../scripts/scrape.js';

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

const SAMPLE_LOCATIONS_HTML = `
<!DOCTYPE html>
<html>
<body>
  <nav>
    <a href="/flavors2/">Flavors</a>
    <a href="/locations/">Locations</a>
    <a href="/truck/">Truck</a>
    <a href="/order-now/">Order Now</a>
    <a href="/about/">About</a>
  </nav>
  <main>
    <a href="https://sweetcow.com/south-boulder/">South Boulder</a>
    <a href="https://sweetcow.com/north-boulder/">North Boulder</a>
    <a href="https://sweetcow.com/louisville/">Louisville</a>
    <a href="https://sweetcow.com/highlands/">Highlands</a>
  </main>
  <footer>
    <a href="/faqs/">FAQs</a>
    <a href="/terms-privacy/">Terms &amp; Privacy</a>
    <a href="/feedback/">Feedback</a>
    <a href="https://order.sweetcow.com/">Order Online</a>
    <a href="https://sweetcowegiftifyecom.digitalgiftcardmanager.com/gift">Gift Cards</a>
  </footer>
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

  it('extracts location slugs from the locations page', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_LOCATIONS_HTML,
    });

    const locations = await discoverLocations();
    const slugs = locations.map(l => l.slug);
    expect(slugs).toContain('south-boulder');
    expect(slugs).toContain('north-boulder');
    expect(slugs).toContain('louisville');
    expect(slugs).toContain('highlands');
  });

  it('excludes known non-location pages', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_LOCATIONS_HTML,
    });

    const locations = await discoverLocations();
    const slugs = locations.map(l => l.slug);
    expect(slugs).not.toContain('about');
    expect(slugs).not.toContain('flavors2');
    expect(slugs).not.toContain('truck');
    expect(slugs).not.toContain('order-now');
    expect(slugs).not.toContain('locations');
    expect(slugs).not.toContain('faqs');
    expect(slugs).not.toContain('feedback');
    expect(slugs).not.toContain('terms-privacy');
  });

  it('excludes external URLs', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_LOCATIONS_HTML,
    });

    const locations = await discoverLocations();
    const urls = locations.map(l => l.url);
    expect(urls.every(u => u.startsWith('https://sweetcow.com/'))).toBe(true);
  });

  it('generates title-cased names from slugs', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_LOCATIONS_HTML,
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

// ── reconcileLocations ────────────────────────────────────────────────────────

function makeSupabase(dbLocations) {
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const updateMock = vi.fn().mockReturnThis();
  const eqMock = vi.fn().mockResolvedValue({ error: null });

  const supabase = {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: dbLocations, error: null }),
      insert: insertMock,
      update: updateMock,
    })),
    _insertMock: insertMock,
    _updateMock: updateMock,
    _eqMock: eqMock,
  };

  // update(...).eq(...) chain
  updateMock.mockReturnValue({ eq: eqMock });

  return supabase;
}

function loc(slug, active = true) {
  return { slug, name: slug, url: `https://sweetcow.com/${slug}/`, active };
}

describe('reconcileLocations', () => {
  it('noops when more than one location would be added', async () => {
    const supabase = makeSupabase([loc('south-boulder')]);
    const discovered = [
      loc('south-boulder'),
      loc('north-boulder'),
      loc('louisville'),
    ];
    await reconcileLocations(supabase, discovered);
    expect(supabase._insertMock).not.toHaveBeenCalled();
    expect(supabase._eqMock).not.toHaveBeenCalled();
  });

  it('noops when more than one location would be deactivated', async () => {
    const supabase = makeSupabase([
      loc('south-boulder'),
      loc('north-boulder'),
      loc('louisville'),
    ]);
    const discovered = [loc('south-boulder')];
    await reconcileLocations(supabase, discovered);
    expect(supabase._eqMock).not.toHaveBeenCalled();
  });

  it('inserts a single new location', async () => {
    const supabase = makeSupabase([loc('south-boulder')]);
    const discovered = [loc('south-boulder'), loc('louisville')];
    await reconcileLocations(supabase, discovered);
    expect(supabase._insertMock).toHaveBeenCalledOnce();
    expect(supabase._insertMock).toHaveBeenCalledWith(expect.objectContaining({ slug: 'louisville' }));
  });

  it('deactivates a single removed location', async () => {
    const supabase = makeSupabase([loc('south-boulder'), loc('louisville')]);
    const discovered = [loc('south-boulder')];
    await reconcileLocations(supabase, discovered);
    expect(supabase._eqMock).toHaveBeenCalledWith('slug', 'louisville');
  });

  it('reactivates locations regardless of count', async () => {
    const supabase = makeSupabase([
      loc('south-boulder', false),
      loc('north-boulder', false),
      loc('louisville', false),
    ]);
    const discovered = [loc('south-boulder'), loc('north-boulder'), loc('louisville')];
    await reconcileLocations(supabase, discovered);
    expect(supabase._eqMock).toHaveBeenCalledTimes(3);
  });
});
