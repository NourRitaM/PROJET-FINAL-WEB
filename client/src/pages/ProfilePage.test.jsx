import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi, beforeEach } from 'vitest';
import { AuthContext } from '../auth/AuthContext.jsx';
import { ProfilePage } from './ProfilePage.jsx';

const profile = {
  id: 1, name: 'Bob', username: 'bob#1', email: 'bob@gmail.com', phone: null, role: 'volunteer',
};

beforeEach(() => localStorage.clear());

function setup(updateUser = () => {}) {
  render(
    <AuthContext.Provider value={{ user: profile, updateUser }}>
      <ProfilePage />
    </AuthContext.Provider>
  );
}

it('shows name, username, email and an empty phone, and never a password hash', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => profile });
  setup();

  expect(await screen.findByLabelText(/^Name/)).toHaveValue('Bob');
  expect(screen.getByLabelText(/Username/)).toHaveValue('bob#1');
  expect(screen.getByLabelText(/^Email/)).toHaveValue('bob@gmail.com');
  expect(screen.getByLabelText(/^Phone number/)).toHaveValue('');
});

it('saves a new phone number with PATCH and updates the session', async () => {
  const updated = { ...profile, phone: '+96170123456' };
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => profile })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => updated })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => updated });
  globalThis.fetch = fetchMock;
  const updateUser = vi.fn();
  setup(updateUser);

  await userEvent.type(await screen.findByLabelText(/^Phone number/), '70 123 456');
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

  expect(await screen.findByText('Profile updated.')).toBeInTheDocument();
  expect(fetchMock.mock.calls[1][1].method).toBe('PATCH');
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).phone).toBe('+96170123456');
  expect(updateUser).toHaveBeenCalledWith(updated);
});

it('does not save a phone number that is invalid for the selected country', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => profile });
  globalThis.fetch = fetchMock;
  setup();

  await userEvent.type(await screen.findByLabelText(/^Phone number/), '123');
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('valid phone number');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('shows the server error when the username is already taken', async () => {
  globalThis.fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => profile })
    .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: 'Username already taken' }) });
  setup();

  await screen.findByLabelText(/^Name/);
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Username already taken');
});

it('refuses a new password that does not match its confirmation', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => profile });
  globalThis.fetch = fetchMock;
  setup();

  await userEvent.click(await screen.findByRole('button', { name: 'Change my password' }));
  await userEvent.type(await screen.findByLabelText(/^Current password/), 'hunter22');
  await userEvent.type(screen.getByLabelText(/^New password/), 'newpass123');
  await userEvent.type(screen.getByLabelText(/^Confirm new password/), 'different1');
  await userEvent.click(screen.getByRole('button', { name: 'Change password' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('do not match');
  expect(fetchMock).toHaveBeenCalledTimes(1); // pas de PATCH envoye
});

it('hides the password fields until Change my password is clicked', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => profile });
  setup();

  await screen.findByLabelText(/^Name/);
  expect(screen.queryByLabelText(/^Current password/)).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Change my password' }));
  expect(screen.getByLabelText(/^Current password/)).toBeInTheDocument();
});
