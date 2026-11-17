// Session 22 : Vitest + supertest. Les regles de la Session 19 / 21 "verrouillees" en tests.
// L'API doit tourner (cd server && npm run dev) : on lui envoie de vraies requetes HTTP.
import request from 'supertest';
import { describe, it, expect } from 'vitest';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const api = () => request(API_URL);

// Email unique a chaque lancement : le test peut etre relance sans nettoyer la base
const stamp = Date.now();
const alice = { name: 'Alice', username: `alice#${stamp}`, phone: '+961 70 123 456', email: `alice.${stamp}@test.dev`, password: 'hunter22', role: 'organizer' };
const bob = { name: 'Bob', username: `bob_${stamp}`, email: `bob.${stamp}@test.dev`, password: 'hunter22', role: 'volunteer' };

let aliceToken;
let bobToken;

describe('GET /api/health', () => {
  it('answers ok', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/auth/signup', () => {
  it('creates an organizer: 201, token and user, never the hash', async () => {
    const res = await api().post('/api/auth/signup').send(alice);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({
      name: 'Alice', username: alice.username, email: alice.email, phone: alice.phone, role: 'organizer',
    });
    expect(res.body.user.password_hash).toBeUndefined();
    aliceToken = res.body.token;
  });

  it('creates a volunteer', async () => {
    const res = await api().post('/api/auth/signup').send(bob);
    expect(res.status).toBe(201);
    bobToken = res.body.token;
  });

  it('rejects the same email with 409', async () => {
    const res = await api().post('/api/auth/signup').send(alice);
    expect(res.status).toBe(409);
  });

  it('rejects a username already taken with 409 (case-insensitive)', async () => {
    const res = await api().post('/api/auth/signup').send({
      ...bob, username: alice.username.toUpperCase(), email: `dup.${stamp}@test.dev`,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Username already taken');
  });

  it('rejects a missing username and a bad phone with 400', async () => {
    const noUser = await api().post('/api/auth/signup').send({ ...bob, username: '', email: `nu.${stamp}@test.dev` });
    const badPhone = await api().post('/api/auth/signup').send({
      ...bob, username: `bp${stamp}`, email: `bp.${stamp}@test.dev`, phone: 'abc',
    });
    expect(noUser.status).toBe(400);
    expect(badPhone.status).toBe(400);
  });

  it('rejects a short password with 400', async () => {
    const res = await api().post('/api/auth/signup').send({ ...bob, username: `short${stamp}`, email: `short.${stamp}@test.dev`, password: '123' });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown role with 400', async () => {
    const res = await api().post('/api/auth/signup').send({ ...bob, username: `role${stamp}`, email: `role.${stamp}@test.dev`, role: 'admin' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token for good credentials', async () => {
    const res = await api().post('/api/auth/login').send({ email: alice.email, password: alice.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('organizer');
  });

  it('gives the same 401 message for a wrong password and an unknown email', async () => {
    const wrongPassword = await api().post('/api/auth/login').send({ email: alice.email, password: 'wrongpass1' });
    const unknownEmail = await api().post('/api/auth/login').send({ email: `nobody.${stamp}@test.dev`, password: 'wrongpass1' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error);
  });
});

describe('GET /api/auth/me', () => {
  it('rejects a missing token with 401', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a tampered token with 401', async () => {
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${aliceToken}x`);
    expect(res.status).toBe(401);
  });

  it('returns the owner of the token', async () => {
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${aliceToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(alice.email);
  });
});

describe('PATCH /api/auth/me and /api/auth/password (My Profile)', () => {
  const asAlice = (r) => r.set('Authorization', `Bearer ${aliceToken}`);

  it('changes phone and email, never returns the hash', async () => {
    const res = await asAlice(api().patch('/api/auth/me')).send({
      phone: '+961 71 999 888', email: `alice2.${stamp}@test.dev`,
    });
    expect(res.status).toBe(200);
    expect(res.body.phone).toBe('+961 71 999 888');
    expect(res.body.email).toBe(`alice2.${stamp}@test.dev`);
    expect(res.body.password_hash).toBeUndefined();
  });

  it("refuses another member's username with 409 but lets me keep mine", async () => {
    const taken = await asAlice(api().patch('/api/auth/me')).send({ username: bob.username });
    expect(taken.status).toBe(409);
    const own = await asAlice(api().patch('/api/auth/me')).send({ username: alice.username });
    expect(own.status).toBe(200);
  });

  it('cannot change the role (ignored)', async () => {
    const res = await asAlice(api().patch('/api/auth/me')).send({ role: 'volunteer', name: 'Alice B' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('organizer');
  });

  it('removes the phone with an empty string', async () => {
    const res = await asAlice(api().patch('/api/auth/me')).send({ phone: '' });
    expect(res.body.phone).toBeNull();
  });

  it('rejects a wrong current password (400) and accepts the right one', async () => {
    const wrong = await asAlice(api().patch('/api/auth/password')).send({ currentPassword: 'nope', newPassword: 'newpass123' });
    expect(wrong.status).toBe(400);
    const ok = await asAlice(api().patch('/api/auth/password')).send({ currentPassword: alice.password, newPassword: 'newpass123' });
    expect(ok.status).toBe(200);
    const login = await api().post('/api/auth/login').send({ email: `alice2.${stamp}@test.dev`, password: 'newpass123' });
    expect(login.status).toBe(200);
  });
});

describe('roles (403 = known but not allowed)', () => {
  it('organizer space: 401 without token', async () => {
    const res = await api().get('/api/organizer/activities');
    expect(res.status).toBe(401);
  });

  it("organizer space: Bob's volunteer token gets 403", async () => {
    const res = await api().get('/api/organizer/activities').set('Authorization', `Bearer ${bobToken}`);
    expect(res.status).toBe(403);
  });

  it("organizer space: Alice's token gets 200", async () => {
    const res = await api().get('/api/organizer/activities').set('Authorization', `Bearer ${aliceToken}`);
    expect(res.status).toBe(200);
  });

  it("my registrations: Alice's organizer token gets 403", async () => {
    const res = await api().get('/api/registrations/mine').set('Authorization', `Bearer ${aliceToken}`);
    expect(res.status).toBe(403);
  });

  it("my registrations: Bob's token gets 200", async () => {
    const res = await api().get('/api/registrations/mine').set('Authorization', `Bearer ${bobToken}`);
    expect(res.status).toBe(200);
  });
});

describe('server robustness', () => {
  it('answers 400 on malformed JSON instead of crashing', async () => {
    const res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
  });

  it('answers 404 on an unknown route', async () => {
    const res = await api().get('/api/nope');
    expect(res.status).toBe(404);
  });

  it('sends secure headers (helmet) and hides X-Powered-By', async () => {
    const res = await api().get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
