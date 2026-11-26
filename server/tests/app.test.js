// Session 22 : tests d'API sans navigateur, sans port, sans base (supertest + app.js).
// Ils verrouillent les regles des Sessions 19 et 21 : 401, 403, 400, 413, 429, en-tetes.
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../app.js';
import { signToken } from '../auth/token.js';

const volunteerToken = signToken({ id: 1, role: 'volunteer' });
const organizerToken = signToken({ id: 2, role: 'organizer' });
const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('public routes', () => {
  it('GET /api/health answers ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('answers 404 on an unknown route', async () => {
    expect((await request(app).get('/api/nope')).status).toBe(404);
  });
});

describe('authentication (401 = no valid token)', () => {
  it.each([
    ['/api/activities'],
    ['/api/registrations/mine'],
    ['/api/organizer/activities'],
    ['/api/auth/me'],
  ])('%s rejects a missing token', async (path) => {
    expect((await request(app).get(path)).status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const res = await request(app).get('/api/activities').set(auth(`${volunteerToken}x`));
    expect(res.status).toBe(401);
  });

  it('rejects a header without the Bearer prefix', async () => {
    const res = await request(app).get('/api/activities').set({ Authorization: volunteerToken });
    expect(res.status).toBe(401);
  });
});

describe('authorization (403 = known user, wrong role)', () => {
  it('a volunteer cannot use the organizer space', async () => {
    const res = await request(app).get('/api/organizer/activities').set(auth(volunteerToken));
    expect(res.status).toBe(403);
  });

  it('an organizer cannot register to a mission', async () => {
    const res = await request(app).post('/api/missions/1/register').set(auth(organizerToken));
    expect(res.status).toBe(403);
  });

  it('an organizer cannot read volunteer registrations', async () => {
    const res = await request(app).get('/api/registrations/mine').set(auth(organizerToken));
    expect(res.status).toBe(403);
  });
});

describe('input validation (400 before the database is touched)', () => {
  const good = { name: 'Eve', username: 'eve#1', email: 'eve@test.dev', password: 'hunter22', role: 'volunteer' };

  it('rejects a username with spaces or too short', async () => {
    for (const username of ['ab', 'has space', '', 42]) {
      const res = await request(app).post('/api/auth/signup').send({ ...good, username });
      expect(res.status).toBe(400);
    }
  });

  it('rejects an invalid phone number', async () => {
    const res = await request(app).post('/api/auth/signup').send({ ...good, phone: 'call me' });
    expect(res.status).toBe(400);
  });

  it('rejects a short password', async () => {
    const res = await request(app).post('/api/auth/signup').send({ ...good, password: '123' });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown role (no self-made admin)', async () => {
    const res = await request(app).post('/api/auth/signup').send({ ...good, role: 'admin' });
    expect(res.status).toBe(400);
  });

  it('rejects an email sent as an object (injection attempt)', async () => {
    const res = await request(app).post('/api/auth/signup').send({ ...good, email: { $ne: 'x' } });
    expect(res.status).toBe(400);
  });

  it('login rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co' });
    expect(res.status).toBe(400);
  });

  it('answers 400 on malformed JSON instead of crashing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
  });

  it('answers 413 when the body is too big', async () => {
    const res = await request(app).post('/api/auth/signup').send({ ...good, name: 'x'.repeat(20_000) });
    expect(res.status).toBe(413);
  });

  it('an organizer activity without missions is refused', async () => {
    const res = await request(app)
      .post('/api/organizer/activities')
      .set(auth(organizerToken))
      .send({ title: 'T', description: 'D', location: 'L', date: '2030-01-01', time: '10:00', endTime: '11:00', missions: [] });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/cron/reminders (protected by CRON_SECRET)', () => {
  it('does not exist when CRON_SECRET is not configured (404)', async () => {
    delete process.env.CRON_SECRET;
    expect((await request(app).post('/api/cron/reminders')).status).toBe(404);
  });

  it('rejects a missing or wrong secret (401), before touching the database', async () => {
    process.env.CRON_SECRET = 'right-secret';
    try {
      expect((await request(app).post('/api/cron/reminders')).status).toBe(401);
      const wrong = await request(app).post('/api/cron/reminders').set('Authorization', 'Bearer wrong-secret');
      expect(wrong.status).toBe(401);
    } finally {
      delete process.env.CRON_SECRET;
    }
  });
});

describe('hardening (Session 21)', () => {
  it('sends secure headers and hides X-Powered-By', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('login is rate limited: 429 after 5 failed attempts', async () => {
    // une IP "propre" a ce test : son compteur n'affecte pas les autres tests
    const ip = '203.0.113.77';
    const statuses = [];
    for (let i = 0; i < 7; i++) {
      const res = await request(app).post('/api/auth/login').set('X-Forwarded-For', ip).send({});
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 400)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});
