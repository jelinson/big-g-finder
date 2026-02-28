import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { normalizeFlavorName } from '../lib/normalize.js';
import { buildConfirmEmail } from '../lib/emails.js';

const APP_URL = process.env.APP_URL || 'https://biggfinder.jelinson.com';

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // GET /api/subscribe?confirm=<token> — confirm a subscription
  if (req.method === 'GET') {
    const { confirm } = req.query;
    if (!confirm) {
      return res.status(400).json({ error: 'confirm token required' });
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({ confirmed: true })
      .eq('confirm_token', confirm);

    if (error) return res.status(500).json({ error: error.message });

    return res.redirect(302, `${APP_URL}/?subscribed=1`);
  }

  // POST /api/subscribe — create a subscription
  if (req.method === 'POST') {
    const { email, flavorPattern, locations } = req.body ?? {};

    if (!email || !flavorPattern) {
      return res.status(400).json({ error: 'email and flavorPattern are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const normalized = normalizeFlavorName(flavorPattern);

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        email,
        flavor_pattern: normalized,
        locations: locations && locations.length > 0 ? locations : null,
      })
      .select('confirm_token')
      .single();

    if (error) {
      if (error.code === '23505') return res.status(200).json({ ok: true }); // duplicate, silent
      return res.status(500).json({ error: error.message });
    }

    const confirmUrl = `${APP_URL}/api/subscribe?confirm=${data.confirm_token}`;
    const emailPayload = buildConfirmEmail({ flavorPattern, confirmUrl });
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ ...emailPayload, to: email });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
