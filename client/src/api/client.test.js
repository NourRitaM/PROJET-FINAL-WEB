import { it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from './client.js';

beforeEach(() => {
  localStorage.clear();
});

it('sends the Bearer token when there is one', async () => {
  localStorage.setItem('token', 'abc');
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true, status: 200, json: async () => ({ ok: true }),
  });
  globalThis.fetch = fetchMock;

  await apiFetch('/api/auth/me');

  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
});

it('throws the server error message on a bad status', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false, status: 409, json: async () => ({ error: 'Email already registered' }),
  });

  await expect(apiFetch('/api/auth/signup')).rejects.toThrow('Email already registered');
});

it('fires auth:expired on a 401', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: false, status: 401, json: async () => ({ error: 'Invalid or expired token' }),
  });
  const onExpired = vi.fn();
  window.addEventListener('auth:expired', onExpired);

  await expect(apiFetch('/api/auth/me')).rejects.toThrow();

  expect(onExpired).toHaveBeenCalled();
  window.removeEventListener('auth:expired', onExpired);
});
