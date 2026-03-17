import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const [locResult, flavorResult] = await Promise.all([
    supabase.from('locations').select('*').eq('active', true),
    supabase.from('flavors').select('location, flavor_name, last_seen').order('last_seen', { ascending: false }),
  ]);

  if (locResult.error) return res.status(500).json({ error: locResult.error.message });
  if (flavorResult.error) return res.status(500).json({ error: flavorResult.error.message });

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

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
  return res.status(200).json({ locations });
}
