import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import { HomePage } from './HomePage.jsx';

it('introduces the service and clarifies who needs an account', () => {
  render(<HomePage onNavigate={() => {}} />);

  expect(screen.getByRole('heading', { name: 'Welcome to Volunteer Organizer' })).toBeInTheDocument();
  expect(screen.getByText(/Accounts are for organizers and volunteers only/i)).toBeInTheDocument();
  expect(screen.getByText(/Run the games: 3 places/)).toBeInTheDocument();
});

it('provides actions to open signup and login', async () => {
  const onNavigate = vi.fn();
  render(<HomePage onNavigate={onNavigate} />);

  await userEvent.click(screen.getByRole('button', { name: 'Create an account' }));
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

  expect(onNavigate).toHaveBeenNthCalledWith(1, 'signup');
  expect(onNavigate).toHaveBeenNthCalledWith(2, 'login');
});

it('offers the signed-in user a link to their workspace', async () => {
  const onNavigate = vi.fn();
  render(
    <HomePage
      user={{ name: 'Alice', role: 'volunteer' }}
      onNavigate={onNavigate}
    />
  );

  await userEvent.click(screen.getByRole('button', { name: 'Browse activities' }));

  expect(onNavigate).toHaveBeenCalledWith('activities');
});
