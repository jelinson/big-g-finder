import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const PAGE_SIZE = 200;
// Safety ceiling for a single-date refetch. Realistic max is ~10–15 locations × ~10 flavors
// (≤150 rows); 5000 leaves >30x headroom while still bounding the worst case.
const MAX_TODAY_ROWS = 5000;

export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const [locResult, flavorPage1] = await Promise.all([
    supabase.from('locations').select('*').eq('active', true),
    supabase.from('flavors').select('location, flavor_name, last_seen')
      .order('last_seen', { ascending: false })
      .limit(PAGE_SIZE),
  ]);

  if (locResult.error || flavorPage1.error) {
    return new Response(JSON.stringify({ error: 'Failed to load flavors' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const page1 = flavorPage1.data ?? [];
  const latestDate = page1[0]?.last_seen ?? null;
  let todayRows = latestDate ? page1.filter(r => r.last_seen === latestDate) : [];

  // If page 1 filled and every row shares the latest date, there may be more "today" rows we
  // didn't see. Refetch the whole date in a single .eq() query and replace todayRows entirely —
  // we don't merge with page 1 because tie-breaking on equal last_seen isn't stable across two
  // queries, which would yield duplicates or skipped rows under offset pagination.
  if (page1.length === PAGE_SIZE && page1[PAGE_SIZE - 1].last_seen === latestDate) {
    const { data: all, error: moreErr } = await supabase
      .from('flavors').select('location, flavor_name, last_seen')
      .eq('last_seen', latestDate)
      .limit(MAX_TODAY_ROWS);
    if (moreErr) {
      return new Response(JSON.stringify({ error: 'Failed to load flavors' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    todayRows = all ?? [];
  }

  const bySlug = {};
  for (const row of todayRows) {
    if (!bySlug[row.location]) bySlug[row.location] = [];
    bySlug[row.location].push(row.flavor_name);
  }

  const locations = (locResult.data || []).map(loc => ({
    slug: loc.slug,
    name: loc.name,
    url: loc.url,
    address: loc.address,
    flavors: bySlug[loc.slug] || [],
  }));

  return new Response(JSON.stringify({ locations }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=600',
    },
  });
}
