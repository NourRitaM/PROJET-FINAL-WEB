// Session 21 : "Break it, then harden it". Chaque test lance UNE attaque contre l'API
// et verifie qu'elle est refusee. Avant de corriger un trou, le test correspondant echoue :
// copie la requete et la reponse "avant" dans SECURITY.md, corrige, relance : "apres".
// Avant : cd server && npm run db:seed && npm run dev
import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const api = () => request(API_URL);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

const stamp = Date.now();
const signup = async (name, role) =>
  (await api().post('/api/auth/signup').send({
    name, username: `${name}#${stamp}`, email: `${name}.${stamp}@test.dev`, password: 'hunter22', role,
  })).body;

let orgToken;
let otherOrgToken;
let volToken;
let activityId;
let missionId;

beforeAll(async () => {
  orgToken = (await signup('secOrgA', 'organizer')).token;
  otherOrgToken = (await signup('secOrgB', 'organizer')).token;
  volToken = (await signup('secVol', 'volunteer')).token;

  const res = await api().post('/api/organizer/activities').set(auth(orgToken)).send({
    title: `Security ${stamp}`, description: 'target', date: '2030-06-01',
    time: '10:00', endTime: '11:00', location: 'Lab',
    missions: [{ name: 'Target mission', capacity: 2 }],
  });
  activityId = res.body.id;
  missionId = res.body.missions[0].id;
});

describe('IDOR : agir sur la ressource de quelqu un d autre', () => {
  it("another organizer cannot edit Alice's activity (404)", async () => {
    const res = await api().patch(`/api/organizer/activities/${activityId}`).set(auth(otherOrgToken))
      .send({ title: 'Hacked', description: 'x', location: 'x', date: '2030-06-02', time: '10:00', endTime: '11:00' });
    expect(res.status).toBe(404);
  });

  it("another organizer cannot delete or edit a mission of Alice's activity (404)", async () => {
    const del = await api().delete(`/api/organizer/activities/${activityId}/missions/${missionId}`).set(auth(otherOrgToken));
    const edit = await api().patch(`/api/organizer/activities/${activityId}/missions/${missionId}`).set(auth(otherOrgToken))
      .send({ name: 'Hacked', capacity: 99 });
    expect(del.status).toBe(404);
    expect(edit.status).toBe(404);
  });

  it("a volunteer cannot cancel someone else's registration (404)", async () => {
    const res = await api().delete('/api/registrations/999999').set(auth(volToken));
    expect(res.status).toBe(404);
  });
});

describe('Mass assignment : le body ne decide jamais de l identite ni du role', () => {
  it('signup ignores a forged role like "admin" (400)', async () => {
    const res = await api().post('/api/auth/signup').send({
      name: 'Mallory', username: `mallory${stamp}`, email: `mallory.${stamp}@test.dev`, password: 'hunter22', role: 'admin',
    });
    expect(res.status).toBe(400);
  });

  it('creating an activity ignores a forged organizer_id / status', async () => {
    const res = await api().post('/api/organizer/activities').set(auth(orgToken)).send({
      title: `Forged ${stamp}`, description: 'x', date: '2030-06-03', time: '10:00', endTime: '11:00',
      location: 'x', organizer_id: 1, organizerId: 1, status: 'cancelled',
      missions: [{ name: 'm', capacity: 1 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('active');
    const mine = await api().get('/api/organizer/activities').set(auth(orgToken));
    expect(mine.body.some((a) => a.id === res.body.id)).toBe(true); // elle est bien a MOI
  });
});

describe('Injection : l entree est traitee comme du texte, jamais comme du SQL', () => {
  it('SQL in the location filter returns a normal answer, not an error', async () => {
    const res = await api().get("/api/activities?location=' OR '1'='1").set(auth(volToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('SQL in the login email gives the usual 401, not a 500', async () => {
    const res = await api().post('/api/auth/login').send({ email: "' OR '1'='1", password: 'whatever1' });
    expect(res.status).toBe(401);
  });

  it('an object instead of a string is refused (400)', async () => {
    const res = await api().post('/api/auth/login').send({ email: { $ne: 'x' }, password: { $ne: 'x' } });
    expect(res.status).toBe(400);
  });

  it('an id with SQL in the URL answers 404, not 500', async () => {
    const res = await api().get('/api/activities/1;DROP TABLE users').set(auth(volToken));
    expect(res.status).toBe(404);
  });
});

describe('XSS : le titre est stocke tel quel, le front l affiche comme du texte', () => {
  it('stores the payload as plain text (React escapes it on screen)', async () => {
    const payload = '<img src=x onerror=alert(1)>';
    const res = await api().post('/api/organizer/activities').set(auth(orgToken)).send({
      title: payload, description: 'xss', date: '2030-06-04', time: '10:00', endTime: '11:00',
      location: 'x', missions: [{ name: 'm', capacity: 1 }],
    });
    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toContain('application/json'); // jamais servi comme du HTML
  });
});

describe('Brute force : trop d essais rates -> 429', () => {
  it('20 wrong logins in a row end with a 429', async () => {
    const ip = `198.51.100.${(stamp % 200) + 1}`; // IP propre a ce test (trust proxy)
    const statuses = [];
    for (let i = 0; i < 20; i++) {
      const res = await api().post('/api/auth/login').set('X-Forwarded-For', ip)
        .send({ email: `nobody.${stamp}@test.dev`, password: 'wrongpass1' });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });
});

describe('En-tetes et secrets', () => {
  it('helmet headers are present, X-Powered-By is hidden', async () => {
    const res = await api().get('/api/health');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('the demo routes are gone', async () => {
    const res = await api().get('/api/demo/organizer').set(auth(orgToken));
    expect(res.status).toBe(404);
  });

  it('an error never leaks a stack trace', async () => {
    const res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js|node_modules/);
  });
});
