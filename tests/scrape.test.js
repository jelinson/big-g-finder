import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrapeLocation, discoverLocations, reconcileLocations, getNewFlavors, notifySubscribers } from '../scripts/scrape.js';

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

// ── Shared helpers for getNewFlavors / notifySubscribers ──────────────────────

// Makes a Supabase query chain that is awaitable at any depth and resolves to
// the given value. Every chainable method (select, eq, in, etc.) returns the
// same object, so callers can chain arbitrarily without extra setup.
function makeChainableQuery(resolvedValue) {
  const promise = Promise.resolve(resolvedValue);
  const chain = {
    then: (res, rej) => promise.then(res, rej),
    catch: rej => promise.catch(rej),
  };
  for (const m of ['select', 'eq', 'in', 'update', 'insert']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  return chain;
}

// ── getNewFlavors ─────────────────────────────────────────────────────────────

describe('getNewFlavors', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('queries first_seen and last_seen with todays date', async () => {
    vi.setSystemTime(new Date('2026-01-15'));
    const expected = [{ location: 'south-boulder', flavor_name: "Big G's Cookies & Dream" }];
    const chain = makeChainableQuery({ data: expected, error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) };

    const result = await getNewFlavors(supabase);

    expect(result).toEqual(expected);
    expect(chain.eq).toHaveBeenCalledWith('first_seen', '2026-01-15');
    expect(chain.eq).toHaveBeenCalledWith('last_seen', '2026-01-15');
  });

  it('returns an empty array when no flavors are new today', async () => {
    vi.setSystemTime(new Date('2026-01-15'));
    const chain = makeChainableQuery({ data: [], error: null });
    const supabase = { from: vi.fn().mockReturnValue(chain) };

    expect(await getNewFlavors(supabase)).toEqual([]);
  });
});

// ── notifySubscribers ─────────────────────────────────────────────────────────

describe('notifySubscribers', () => {
  function makeResend() {
    return { emails: { send: vi.fn().mockResolvedValue({}) } };
  }

  function makeSupabase(subscriptions) {
    const chain = makeChainableQuery({ data: subscriptions, error: null });
    return { from: vi.fn().mockReturnValue(chain) };
  }

  const locations = [
    { slug: 'location-a', name: 'Location A', url: 'https://sweetcow.com/location-a/' },
    { slug: 'location-b', name: 'Location B', url: 'https://sweetcow.com/location-b/' },
  ];

  // flavor_pattern is stored pre-normalized (same transform as normalizeFlavorName)
  const confirmedSub = {
    email: 'test@example.com',
    flavor_pattern: 'biggcookiedream',
    locations: [],
    unsubscribe_token: 'tok123',
    confirmed: true,
  };

  it('returns early without querying DB when newFlavors is empty', async () => {
    const resend = makeResend();
    const supabase = makeSupabase([confirmedSub]);

    await notifySubscribers(supabase, resend, [], locations);

    expect(supabase.from).not.toHaveBeenCalled();
    expect(resend.emails.send).not.toHaveBeenCalled();
  });

  it('returns early without querying DB when resend is null', async () => {
    const supabase = makeSupabase([confirmedSub]);
    const newFlavors = [{ location: 'location-a', flavor_name: "Big G's Cookies & Dream" }];

    await notifySubscribers(supabase, null, newFlavors, locations);

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('sends one email when a new flavor matches the subscription', async () => {
    const resend = makeResend();
    const supabase = makeSupabase([confirmedSub]);
    const newFlavors = [{ location: 'location-a', flavor_name: "Big G's Cookies & Dream" }];

    await notifySubscribers(supabase, resend, newFlavors, locations);

    expect(resend.emails.send).toHaveBeenCalledOnce();
    expect(resend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'test@example.com' })
    );
  });

  it('does not send when the flavor pattern does not match', async () => {
    const resend = makeResend();
    const supabase = makeSupabase([{ ...confirmedSub, flavor_pattern: 'rockyroad' }]);
    const newFlavors = [{ location: 'location-a', flavor_name: "Big G's Cookies & Dream" }];

    await notifySubscribers(supabase, resend, newFlavors, locations);

    expect(resend.emails.send).not.toHaveBeenCalled();
  });

  it('does not send when the new flavor appeared at an unwatched location', async () => {
    const resend = makeResend();
    const supabase = makeSupabase([{ ...confirmedSub, locations: ['location-a'] }]);
    // Flavor appeared at location-b, but sub only watches location-a
    const newFlavors = [{ location: 'location-b', flavor_name: "Big G's Cookies & Dream" }];

    await notifySubscribers(supabase, resend, newFlavors, locations);

    expect(resend.emails.send).not.toHaveBeenCalled();
  });

  it('day-2 scenario: sends one email for locationB only when locationA flavor is not new', async () => {
    // Day 1: locationA got the flavor → getNewFlavors returned it → user was notified.
    // Day 2: locationA still has the flavor (first_seen=day1, so getNewFlavors excludes it).
    //        locationB first has the flavor today → getNewFlavors returns only locationB.
    // Expected: exactly one email mentioning Location B, not Location A.
    const resend = makeResend();
    const supabase = makeSupabase([confirmedSub]);
    const newFlavors = [{ location: 'location-b', flavor_name: "Big G's Cookies & Dream" }];

    await notifySubscribers(supabase, resend, newFlavors, locations);

    expect(resend.emails.send).toHaveBeenCalledOnce();
    const sentArgs = resend.emails.send.mock.calls[0][0];
    expect(sentArgs.to).toBe('test@example.com');
    expect(sentArgs.html).toContain('Location B');
    expect(sentArgs.html).not.toContain('Location A');
  });

  it('sends one email listing both locations when both are new on the same day', async () => {
    const resend = makeResend();
    const supabase = makeSupabase([confirmedSub]);
    const newFlavors = [
      { location: 'location-a', flavor_name: "Big G's Cookies & Dream" },
      { location: 'location-b', flavor_name: "Big G's Cookies & Dream" },
    ];

    await notifySubscribers(supabase, resend, newFlavors, locations);

    expect(resend.emails.send).toHaveBeenCalledOnce();
    const sentArgs = resend.emails.send.mock.calls[0][0];
    expect(sentArgs.html).toContain('Location A');
    expect(sentArgs.html).toContain('Location B');
  });
});
