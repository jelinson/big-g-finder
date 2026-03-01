/**
 * Renders email templates to HTML files in email-previews/
 * so you can open them in a browser to visually inspect.
 *
 * Usage: npm run preview-emails
 *        npm run preview-emails -- --flavor "Salted Caramel"
 *        Then open email-previews/*.html in a browser.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { buildConfirmEmail, buildNotifyEmail } from '../lib/emails.js';

const flavorArgIndex = process.argv.indexOf('--flavor');
const flavor = flavorArgIndex !== -1
  ? process.argv[flavorArgIndex + 1]
  : "Big G's Cookies & Dream";

mkdirSync('email-previews', { recursive: true });

const confirm = buildConfirmEmail({
  flavorPattern: flavor,
  confirmUrl: 'https://biggfinder.jelinson.com/api/subscribe?confirm=preview-token',
});
writeFileSync('email-previews/confirm.html', confirm.html);
console.log('Wrote email-previews/confirm.html');

const notify = buildNotifyEmail({
  matchingFlavors: [
    { locationName: 'South Boulder', flavorName: flavor },
    { locationName: 'Louisville', flavorName: flavor },
  ],
  appUrl: 'https://biggfinder.jelinson.com',
  unsubUrl: 'https://biggfinder.jelinson.com/api/unsubscribe?token=preview-token',
});
writeFileSync('email-previews/notify.html', notify.html);
console.log('Wrote email-previews/notify.html');

console.log(`\nFlavor: ${flavor}`);
console.log('Open email-previews/*.html in your browser to preview.');
