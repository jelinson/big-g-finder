import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const APP_URL = process.env.APP_URL || 'https://biggfinder.jelinson.com';

function normalizeFlavorName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/big\s*g[''']?s?/i, 'bigg')
    .replace(/gigantic[''']?s?/i, 'gigantic')
    .replace(/cookie[s]?/i, 'cookie')
    .replace(/dream[s]?/i, 'dream');
}

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

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.redirect(302, `${APP_URL}/?subscribed=1`);
  }

  // POST /api/subscribe — create a subscription
  if (req.method === 'POST') {
    const { email, flavorPattern, locations } = req.body ?? {};

    if (!email || !flavorPattern) {
      return res.status(400).json({ error: 'email and flavorPattern are required' });
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
      // Duplicate subscription — return success silently to avoid enumeration
      if (error.code === '23505') {
        return res.status(200).json({ ok: true });
      }
      return res.status(500).json({ error: error.message });
    }

    const confirmUrl = `${APP_URL}/api/subscribe?confirm=${data.confirm_token}`;
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "Big G's Finder <noreply@jelinson.com>",
      to: email,
      subject: "Confirm your Big G's Finder subscription",
      html: `
        <h2>🍦 Confirm your subscription</h2>
        <p>You asked to be notified when <strong>${flavorPattern}</strong> is available at Sweet Cow.</p>
        <p><a href="${confirmUrl}" style="background:#FF6B9D;color:white;padding:12px 24px;border-radius:25px;text-decoration:none;font-weight:700">Confirm Subscription</a></p>
        <p style="font-size:12px;color:#999">If you didn't request this, you can ignore this email.</p>
      `,
    });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
