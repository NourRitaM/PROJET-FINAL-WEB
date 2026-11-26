// Session 22 : tests d'integration de la partie benevole.
// Avant : cd server && npm run db:seed && npm run dev
// Le test nettoie apres lui (il annule ses inscriptions), donc il est relancable.
import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const api = () => request(API_URL);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

const stamp = Date.now();
const makeVolunteer = (name) => ({
  name, username: `${name}_${stamp}`, email: `${name}.${stamp}@test.dev`, password: 'hunter22', role: 'volunteer',
});

let carolToken;
let daveToken;
let organizerToken;
let soloMissionId; // mission a 1 seule place (creee par db:seed)
let foodDriveId;

beforeAll(async () => {
  carolToken = (await api().post('/api/auth/signup').send(makeVolunteer('carol'))).body.token;
  daveToken = (await api().post('/api/auth/signup').send(makeVolunteer('dave'))).body.token;
  organizerToken = (await api().post('/api/auth/login')
    .send({ email: 'seed.organizer@test.dev', password: 'hunter22' })).body.token;

  const list = await api().get('/api/activities').set(auth(carolToken));
  foodDriveId = list.body.find((a) => a.title === 'Food drive')?.id;
  const details = await api().get(`/api/activities/${foodDriveId}`).set(auth(carolToken));
  soloMissionId = details.body.missions.find((m) => m.title === 'Solo mission')?.id;
});

