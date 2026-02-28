import { load } from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.APP_URL || 'https://biggfinder.jelinson.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required env: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const LOCATIONS = [
  { slug: 'south-boulder',       name: 'South Boulder',       url: 'https://sweetcow.com/south-boulder/',        address: '669 South Broadway, Boulder' },
  { slug: 'north-boulder',       name: 'North Boulder',       url: 'https://sweetcow.com/north-boulder/',        address: '2628 Broadway, Boulder' },
  { slug: 'louisville',          name: 'Louisville',          url: 'https://sweetcow.com/louisville/',           address: '637 Front Street, Louisville' },
  { slug: 'longmont',            name: 'Longmont',            url: 'https://sweetcow.com/longmont/',             address: '600 Longs Peak Ave, Longmont' },
  { slug: 'highlands',           name: 'Highlands',           url: 'https://sweetcow.com/highlands/',            address: '3475 West 32nd Ave, Denver' },
  { slug: 'stanley-marketplace', name: 'Stanley Marketplace', url: 'https://sweetcow.com/stanley-marketplace/', address: '2501 Dallas Street, Aurora' },
  { slug: 'platt-park',          name: 'Platt Park',          url: 'https://sweetcow.com/denver-platt-park/',   address: '1882 South Pearl St, Denver' },
];

const INVALID_PATTERNS = [
  /^#/,
  /sweetcow/i,
  /today'?s?\s+flavor/i,
  /direction/i,
  /^$/,
];

function normalizeFlavorName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/big\s*g[''']?s?/i, 'bigg')
    .replace(/gigantic[''']?s?/i, 'gigantic')
    .replace(/cookie[s]?/i, 'cookie')
    .replace(/dream[s]?/i, 'dream');
}

function isValidFlavor(flavor) {
  if (!flavor || flavor.length <= 3) return false;
  return !INVALID_PATTERNS.some(p => p.test(flavor));
}

async function scrapeLocation(location) {
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

async function upsertFlavors(slug, flavors) {
  const today = new Date().toISOString().split('T')[0];

  // Get existing flavors for this location to avoid overwriting first_seen
  const { data: existing, error: fetchErr } = await supabase
    .from('flavors')
    .select('flavor_name')
    .eq('location', slug);
  if (fetchErr) throw fetchErr;

  const existingSet = new Set((existing || []).map(r => r.flavor_name));
  const newFlavors = flavors.filter(f => !existingSet.has(f));
  const returnedFlavors = flavors.filter(f => existingSet.has(f));

  // Insert genuinely new flavors
  if (newFlavors.length > 0) {
    const { error } = await supabase.from('flavors').insert(
      newFlavors.map(f => ({ location: slug, flavor_name: f, first_seen: today, last_seen: today }))
    );
    if (error) throw error;
  }

  // Update last_seen for existing flavors seen again today
  if (returnedFlavors.length > 0) {
    const { error } = await supabase
      .from('flavors')
      .update({ last_seen: today })
      .eq('location', slug)
      .in('flavor_name', returnedFlavors);
    if (error) throw error;
  }
}

async function getNewFlavors() {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('flavors')
    .select('location, flavor_name')
    .eq('first_seen', today)
    .eq('last_seen', today);
  if (error) throw error;
  return data || [];
}

async function notifySubscribers(newFlavors) {
  if (newFlavors.length === 0 || !resend) return;

  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('confirmed', true);
  if (error) throw error;
  if (!subscriptions || subscriptions.length === 0) return;

  for (const sub of subscriptions) {
    const matchingFlavors = newFlavors.filter(nf => {
      if (sub.locations && sub.locations.length > 0 && !sub.locations.includes(nf.location)) {
        return false;
      }
      return normalizeFlavorName(nf.flavor_name).includes(sub.flavor_pattern);
    });
    if (matchingFlavors.length === 0) continue;

    const loc = (slug) => LOCATIONS.find(l => l.slug === slug);
    const locationLines = matchingFlavors
      .map(f => `<li>${loc(f.location)?.name ?? f.location}: ${f.flavor_name}</li>`)
      .join('');

    const unsubUrl = `${APP_URL}/api/unsubscribe?token=${sub.unsubscribe_token}`;

    try {
      await resend.emails.send({
        from: "Big G's Finder <noreply@jelinson.com>",
        to: sub.email,
        subject: "Big G's Cookies & Dream is available! 🍦",
        html: `
          <h2>🍦 The flavor you're watching just appeared!</h2>
          <ul>${locationLines}</ul>
          <p><a href="${APP_URL}">Check the tracker</a></p>
          <p style="font-size:12px;color:#999"><a href="${unsubUrl}">Unsubscribe</a></p>
        `,
      });
      console.log(`  Notified ${sub.email}`);
    } catch (err) {
      console.error(`  Failed to notify ${sub.email}:`, err.message);
    }
  }
}

async function main() {
  console.log('Starting scrape...');
  for (const location of LOCATIONS) {
    try {
      console.log(`Scraping ${location.name}...`);
      const flavors = await scrapeLocation(location);
      console.log(`  Found ${flavors.length} flavors`);
      await upsertFlavors(location.slug, flavors);
    } catch (err) {
      console.error(`  Error scraping ${location.name}:`, err.message);
    }
  }

  console.log('Checking for new flavors...');
  const newFlavors = await getNewFlavors();
  console.log(`  ${newFlavors.length} new flavor(s) today`);

  if (newFlavors.length > 0) {
    console.log('Notifying subscribers...');
    await notifySubscribers(newFlavors);
  }

  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
