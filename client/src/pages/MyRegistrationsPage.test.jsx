import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi, beforeEach } from 'vitest';
import { MyRegistrationsPage } from './MyRegistrationsPage.jsx';

const registrations = [
  {
    id: 1, status: 'waiting', waiting_position: 2, mission_id: 5, mission_title: 'Solo mission',
    activity_id: 3, activity_title: 'Food drive', activity_status: 'open',
    date: '2026-12-12', start_time: '10:00', end_time: '15:00', location: 'Campus Hall',
  },
];

beforeEach(() => localStorage.clear());

it('shows my registrations with the waiting position', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => registrations });
  render(<MyRegistrationsPage />);

  expect(await screen.findByText('Solo mission')).toBeInTheDocument();
  expect(screen.getByText(/waiting list \(position 2\)/)).toBeInTheDocument();
});

it('cancels a registration and reloads the list', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => registrations })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ message: 'Registration cancelled', promoted: false }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] });
  globalThis.fetch = fetchMock;
  render(<MyRegistrationsPage />);

  await userEvent.click(await screen.findByRole('button', { name: 'Cancel registration' }));

  expect(await screen.findByText('You have no registration yet.')).toBeInTheDocument();
  expect(fetchMock.mock.calls[1][1].method).toBe('DELETE');
});
