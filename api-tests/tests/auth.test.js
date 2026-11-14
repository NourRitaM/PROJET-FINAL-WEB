// Session 22 : Vitest + supertest. Les regles de la Session 19 / 21 "verrouillees" en tests.
// L'API doit tourner (cd server && npm run dev) : on lui envoie de vraies requetes HTTP.
import request from 'supertest';
import { describe, it, expect } from 'vitest';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const api = () => request(API_URL);

// Email unique a chaque lancement : le test peut etre relance sans nettoyer la base
const stamp = Date.now();
const alice = { name: 'Alice', email: `alice.${stamp}@test.dev`, password: 'hunter22', role: 'organizer' };
const bob = { name: 'Bob', email: `bob.${stamp}@test.dev`, password: 'hunter22', role: 'volunteer' };

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
    expect(res.body.user).toMatchObject({ name: 'Alice', email: alice.email, role: 'organizer' });
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

  it('rejects a short password with 400', async () => {
    const res = await api().post('/api/auth/signup').send({ ...bob, email: `short.${stamp}@test.dev`, password: '123' });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown role with 400', async () => {
    const res = await api().post('/api/auth/signup').send({ ...bob, email: `role.${stamp}@test.dev`, role: 'admin' });
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

describe('roles (403 = known but not allowed)', () => {
  it('organizer route: 401 without token', async () => {
    const res = await api().get('/api/demo/organizer');
    expect(res.status).toBe(401);
  });

  it("organizer route: Bob's volunteer token gets 403", async () => {
    const res = await api().get('/api/demo/organizer').set('Authorization', `Bearer ${bobToken}`);
    expect(res.status).toBe(403);
  });

  it("organizer route: Alice's token gets 200", async () => {
    const res = await api().get('/api/demo/organizer').set('Authorization', `Bearer ${aliceToken}`);
    expect(res.status).toBe(200);
  });

  it("volunteer route: Alice's organizer token gets 403", async () => {
    const res = await api().get('/api/demo/volunteer').set('Authorization', `Bearer ${aliceToken}`);
    expect(res.status).toBe(403);
  });

  it("volunteer route: Bob's token gets 200", async () => {
    const res = await api().get('/api/demo/volunteer').set('Authorization', `Bearer ${bobToken}`);
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
