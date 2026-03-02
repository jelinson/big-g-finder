import { describe, it, expect } from 'vitest';
import { buildConfirmEmail, buildNotifyEmail } from '../lib/emails.js';

describe('buildConfirmEmail', () => {
  const opts = {
    flavorPattern: "Big G's Cookies & Dream",
    confirmUrl: 'https://biggfinder.jelinson.com/api/subscribe?confirm=test-token-123',
  };

  it('sends from biggfinder.jelinson.com', () => {
    expect(buildConfirmEmail(opts).from).toContain('biggfinder.jelinson.com');
  });

  it('includes the flavor name in the HTML', () => {
    expect(buildConfirmEmail(opts).html).toContain("Big G&#39;s Cookies &amp; Dream");
  });

  it('includes the confirm URL in the HTML', () => {
    expect(buildConfirmEmail(opts).html).toContain('test-token-123');
  });

  it('has a subject line', () => {
    expect(buildConfirmEmail(opts).subject).toBeTruthy();
  });

  it('matches snapshot', () => {
    expect(buildConfirmEmail(opts)).toMatchSnapshot();
  });

  it('works for a different flavor (Salted Caramel)', () => {
    const saltedOpts = {
      flavorPattern: 'Salted Caramel',
      confirmUrl: 'https://biggfinder.jelinson.com/api/subscribe?confirm=salted-token',
    };
    const email = buildConfirmEmail(saltedOpts);
    expect(email.html).toContain('Salted Caramel');
    expect(email.html).toContain('salted-token');
    expect(email.html).not.toContain("Big G");
  });
});

describe('buildNotifyEmail', () => {
  const opts = {
    matchingFlavors: [
      { locationName: 'South Boulder', flavorName: "Big G's Cookies & Dream" },
      { locationName: 'Louisville', flavorName: "Big G's Cookies & Dream" },
    ],
    appUrl: 'https://biggfinder.jelinson.com',
    unsubUrl: 'https://biggfinder.jelinson.com/api/unsubscribe?token=unsub-token',
  };

  it('sends from biggfinder.jelinson.com', () => {
    expect(buildNotifyEmail(opts).from).toContain('biggfinder.jelinson.com');
  });

  it('includes all location names in HTML', () => {
    const { html } = buildNotifyEmail(opts);
    expect(html).toContain('South Boulder');
    expect(html).toContain('Louisville');
  });

  it('includes the flavor name in HTML', () => {
    expect(buildNotifyEmail(opts).html).toContain("Big G&#39;s Cookies &amp; Dream");
  });

  it('includes the unsubscribe URL', () => {
    expect(buildNotifyEmail(opts).html).toContain('unsub-token');
  });

  it('includes the app URL', () => {
    expect(buildNotifyEmail(opts).html).toContain('biggfinder.jelinson.com');
  });

  it("tracker link omits flavor param for Big G's (default flavor)", () => {
    const { html } = buildNotifyEmail(opts);
    expect(html).toContain('href="https://biggfinder.jelinson.com"');
    expect(html).not.toContain('?flavor=');
  });

  it('tracker link includes flavor param for a non-default flavor', () => {
    const saltedOpts = {
      matchingFlavors: [{ locationName: 'South Boulder', flavorName: 'Salted Caramel' }],
      appUrl: 'https://biggfinder.jelinson.com',
      unsubUrl: 'https://biggfinder.jelinson.com/api/unsubscribe?token=salted-unsub',
    };
    expect(buildNotifyEmail(saltedOpts).html).toContain(
      'href="https://biggfinder.jelinson.com?flavor=Salted%20Caramel"'
    );
  });

  it('matches snapshot', () => {
    expect(buildNotifyEmail(opts)).toMatchSnapshot();
  });

  it('works for a different flavor (Salted Caramel)', () => {
    const saltedOpts = {
      matchingFlavors: [
        { locationName: 'South Boulder', flavorName: 'Salted Caramel' },
        { locationName: 'North Boulder', flavorName: 'Salted Caramel' },
      ],
      appUrl: 'https://biggfinder.jelinson.com',
      unsubUrl: 'https://biggfinder.jelinson.com/api/unsubscribe?token=salted-unsub',
    };
    const { html } = buildNotifyEmail(saltedOpts);
    expect(html).toContain('Salted Caramel');
    expect(html).toContain('South Boulder');
    expect(html).toContain('North Boulder');
    expect(html).toContain('salted-unsub');
  });
});
