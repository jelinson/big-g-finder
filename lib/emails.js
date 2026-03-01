const FROM = "Big G's Finder <noreply@biggfinder.jelinson.com>";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @param {{ flavorPattern: string, confirmUrl: string }} opts
 * @returns {{ from: string, subject: string, html: string }}
 */
export function buildConfirmEmail({ flavorPattern, confirmUrl }) {
  return {
    from: FROM,
    subject: "Confirm your Big G's Finder subscription",
    html: `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:500px;margin:40px auto;color:#3D2817">
  <h2>🍦 Confirm your subscription</h2>
  <p>You asked to be notified when <strong>${escapeHtml(flavorPattern)}</strong> is available at Sweet Cow.</p>
  <p style="margin:30px 0">
    <a href="${confirmUrl}"
       style="background:#FF6B9D;color:white;padding:14px 28px;border-radius:25px;text-decoration:none;font-weight:700;font-size:1rem">
      Confirm Subscription
    </a>
  </p>
  <p style="font-size:12px;color:#999">If you didn't request this, you can safely ignore this email.</p>
</body>
</html>`,
  };
}

/**
 * @param {{ matchingFlavors: Array<{locationName:string, flavorName:string}>, appUrl: string, unsubUrl: string }} opts
 * @returns {{ from: string, subject: string, html: string }}
 */
export function buildNotifyEmail({ matchingFlavors, appUrl, unsubUrl }) {
  const locationLines = matchingFlavors
    .map(({ locationName, flavorName }) => `<li>${escapeHtml(locationName)}: ${escapeHtml(flavorName)}</li>`)
    .join('');

  const flavorName = matchingFlavors[0]?.flavorName ?? 'Your flavor';

  return {
    from: FROM,
    subject: `${flavorName} is available! 🍦`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:500px;margin:40px auto;color:#3D2817">
  <h2>🍦 The flavor you're watching just appeared!</h2>
  <ul style="line-height:1.8">${locationLines}</ul>
  <p style="margin:30px 0">
    <a href="${appUrl}"
       style="background:#FF6B9D;color:white;padding:14px 28px;border-radius:25px;text-decoration:none;font-weight:700;font-size:1rem">
      Check the Tracker
    </a>
  </p>
  <p style="font-size:12px;color:#999"><a href="${unsubUrl}" style="color:#999">Unsubscribe</a></p>
</body>
</html>`,
  };
}
