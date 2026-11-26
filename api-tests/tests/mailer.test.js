import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendEmail, sendSignupConfirmation, sendActivityCancelled, sendMissionRegistered, sendMissionReminder,
} from '../../server/email/mailer.js';

const mission = {
  name: 'Eve', email: 'eve@test.dev', status: 'confirmed',
  mission_title: 'Pack boxes', activity_title: 'Food drive',
  date: '2026-12-12', start_time: '10:00', end_time: '15:00', location: 'Campus Hall',
  cancel_deadline: '2026-12-10',
};
const sentBody = () => JSON.parse(globalThis.fetch.mock.calls[0][1].body);

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

  it('confirms a mission registration with the date, place and cancel deadline', async () => {
    await sendMissionRegistered(mission);
    const body = sentBody();
    expect(body.to).toBe('eve@test.dev');
    expect(body.subject).toBe('You are registered: Food drive');
    expect(body.html).toContain('2026-12-12 · 10:00 – 15:00 · Campus Hall');
    expect(body.html).toContain('until 2026-12-10');
  });

  it('tells a volunteer on the waiting list that they are waiting', async () => {
    await sendMissionRegistered({ ...mission, status: 'waiting' });
    const body = sentBody();
    expect(body.subject).toBe('Waiting list: Food drive');
    expect(body.html).not.toContain('until 2026-12-10');
  });

  it('sends the reminder and escapes text written by users', async () => {
    await sendMissionReminder({ ...mission, activity_title: '<script>x</script>' });
    const body = sentBody();
    expect(body.html).not.toContain('<script>');
    expect(body.html).toContain('&lt;script&gt;');
  });
});
