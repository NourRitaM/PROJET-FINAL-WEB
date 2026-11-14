import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext.jsx';
import { Navbar } from './Navbar.jsx';

function setup(value, onNavigate = () => {}) {
  render(
    <AuthContext.Provider value={value}>
      <Navbar onNavigate={onNavigate} />
    </AuthContext.Provider>
  );
}

it('shows log in and sign up when logged out', () => {
  setup({ user: null });
  expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
});

it('shows the name and role when logged in', () => {
  setup({ user: { name: 'Alice', role: 'organizer' }, logout: () => {} });
  expect(screen.getByText('Alice (organizer)')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Organizer space' })).toBeInTheDocument();
});

it('calls logout and goes back to login', async () => {
  const logout = vi.fn();
  const onNavigate = vi.fn();
  setup({ user: { name: 'Bob', role: 'volunteer' }, logout }, onNavigate);

  await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

  expect(logout).toHaveBeenCalled();
  expect(onNavigate).toHaveBeenCalledWith('login');
});
