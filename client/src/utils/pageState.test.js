import { beforeEach, expect, it } from 'vitest';
import { getStoredPage, storePage } from './pageState.js';

beforeEach(() => {
  sessionStorage.clear();
});

it('restores the last valid page after a reload', () => {
  storePage('activities');

  expect(getStoredPage()).toBe('activities');
});

it('starts at home when the saved page is invalid', () => {
  sessionStorage.setItem('vo-current-page', '/unknown');

  expect(getStoredPage()).toBe('home');
});
