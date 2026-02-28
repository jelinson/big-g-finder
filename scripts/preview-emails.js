/**
 * Renders email templates to HTML files in email-previews/
 * so you can open them in a browser to visually inspect.
 *
 * Usage: npm run preview-emails
 *        Then open email-previews/*.html in a browser.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { buildConfirmEmail, buildNotifyEmail } from '../lib/emails.js';

mkdirSync('email-previews', { recursive: true });

const confirm = buildConfirmEmail({
  flavorPattern: "Big G's Cookies & Dream",
  confirmUrl: 'https://biggfinder.jelinson.com/api/subscribe?confirm=preview-token',
});
writeFileSync('email-previews/confirm.html', confirm.html);
console.log('Wrote email-previews/confirm.html');

const notify = buildNotifyEmail({
  matchingFlavors: [
    { locationName: 'South Boulder', flavorName: "Big G's Cookies & Dream" },
    { locationName: 'Louisville', flavorName: "Big G's Cookies & Dream" },
  ],
  appUrl: 'https://biggfinder.jelinson.com',
  unsubUrl: 'https://biggfinder.jelinson.com/api/unsubscribe?token=preview-token',
});
writeFileSync('email-previews/notify.html', notify.html);
console.log('Wrote email-previews/notify.html');

console.log('\nOpen email-previews/*.html in your browser to preview.');
