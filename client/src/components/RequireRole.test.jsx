import { render, screen } from '@testing-library/react';
import { it, expect } from 'vitest';
import { AuthContext } from '../auth/AuthContext.jsx';
import { RequireRole } from './RequireRole.jsx';

function setup(user) {
  render(
    <AuthContext.Provider value={{ user }}>
      <RequireRole allowed={['organizer']}>
        <p>Secret organizer page</p>
      </RequireRole>
    </AuthContext.Provider>
  );
}

it('shows the page to an allowed role', () => {
  setup({ name: 'Alice', role: 'organizer' });
  expect(screen.getByText('Secret organizer page')).toBeInTheDocument();
});

it('blocks a volunteer', () => {
  setup({ name: 'Bob', role: 'volunteer' });
  expect(screen.queryByText('Secret organizer page')).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Forbidden');
});

it('asks to log in when nobody is logged in', () => {
  setup(null);
  expect(screen.getByRole('alert')).toHaveTextContent('Please log in');
});
