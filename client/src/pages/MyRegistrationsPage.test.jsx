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

it('deletes a registration only after clicking Yes in the pop-up', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => registrations })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ message: 'Registration cancelled', promoted: false }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] });
  globalThis.fetch = fetchMock;
  render(<MyRegistrationsPage />);

  await userEvent.click(await screen.findByRole('button', { name: 'Delete registration' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('Are you sure you want to delete "Food drive"?');
  expect(fetchMock).toHaveBeenCalledTimes(1); // rien n'est supprime avant Yes
  await userEvent.click(screen.getByRole('button', { name: 'Yes' }));

  expect(await screen.findByText('You have no registration yet.')).toBeInTheDocument();
  expect(fetchMock.mock.calls[1][1].method).toBe('DELETE');
});

it('keeps the registration when the user clicks No', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => registrations });
  globalThis.fetch = fetchMock;
  render(<MyRegistrationsPage />);

  await userEvent.click(await screen.findByRole('button', { name: 'Delete registration' }));
  await userEvent.click(screen.getByRole('button', { name: 'No' }));

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Solo mission')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1); // aucun DELETE envoye
});
