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
  expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
});

it('navigates home while logged out', async () => {
  const onNavigate = vi.fn();
  setup({ user: null }, onNavigate);

  await userEvent.click(screen.getByRole('button', { name: 'Home' }));

  expect(onNavigate).toHaveBeenCalledWith('home');
});

it('shows the username beside a profile icon when logged in', () => {
  setup({ user: { name: 'Alice', username: 'alice.1', role: 'organizer' }, logout: () => {} });
  expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
  expect(screen.getByText('@alice.1 (organizer)')).toBeInTheDocument();
  expect(document.querySelector('.navbar-user svg')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Organizer space' })).toBeInTheDocument();
});

it('navigates home while logged in', async () => {
  const onNavigate = vi.fn();
  setup({ user: { name: 'Bob', role: 'volunteer' }, logout: () => {} }, onNavigate);

  await userEvent.click(screen.getByRole('button', { name: 'Home' }));

  expect(onNavigate).toHaveBeenCalledWith('home');
});

it('calls logout and goes back to login', async () => {
  const logout = vi.fn();
  const onNavigate = vi.fn();
  setup({ user: { name: 'Bob', role: 'volunteer' }, logout }, onNavigate);

  await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

  expect(logout).toHaveBeenCalled();
  expect(onNavigate).toHaveBeenCalledWith('login');
});

it('shows the volunteer links and navigates to them', async () => {
  const onNavigate = vi.fn();
  setup({ user: { name: 'Bob', role: 'volunteer' }, logout: () => {} }, onNavigate);

  await userEvent.click(screen.getByRole('button', { name: 'Activities' }));
  await userEvent.click(screen.getByRole('button', { name: 'My registrations' }));

  expect(onNavigate).toHaveBeenNthCalledWith(1, 'activities');
  expect(onNavigate).toHaveBeenNthCalledWith(2, 'registrations');
});

it('opens the profile from the username button, with no separate My Profile button', async () => {
  for (const role of ['volunteer', 'organizer']) {
    const onNavigate = vi.fn();
    const { unmount } = render(
      <AuthContext.Provider value={{ user: { name: 'Sam', role }, logout: () => {} }}>
        <Navbar onNavigate={onNavigate} />
      </AuthContext.Provider>
    );
    expect(screen.queryByRole('button', { name: 'My Profile' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: `@Sam (${role})` }));
    expect(onNavigate).toHaveBeenCalledWith('profile');
    unmount();
  }
});