describe('GET /api/activities', () => {
  it('needs a token (401)', async () => {
    expect((await api().get('/api/activities')).status).toBe(401);
  });

  it('lists open activities', async () => {
    const res = await api().get('/api/activities').set(auth(carolToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  it('shows the spots left for each mission', async () => {
    const res = await api().get('/api/activities').set(auth(carolToken));
    const food = res.body.find((a) => a.title === 'Food drive');
    expect(food.missions.length).toBeGreaterThan(0);
    expect(food.missions[0]).toHaveProperty('spots_left');
    expect(food.missions[0]).toHaveProperty('spots_needed');
  });

  it('filters by date', async () => {
    // la date du seed est calculee (J+14) : on la lit dans la liste au lieu de l'ecrire en dur
    const all = await api().get('/api/activities').set(auth(carolToken));
    const beachDate = all.body.find((a) => a.title === 'Beach cleanup').date;
    const res = await api().get(`/api/activities?date=${beachDate}`).set(auth(carolToken));
    expect(res.status).toBe(200);
    expect(res.body.every((a) => a.date === beachDate)).toBe(true);
    expect(res.body.some((a) => a.title === 'Beach cleanup')).toBe(true);
  });

  it('filters by location (partial, case-insensitive)', async () => {
    const res = await api().get('/api/activities?location=library').set(auth(carolToken));
    expect(res.status).toBe(200);
    expect(res.body.some((a) => a.title === 'Library help')).toBe(true);
    expect(res.body.some((a) => a.title === 'Beach cleanup')).toBe(false);
  });

  it('rejects a bad date with 400', async () => {
    expect((await api().get('/api/activities?date=hello').set(auth(carolToken))).status).toBe(400);
  });
});

describe('GET /api/activities/:id', () => {
  it('returns the activity with its missions and spots left', async () => {
    const res = await api().get(`/api/activities/${foodDriveId}`).set(auth(carolToken));
    expect(res.status).toBe(200);
    expect(res.body.missions[0]).toHaveProperty('spots_left');
  });

  it('answers 404 for an unknown id', async () => {
    expect((await api().get('/api/activities/999999').set(auth(carolToken))).status).toBe(404);
  });
});

describe('Register, duplicate, full mission, cancel, promotion', () => {
  let carolRegId;
  let daveRegId;

  it('forbids an organizer from registering (403)', async () => {
    const res = await api().post(`/api/missions/${soloMissionId}/register`).set(auth(organizerToken));
    expect(res.status).toBe(403);
  });

  it('confirms the first volunteer (201)', async () => {
    const res = await api().post(`/api/missions/${soloMissionId}/register`).set(auth(carolToken));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('confirmed');
    carolRegId = res.body.id;
  });

  it('rejects a duplicate registration (409)', async () => {
    const res = await api().post(`/api/missions/${soloMissionId}/register`).set(auth(carolToken));
    expect(res.status).toBe(409);
  });

  it('puts the next volunteer on the waiting list when the mission is full', async () => {
    const res = await api().post(`/api/missions/${soloMissionId}/register`).set(auth(daveToken));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('waiting');
    daveRegId = res.body.id;
  });

  it('answers 404 for an unknown mission', async () => {
    const res = await api().post('/api/missions/999999/register').set(auth(carolToken));
    expect(res.status).toBe(404);
  });

  it('lists my registrations with the waiting position', async () => {
    const res = await api().get('/api/registrations/mine').set(auth(daveToken));
    expect(res.status).toBe(200);
    const mine = res.body.find((r) => r.id === daveRegId);
    expect(mine.status).toBe('waiting');
    expect(mine.waiting_position).toBe(1);
  });

  it("refuses to cancel someone else's registration (404)", async () => {
    const res = await api().delete(`/api/registrations/${carolRegId}`).set(auth(daveToken));
    expect(res.status).toBe(404);
  });

  it('cancelling a confirmed registration promotes the first waiting volunteer', async () => {
    const res = await api().delete(`/api/registrations/${carolRegId}`).set(auth(carolToken));
    expect(res.status).toBe(200);
    expect(res.body.promoted).toBe(true);

    const mine = await api().get('/api/registrations/mine').set(auth(daveToken));
    expect(mine.body.find((r) => r.id === daveRegId).status).toBe('confirmed');
  });

  it('cleans up: Dave cancels, nobody is waiting so nothing is promoted', async () => {
    const res = await api().delete(`/api/registrations/${daveRegId}`).set(auth(daveToken));
    expect(res.status).toBe(200);
    expect(res.body.promoted).toBe(false);
  });
});

// Le seed contient "Food drive" (J+21, 10:00-15:00) et "Library help" (J+21, 14:00-17:00) :
// elles se chevauchent. "Beach cleanup" est un autre jour.
describe('No two missions at the same time', () => {
  let erinToken;
  const regIds = [];

  it('setup: Erin registers to a Food drive mission (201)', async () => {
    erinToken = (await api().post('/api/auth/signup').send(makeVolunteer('erin'))).body.token;
    const details = await api().get(`/api/activities/${foodDriveId}`).set(auth(erinToken));
    const packBoxesId = details.body.missions.find((m) => m.title === 'Pack boxes').id;
    const res = await api().post(`/api/missions/${packBoxesId}/register`).set(auth(erinToken));
    expect(res.status).toBe(201);
    regIds.push(res.body.id);
  });

  it('refuses a mission that overlaps in time, same day (409)', async () => {
    const list = await api().get('/api/activities').set(auth(erinToken));
    const libraryId = list.body.find((a) => a.title === 'Library help').id;
    const details = await api().get(`/api/activities/${libraryId}`).set(auth(erinToken));
    const res = await api().post(`/api/missions/${details.body.missions[0].id}/register`).set(auth(erinToken));
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('same time');
  });

  it('accepts a mission on another day (201)', async () => {
    const list = await api().get('/api/activities').set(auth(erinToken));
    const beachId = list.body.find((a) => a.title === 'Beach cleanup').id;
    const details = await api().get(`/api/activities/${beachId}`).set(auth(erinToken));
    const res = await api().post(`/api/missions/${details.body.missions[0].id}/register`).set(auth(erinToken));
    expect(res.status).toBe(201);
    regIds.push(res.body.id);
  });

  it('cleans up', async () => {
    for (const id of regIds) {
      expect((await api().delete(`/api/registrations/${id}`).set(auth(erinToken))).status).toBe(200);
    }
  });
});

// Regle de l'equipe (server/rules.js) : un benevole confirme peut quitter une mission
// jusqu'a 2 jours avant l'activite. Apres : 409 et rien n'est supprime.
describe('Cancel deadline: 2 days before the activity', () => {
  const inDays = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  let frankToken;
  let soonActivityId;
  let laterActivityId;
  let soonRegId;
  let laterRegId;

  const createActivity = async (days) => {
    const res = await api().post('/api/organizer/activities').set(auth(organizerToken)).send({
      title: `Deadline test J+${days} ${stamp}`, description: 'Created by the API tests',
      date: inDays(days), time: '08:00', endTime: '09:00', location: 'Test Hall',
      missions: [{ name: 'Helper', capacity: 3 }],
    });
    expect(res.status).toBe(201);
    return res.body.id;
  };
  const registerToFirstMission = async (activityId) => {
    const details = await api().get(`/api/activities/${activityId}`).set(auth(frankToken));
    const res = await api().post(`/api/missions/${details.body.missions[0].id}/register`).set(auth(frankToken));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('confirmed');
    return res.body.id;
  };

  it('setup: Frank registers to an activity tomorrow and one in 10 days', async () => {
    frankToken = (await api().post('/api/auth/signup').send(makeVolunteer('frank'))).body.token;
    soonActivityId = await createActivity(1);
    laterActivityId = await createActivity(10);
    soonRegId = await registerToFirstMission(soonActivityId);
    laterRegId = await registerToFirstMission(laterActivityId);
  });

  it('refuses to cancel less than 2 days before the activity (409), registration kept', async () => {
    const res = await api().delete(`/api/registrations/${soonRegId}`).set(auth(frankToken));
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Too late to cancel');
    const mine = await api().get('/api/registrations/mine').set(auth(frankToken));
    expect(mine.body.some((r) => r.id === soonRegId)).toBe(true);
  });

  it('still allows cancelling 2 days or more before the activity (200)', async () => {
    const res = await api().delete(`/api/registrations/${laterRegId}`).set(auth(frankToken));
    expect(res.status).toBe(200);
  });

  it('cleans up: both test activities are cancelled', async () => {
    for (const id of [soonActivityId, laterActivityId]) {
      const res = await api().patch(`/api/organizer/activities/${id}`)
        .set(auth(organizerToken)).send({ status: 'cancelled' });
      expect(res.status).toBe(204);
    }
  });
});

describe('Search by activity name', () => {
  it('filters by title (partial, case-insensitive)', async () => {
    const res = await api().get('/api/activities?title=BEACH').set(auth(carolToken));
    expect(res.status).toBe(200);
    expect(res.body.every((a) => a.title.toLowerCase().includes('beach'))).toBe(true);
  });
});
