import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('<h2>Invalid unsubscribe link.</h2>');
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('unsubscribe_token', token);

  if (error) {
    return res.status(500).send('<h2>Something went wrong. Please try again.</h2>');
  }

  return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed — Big G's Finder</title>
  <style>
    body { font-family: sans-serif; max-width: 480px; margin: 80px auto; text-align: center; color: #3D2817; }
    a { color: #FF6B9D; font-weight: 700; }
  </style>
</head>
<body>
  <h1>🍦 You've been unsubscribed</h1>
  <p>You won't receive any more alerts from Big G's Finder.</p>
  <p><a href="/">Back to the tracker</a></p>
</body>
</html>`);
}
