// Tests d'integration : partie organisateur + lien avec la partie benevole.
// Avant : cd server && npm run db:seed && npm run dev
// Chaque test cree ses propres comptes (emails uniques) : le fichier est relancable.
import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const api = () => request(API_URL);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

const stamp = Date.now();
// Une date toujours dans le futur (les tests ne "perimeront" jamais)
const inDays = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const signup = async (name, role) =>
  (await api().post('/api/auth/signup').send({
    name, username: `${name}#${stamp}`, email: `${name}.${stamp}@test.dev`, password: 'hunter22', role,
  })).body.token;

const activityBody = (overrides = {}) => ({
  title: `Org test ${stamp}`,
  description: 'Created by the API tests',
  date: inDays(30),
  time: '10:00',
  endTime: '12:00',
  location: 'Test Hall',
  missions: [{ name: 'Only mission', capacity: 1 }],
  ...overrides,
});

let orgToken;
let otherOrgToken;
let vol1Token;
let vol2Token;
let activityId;
let missionId;

beforeAll(async () => {
  orgToken = await signup('orgA', 'organizer');
  otherOrgToken = await signup('orgB', 'organizer');
  vol1Token = await signup('volOne', 'volunteer');
  vol2Token = await signup('volTwo', 'volunteer');
});

describe('Organizer access', () => {
  it('needs a token (401)', async () => {
    expect((await api().get('/api/organizer/activities')).status).toBe(401);
  });

  it('is forbidden to a volunteer (403)', async () => {
    const res = await api().get('/api/organizer/activities').set(auth(vol1Token));
    expect(res.status).toBe(403);
  });
});

describe('Create an activity', () => {
  it('rejects an activity without mission (400)', async () => {
    const res = await api().post('/api/organizer/activities').set(auth(orgToken))
      .send(activityBody({ missions: [] }));
    expect(res.status).toBe(400);
  });

  it('rejects an end time before the start time (400)', async () => {
    const res = await api().post('/api/organizer/activities').set(auth(orgToken))
      .send(activityBody({ time: '12:00', endTime: '10:00' }));
    expect(res.status).toBe(400);
  });

  it('creates an activity with its mission (201)', async () => {
    const res = await api().post('/api/organizer/activities').set(auth(orgToken)).send(activityBody());
    expect(res.status).toBe(201);
    expect(res.body.missions).toHaveLength(1);
    activityId = res.body.id;
    missionId = res.body.missions[0].id;
  });

  it('lists it in the organizer dashboard', async () => {
    const res = await api().get('/api/organizer/activities').set(auth(orgToken));
    expect(res.status).toBe(200);
    expect(res.body.some((a) => a.id === activityId)).toBe(true);
  });

  it("does not show it to another organizer", async () => {
    const res = await api().get('/api/organizer/activities').set(auth(otherOrgToken));
    expect(res.body.some((a) => a.id === activityId)).toBe(false);
  });
});

describe('Link organizer <-> volunteer', () => {
  it('the volunteer sees the new activity with the spots left per mission', async () => {
    const res = await api().get('/api/activities').set(auth(vol1Token));
    const found = res.body.find((a) => a.id === activityId);
    expect(found).toBeTruthy();
    expect(found.missions[0]).toMatchObject({ spots_needed: 1, spots_left: 1 });
  });

  it('the first volunteer is confirmed, the second goes on the waiting list', async () => {
    const r1 = await api().post(`/api/missions/${missionId}/register`).set(auth(vol1Token));
    const r2 = await api().post(`/api/missions/${missionId}/register`).set(auth(vol2Token));
    expect(r1.body.status).toBe('confirmed');
    expect(r2.body.status).toBe('waiting');
  });

  it('the organizer sees only the confirmed volunteer', async () => {
    const res = await api().get('/api/organizer/activities').set(auth(orgToken));
    const mission = res.body.find((a) => a.id === activityId).missions[0];
    expect(mission.registrations).toHaveLength(1);
  });

  it('refuses a capacity lower than the confirmed volunteers (409)', async () => {
    const res = await api().patch(`/api/organizer/activities/${activityId}/missions/${missionId}`)
      .set(auth(orgToken)).send({ name: 'Only mission', capacity: 0 });
    expect([400, 409]).toContain(res.status);
  });

  it('raising the capacity promotes the volunteer on the waiting list', async () => {
    const res = await api().patch(`/api/organizer/activities/${activityId}/missions/${missionId}`)
      .set(auth(orgToken)).send({ name: 'Only mission', capacity: 2 });
    expect(res.status).toBe(204);

    const mine = await api().get('/api/registrations/mine').set(auth(vol2Token));
    expect(mine.body.find((r) => r.mission_id === missionId).status).toBe('confirmed');
  });
});

describe('Cancel an activity', () => {
  it("another organizer cannot cancel it (404)", async () => {
    const res = await api().patch(`/api/organizer/activities/${activityId}`)
      .set(auth(otherOrgToken)).send({ status: 'cancelled' });
    expect(res.status).toBe(404);
  });

  it('the organizer cancels it (204)', async () => {
    const res = await api().patch(`/api/organizer/activities/${activityId}`)
      .set(auth(orgToken)).send({ status: 'cancelled' });
    expect(res.status).toBe(204);
  });

  it('a cancelled activity disappears from the volunteer list', async () => {
    const res = await api().get('/api/activities').set(auth(vol1Token));
    expect(res.body.some((a) => a.id === activityId)).toBe(false);
  });

  it('the volunteer still sees it as cancelled in "my registrations"', async () => {
    const res = await api().get('/api/registrations/mine').set(auth(vol1Token));
    expect(res.body.find((r) => r.mission_id === missionId).activity_status).toBe('cancelled');
  });

  it('cancelling twice answers 404', async () => {
    const res = await api().patch(`/api/organizer/activities/${activityId}`)
      .set(auth(orgToken)).send({ status: 'cancelled' });
    expect(res.status).toBe(404);
  });
});

describe('Upcoming activities only', () => {
  it('a past activity is not listed to volunteers', async () => {
    const created = await api().post('/api/organizer/activities').set(auth(orgToken))
      .send(activityBody({ title: `Past ${stamp}`, date: '2020-01-01' }));
    expect(created.status).toBe(201);

    const res = await api().get('/api/activities').set(auth(vol1Token));
    expect(res.body.some((a) => a.id === created.body.id)).toBe(false);

    // nettoyage
    await api().patch(`/api/organizer/activities/${created.body.id}`)
      .set(auth(orgToken)).send({ status: 'cancelled' });
  });
});
