import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Tell Vercel not to parse the body — we need the raw bytes for signature verification
export const config = {
  api: { bodyParser: false },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Verify a Resend (Svix) webhook signature.
// Resend signs payloads using HMAC-SHA256 over "{svix-id}.{svix-timestamp}.{rawBody}".
// The secret is base64-encoded and prefixed with "whsec_".
export function verifySignature(rawBody, headers, secret) {
  const msgId        = headers['svix-id'];
  const msgTimestamp = headers['svix-timestamp'];
  const msgSignature = headers['svix-signature'];

  if (!msgId || !msgTimestamp || !msgSignature) return false;

  // Reject replays older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(msgTimestamp, 10)) > 300) return false;

  const secretBytes   = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const signedContent = `${msgId}.${msgTimestamp}.${rawBody}`;
  const expected      = createHmac('sha256', secretBytes).update(signedContent).digest('base64');

  // svix-signature can contain multiple space-separated "v1,<base64>" entries
  return msgSignature.split(' ').some(sig => {
    const value = sig.replace(/^v1,/, '');
    try {
      return timingSafeEqual(Buffer.from(value, 'base64'), Buffer.from(expected, 'base64'));
    } catch {
      return false;
    }
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const rawBody = await getRawBody(req);

  if (!verifySignature(rawBody.toString(), req.headers, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  if (event.type === 'email.bounced' || event.type === 'email.complained') {
    const addresses = event.data?.to ?? [];
    if (addresses.length > 0) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .in('email', addresses);
      if (error) {
        console.error('Failed to remove address after bounce/complaint:', error.message);
        return res.status(500).json({ error: 'Database error' });
      }
      console.log(`Removed ${addresses.length} address(es) due to ${event.type}`);
    }
  }

  return res.status(200).json({ ok: true });
}
