import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi, beforeEach } from 'vitest';
import { AuthContext } from '../auth/AuthContext.jsx';
import { ActivityDetailsPage } from './ActivityDetailsPage.jsx';

const activity = {
  id: 3, title: 'Food drive', description: 'Pack boxes.', date: '2026-12-12',
  start_time: '10:00', end_time: '15:00', location: 'Campus Hall', status: 'open',
  missions: [
    { id: 7, title: 'Pack boxes', spots_needed: 4, confirmed_count: 1, waiting_count: 0, spots_left: 3, my_status: null },
  ],
};

beforeEach(() => localStorage.clear());

function setup(role = 'volunteer') {
  render(
    <AuthContext.Provider value={{ user: { name: 'Bob', role } }}>
      <ActivityDetailsPage activityId={3} onBack={() => {}} />
    </AuthContext.Provider>
  );
}

it('shows the activity, its missions and the spots left', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => activity });
  setup();

  expect(await screen.findByText('Food drive')).toBeInTheDocument();
  expect(screen.getByText(/3 spot\(s\) left out of 4/)).toBeInTheDocument();
});

it('registers the volunteer to a mission', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => activity })
    .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ id: 1, status: 'confirmed' }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => activity });
  globalThis.fetch = fetchMock;
  setup();

  await userEvent.click(await screen.findByRole('button', { name: 'Register' }));

  expect(await screen.findByText('You are registered!')).toBeInTheDocument();
  expect(fetchMock.mock.calls[1][0]).toContain('/api/missions/7/register');
});

it('shows the server error on a duplicate registration', async () => {
  globalThis.fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => activity })
    .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: 'You are already registered for this mission' }) });
  setup();

  await userEvent.click(await screen.findByRole('button', { name: 'Register' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('already registered');
});

it('hides the register button for an organizer', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => activity });
  setup('organizer');

  await screen.findByText('Food drive');
  expect(screen.queryByRole('button', { name: 'Register' })).not.toBeInTheDocument();
});
