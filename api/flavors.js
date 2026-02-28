import { createClient } from '@supabase/supabase-js';

const LOCATIONS = [
  { slug: 'south-boulder',       name: 'South Boulder',       url: 'https://sweetcow.com/south-boulder/',        address: '669 South Broadway, Boulder' },
  { slug: 'north-boulder',       name: 'North Boulder',       url: 'https://sweetcow.com/north-boulder/',        address: '2628 Broadway, Boulder' },
  { slug: 'louisville',          name: 'Louisville',          url: 'https://sweetcow.com/louisville/',           address: '637 Front Street, Louisville' },
  { slug: 'longmont',            name: 'Longmont',            url: 'https://sweetcow.com/longmont/',             address: '600 Longs Peak Ave, Longmont' },
  { slug: 'highlands',           name: 'Highlands',           url: 'https://sweetcow.com/highlands/',            address: '3475 West 32nd Ave, Denver' },
  { slug: 'stanley-marketplace', name: 'Stanley Marketplace', url: 'https://sweetcow.com/stanley-marketplace/', address: '2501 Dallas Street, Aurora' },
  { slug: 'platt-park',          name: 'Platt Park',          url: 'https://sweetcow.com/denver-platt-park/',   address: '1882 South Pearl St, Denver' },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('flavors')
    .select('location, flavor_name')
    .eq('last_seen', today);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Group flavors by location slug
  const bySlug = {};
  for (const row of data || []) {
    if (!bySlug[row.location]) bySlug[row.location] = [];
    bySlug[row.location].push(row.flavor_name);
  }

  const locations = LOCATIONS.map(loc => ({
    slug: loc.slug,
    name: loc.name,
    url: loc.url,
    address: loc.address,
    flavors: bySlug[loc.slug] || [],
  }));

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
  return res.status(200).json({ locations });
}
