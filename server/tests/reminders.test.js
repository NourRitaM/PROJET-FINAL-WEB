// Rappels 1-2 jours avant l'activite (email/reminders.js), sans base de donnees :
// on remplace query() par un faux qui renvoie des lignes, et fetch (Resend) par un faux.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/pool.js', () => ({ query: vi.fn(), pool: {} }));
const { query } = await import('../db/pool.js');
const { sendDueReminders } = await import('../email/reminders.js');

const due = (id, email) => ({
  id, name: 'Eve', email, mission_title: 'Pack boxes', activity_title: 'Food drive',
  date: '2026-12-12', start_time: '10:00', end_time: '15:00', location: 'Campus Hall',
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = 'test-key';
});

describe('sendDueReminders', () => {
  it('does nothing without a Resend key (nothing is marked as sent)', async () => {
    delete process.env.RESEND_API_KEY;
    expect(await sendDueReminders()).toMatchObject({ due: 0, sent: 0 });
    expect(query).not.toHaveBeenCalled();
  });

  it('only picks confirmed, not-yet-reminded registrations 1 to 2 days before the activity', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await sendDueReminders();
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("r.status = 'confirmed'");
    expect(sql).toContain('r.reminder_sent_at IS NULL');
    expect(sql).toContain("a.status = 'open'");
    expect(sql).toContain('BETWEEN 1 AND $1');
    expect(params).toEqual([2]);
  });

  it('sends one email per due registration', async () => {
    query.mockResolvedValueOnce({ rows: [due(1, 'eve@test.dev'), due(2, 'bob@test.dev')] });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

    expect(await sendDueReminders()).toEqual({ due: 2, sent: 2 });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body.to).toBe('eve@test.dev');
    expect(body.subject).toBe('Reminder: Food drive on 2026-12-12');
  });

  it('a failed email is put back as "not sent" so the next run retries it', async () => {
    query.mockResolvedValueOnce({ rows: [due(7, 'eve@test.dev')] }).mockResolvedValueOnce({ rows: [] });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });

    expect(await sendDueReminders()).toEqual({ due: 1, sent: 0 });
    expect(query).toHaveBeenLastCalledWith(
      'UPDATE registrations SET reminder_sent_at = NULL WHERE id = $1', [7]
    );
  });
});
