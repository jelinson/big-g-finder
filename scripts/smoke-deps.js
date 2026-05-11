// Constructs every runtime client we depend on, without making any network
// calls, to surface breaking initialization changes from dependency bumps
// (e.g. supabase-js 2.103.0 requiring native global WebSocket).
//
// Run in CI before tests. Mocked tests do not exercise these import paths.

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

createClient('https://example.supabase.co', 'sb_dummy_key_for_construction_check');
new Resend('re_dummy_key_for_construction_check');

console.log('runtime deps construct cleanly');
