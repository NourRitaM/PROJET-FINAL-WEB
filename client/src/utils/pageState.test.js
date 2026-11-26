import { describe, expect, it } from 'vitest';
import { pathFor, routeFromPath, visibleRoute } from './pageState.js';

const volunteer = { id: 1, role: 'volunteer' };
const organizer = { id: 2, role: 'organizer' };

describe('routeFromPath / pathFor', () => {
  it('reads the page from the address, so a refresh stays on the same page', () => {
    expect(routeFromPath('/my-registrations')).toEqual({ page: 'registrations', activityId: null });
    expect(routeFromPath('/organizer/create/')).toEqual({ page: 'organizer-create', activityId: null });
  });

  it('reads the activity id from /activities/:id', () => {
    expect(routeFromPath('/activities/12')).toEqual({ page: 'activity', activityId: '12' });
    expect(pathFor({ page: 'activity', activityId: '12' })).toBe('/activities/12');
  });

  it('sends an unknown address to the home page', () => {
    expect(routeFromPath('/unknown')).toEqual({ page: 'home', activityId: null });
    expect(routeFromPath('/activities/abc')).toEqual({ page: 'home', activityId: null });
  });

  it('gives every page an address, and the address leads back to the same page', () => {
    for (const page of ['home', 'login', 'signup', 'profile', 'activities', 'registrations',
      'organizer', 'organizer-create', 'organizer-activities']) {
      expect(routeFromPath(pathFor({ page, activityId: null })).page).toBe(page);
    }
  });
});

describe('visibleRoute', () => {
  it('a visitor who is not logged in only sees home, login and signup', () => {
    expect(visibleRoute(null, { page: 'activities', activityId: null }).page).toBe('home');
    expect(visibleRoute(null, { page: 'signup', activityId: null }).page).toBe('signup');
  });

  it('a volunteer cannot open the organizer pages', () => {
    expect(visibleRoute(volunteer, { page: 'organizer-create', activityId: null }).page).toBe('activities');
    expect(visibleRoute(volunteer, { page: 'activity', activityId: '7' })).toEqual({ page: 'activity', activityId: '7' });
  });

  it('an organizer cannot open the volunteer pages', () => {
    expect(visibleRoute(organizer, { page: 'registrations', activityId: null }).page).toBe('organizer');
    expect(visibleRoute(organizer, { page: 'organizer-activities', activityId: null }).page).toBe('organizer-activities');
  });
});
