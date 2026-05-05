import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const PAGE_SIZE = 200;

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

  // If page1 is full AND its last row still has today's date, more "today" rows might be on page 2
  if (page1.length === PAGE_SIZE && page1[PAGE_SIZE - 1].last_seen === latestDate) {
    const { data: more, error: moreErr } = await supabase
      .from('flavors').select('location, flavor_name, last_seen')
      .eq('last_seen', latestDate)
      .range(PAGE_SIZE, PAGE_SIZE + 1000);
    if (moreErr) {
      return new Response(JSON.stringify({ error: 'Failed to load flavors' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    todayRows = todayRows.concat(more ?? []);
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
