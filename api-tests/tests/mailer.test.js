import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmail, sendSignupConfirmation, sendActivityCancelled } from '../../server/email/mailer.js';

beforeEach(() => {
  process.env.RESEND_API_KEY = 'test-key';
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
});

describe('mailer', () => {
  it('does not send and does not crash without an API key', async () => {
    delete process.env.RESEND_API_KEY;
    expect(await sendEmail({ to: 'a@b.c', subject: 's', html: 'h' })).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('sends the signup confirmation with the Bearer key and escapes the name', async () => {
    await sendSignupConfirmation({ name: '<b>Eve</b>', email: 'eve@test.dev', role: 'volunteer' });
    const [, options] = globalThis.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(options.headers.Authorization).toBe('Bearer test-key');
    expect(body.to).toBe('eve@test.dev');
    expect(body.html).not.toContain('<b>Eve</b>');
  });

  it('sends one cancellation email per volunteer', async () => {
    await sendActivityCancelled(
      { title: 'Beach cleanup', date: '2026-12-01' },
      [{ name: 'Bob', email: 'bob@test.dev' }, { name: 'Cleo', email: 'cleo@test.dev' }]
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('returns false instead of throwing when Resend fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });
    expect(await sendEmail({ to: 'a@b.c', subject: 's', html: 'h' })).toBe(false);
  });
});
