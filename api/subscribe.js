import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { normalizeFlavorName } from '../lib/normalize.js';
import { buildConfirmEmail } from '../lib/emails.js';

const APP_URL = process.env.APP_URL || 'https://biggfinder.jelinson.com';

const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
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

    if (error) return res.status(500).json({ error: error.message });

    return res.redirect(302, `${APP_URL}/?subscribed=1`);
  }

  // POST /api/subscribe — create a subscription
  if (req.method === 'POST') {
    const ip = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
             ?? req.socket?.remoteAddress ?? 'unknown';
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const { email, flavorPattern, locations } = req.body ?? {};

    if (!email || !flavorPattern) {
      return res.status(400).json({ error: 'email and flavorPattern are required' });
    }

    if (email.length > 254 || email.includes('..') || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    if (flavorPattern.length > 200 || /[<>"]/.test(flavorPattern)) {
      return res.status(400).json({ error: 'Invalid flavor name' });
    }

    const validSlug = /^[a-z0-9-]{1,100}$/;
    if (locations && (!Array.isArray(locations) || !locations.every(s => validSlug.test(s)))) {
      return res.status(400).json({ error: 'Invalid locations' });
    }

    const normalized = normalizeFlavorName(flavorPattern);

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        email,
        flavor_pattern: normalized,
        flavor_name: flavorPattern,
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
