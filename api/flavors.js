import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

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

  const [locResult, flavorResult] = await Promise.all([
    supabase.from('locations').select('*').eq('active', true),
    supabase.from('flavors').select('location, flavor_name, last_seen').order('last_seen', { ascending: false }),
  ]);

  if (locResult.error) {
    return new Response(JSON.stringify({ error: locResult.error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (flavorResult.error) {
    return new Response(JSON.stringify({ error: flavorResult.error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const latestDate = flavorResult.data?.[0]?.last_seen ?? null;
  const latestFlavors = latestDate
    ? flavorResult.data.filter(row => row.last_seen === latestDate)
    : [];

  const bySlug = {};
  for (const row of latestFlavors) {
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
