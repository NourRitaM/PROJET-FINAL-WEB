import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext.jsx';
import { LoginPage } from './LoginPage.jsx';

function setup(login, onNavigate = () => {}) {
  render(
    <AuthContext.Provider value={{ login }}>
      <LoginPage onNavigate={onNavigate} />
    </AuthContext.Provider>
  );
}

it('calls login with the email and password', async () => {
  const login = vi.fn().mockResolvedValue();
  const onNavigate = vi.fn();
  setup(login, onNavigate);

  await userEvent.type(screen.getByLabelText(/email/i), 'alice@uni.edu');
  await userEvent.type(screen.getByLabelText(/password/i), 'hunter22');
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

  expect(login).toHaveBeenCalledWith('alice@uni.edu', 'hunter22');
  expect(onNavigate).toHaveBeenCalledWith('home');
});

it('shows the error message when login fails', async () => {
  const login = vi.fn().mockRejectedValue(new Error('Invalid email or password'));
  const onNavigate = vi.fn();
  setup(login, onNavigate);

  await userEvent.type(screen.getByLabelText(/email/i), 'alice@uni.edu');
  await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass');
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  expect(onNavigate).not.toHaveBeenCalled();
});
