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
    expect(buildConfirmEmail(opts).html).toContain("Big G's Cookies & Dream");
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
    expect(buildNotifyEmail(opts).html).toContain("Big G's Cookies & Dream");
  });

  it('includes the unsubscribe URL', () => {
    expect(buildNotifyEmail(opts).html).toContain('unsub-token');
  });

  it('includes the app URL', () => {
    expect(buildNotifyEmail(opts).html).toContain('biggfinder.jelinson.com');
  });

  it('matches snapshot', () => {
    expect(buildNotifyEmail(opts)).toMatchSnapshot();
  });
});
