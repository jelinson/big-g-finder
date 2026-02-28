import { fileURLToPath } from 'url';
import { load } from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { normalizeFlavorName, isValidFlavor } from '../lib/normalize.js';
import { buildNotifyEmail } from '../lib/emails.js';

const APP_URL = process.env.APP_URL || 'https://biggfinder.jelinson.com';

// Slugs that appear as nav links on sweetcow.com but are not location pages
const NON_LOCATION_SLUGS = new Set([
  'about', 'catering', 'contact', 'careers', 'merch', 'gift-cards', 'gift-card',
  'blog', 'press', 'wholesale', 'events', 'jobs', 'menu', 'order', 'delivery',
  'franchise', 'privacy', 'terms', 'faq', 'newsletter', 'rewards', 'loyalty',
  'store', 'shop', 'cart', 'checkout', 'account', 'login', 'signup', 'search',
  'tag', 'category', 'locations', 'home',
]);

function slugToName(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ── Location discovery ────────────────────────────────────────────────────────

export async function discoverLocations() {
  const res = await fetch('https://sweetcow.com/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BigGFinder/1.0)' },
  });
  if (!res.ok) throw new Error(`Failed to fetch sweetcow.com: HTTP ${res.status}`);
  const html = await res.text();
  const $ = load(html);

  const discovered = new Map(); // url → { slug, url, name }

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    // Match simple single-segment internal paths: /slug/ or /slug
    const match = href?.match(/^\/([a-z][a-z0-9-]+)\/?$/);
    if (!match) return;
    const slug = match[1];
    if (NON_LOCATION_SLUGS.has(slug)) return;
    const url = `https://sweetcow.com/${slug}/`;
    if (!discovered.has(url)) {
      discovered.set(url, { slug, url, name: slugToName(slug) });
    }
  });

  return Array.from(discovered.values());
}

// ── Location reconciliation ───────────────────────────────────────────────────

export async function reconcileLocations(supabase, discovered) {
  const { data: dbLocations, error } = await supabase
    .from('locations')
    .select('*');
  if (error) throw error;

  const dbByUrl = new Map((dbLocations || []).map(l => [l.url, l]));
  const discoveredByUrl = new Map(discovered.map(l => [l.url, l]));

  // New locations: in discovered but not in DB
  for (const [url, loc] of discoveredByUrl) {
    if (!dbByUrl.has(url)) {
      console.log(`  New location detected: ${loc.name} (${url})`);
      const { error: insertErr } = await supabase.from('locations').insert({
        slug: loc.slug,
        name: loc.name,
        url: loc.url,
        active: true,
      });
      if (insertErr) console.error(`  Failed to insert ${loc.name}:`, insertErr.message);
    }
  }

  // Removed locations: in DB but not in discovered
  for (const [url, loc] of dbByUrl) {
    if (!discoveredByUrl.has(url) && loc.active) {
      console.warn(`  WARNING: Location no longer found on site: ${loc.name} (${url})`);
      const { error: updateErr } = await supabase
        .from('locations')
        .update({ active: false })
        .eq('slug', loc.slug);
      if (updateErr) console.error(`  Failed to deactivate ${loc.name}:`, updateErr.message);
    }
  }
}

// ── Flavor scraping ───────────────────────────────────────────────────────────

export async function scrapeLocation(location) {
  const response = await fetch(location.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BigGFinder/1.0)' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${location.url}`);
  const html = await response.text();
  const $ = load(html);
  const flavors = [];
  $('h3').each((_, el) => {
    const text = $(el).text().trim();
    if (isValidFlavor(text)) flavors.push(text);
  });
  return flavors;
}

export async function upsertFlavors(supabase, slug, flavors) {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing, error: fetchErr } = await supabase
    .from('flavors')
    .select('flavor_name')
    .eq('location', slug);
  if (fetchErr) throw fetchErr;

  const existingSet = new Set((existing || []).map(r => r.flavor_name));
  const newFlavors = flavors.filter(f => !existingSet.has(f));
  const returnedFlavors = flavors.filter(f => existingSet.has(f));

  if (newFlavors.length > 0) {
    const { error } = await supabase.from('flavors').insert(
      newFlavors.map(f => ({ location: slug, flavor_name: f, first_seen: today, last_seen: today }))
    );
    if (error) throw error;
  }

  if (returnedFlavors.length > 0) {
    const { error } = await supabase
      .from('flavors')
      .update({ last_seen: today })
      .eq('location', slug)
      .in('flavor_name', returnedFlavors);
    if (error) throw error;
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────

async function getNewFlavors(supabase) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('flavors')
    .select('location, flavor_name')
    .eq('first_seen', today)
    .eq('last_seen', today);
  if (error) throw error;
  return data || [];
}

async function notifySubscribers(supabase, resend, newFlavors, locations) {
  if (newFlavors.length === 0 || !resend) return;

  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('confirmed', true);
  if (error) throw error;
  if (!subscriptions || subscriptions.length === 0) return;

  const locationBySlug = new Map(locations.map(l => [l.slug, l]));

  for (const sub of subscriptions) {
    const matchingFlavors = newFlavors
      .filter(nf => {
        if (sub.locations?.length > 0 && !sub.locations.includes(nf.location)) return false;
        return normalizeFlavorName(nf.flavor_name).includes(sub.flavor_pattern);
      })
      .map(nf => ({
        locationName: locationBySlug.get(nf.location)?.name ?? nf.location,
        flavorName: nf.flavor_name,
      }));

    if (matchingFlavors.length === 0) continue;

    const unsubUrl = `${APP_URL}/api/unsubscribe?token=${sub.unsubscribe_token}`;
    const email = buildNotifyEmail({ matchingFlavors, appUrl: APP_URL, unsubUrl });

    try {
      await resend.emails.send({ ...email, to: sub.email });
      console.log(`  Notified ${sub.email}`);
    } catch (err) {
      console.error(`  Failed to notify ${sub.email}:`, err.message);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing required env: SUPABASE_URL, SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

  // 1. Discover and reconcile locations
  console.log('Discovering locations from sweetcow.com...');
  try {
    const discovered = await discoverLocations();
    console.log(`  Found ${discovered.length} location(s) on site`);
    await reconcileLocations(supabase, discovered);
  } catch (err) {
    console.error('  Location discovery failed (continuing with DB locations):', err.message);
  }

  // 2. Load active locations from DB
  const { data: locations, error: locErr } = await supabase
    .from('locations')
    .select('*')
    .eq('active', true);
  if (locErr) throw locErr;
  console.log(`  Scraping ${locations.length} active location(s)`);

  // 3. Scrape each location
  for (const location of locations) {
    try {
      console.log(`Scraping ${location.name}...`);
      const flavors = await scrapeLocation(location);
      console.log(`  Found ${flavors.length} flavor(s)`);
      await upsertFlavors(supabase, location.slug, flavors);
    } catch (err) {
      console.error(`  Error scraping ${location.name}:`, err.message);
    }
  }

  // 4. Notify subscribers about new flavors
  console.log('Checking for new flavors...');
  const newFlavors = await getNewFlavors(supabase);
  console.log(`  ${newFlavors.length} new flavor(s) today`);

  if (newFlavors.length > 0) {
    console.log('Notifying subscribers...');
    await notifySubscribers(supabase, resend, newFlavors, locations);
  }

  console.log('Done.');
}

// Only run when executed directly (not when imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
