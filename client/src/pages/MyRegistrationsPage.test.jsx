import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi, beforeEach } from 'vitest';
import { MyRegistrationsPage } from './MyRegistrationsPage.jsx';

const registrations = [
  {
    id: 1, status: 'waiting', waiting_position: 2, mission_id: 5, mission_title: 'Solo mission',
    activity_id: 3, activity_title: 'Food drive', activity_status: 'open',
    date: '2026-12-12', start_time: '10:00', end_time: '15:00', location: 'Campus Hall',
    can_cancel: true, cancel_deadline: '2026-12-10',
  },
];

// Inscription confirmee a moins de 2 jours de l'activite : l'API renvoie can_cancel = false
const tooLate = {
  ...registrations[0], id: 2, status: 'confirmed', waiting_position: null,
  date: '2026-12-01', can_cancel: false, cancel_deadline: '2026-11-29',
};

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

it('shows the cancel deadline of a confirmed registration', async () => {
  const confirmed = { ...registrations[0], status: 'confirmed', waiting_position: null };
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [confirmed] });
  render(<MyRegistrationsPage />);

  expect(await screen.findByText('You can cancel until 2026-12-10.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete registration' })).toBeEnabled();
});

it('disables Delete after the deadline (less than 2 days before the activity)', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [tooLate] });
  globalThis.fetch = fetchMock;
  render(<MyRegistrationsPage />);

  expect(await screen.findByText('Too late to cancel: the deadline was 2026-11-29.')).toBeInTheDocument();
  const button = screen.getByRole('button', { name: 'Delete registration' });
  expect(button).toBeDisabled();
  await userEvent.click(button);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1); // aucun DELETE envoye
});
