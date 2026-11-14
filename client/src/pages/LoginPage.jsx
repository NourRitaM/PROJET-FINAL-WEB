import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

export function LoginPage({ onNavigate }) {
  const { login } = useAuth();
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await login(form.get('email'), form.get('password'));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main>
      <h1>Log in</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        {error && <p role="alert">{error}</p>}
        <button>Log in</button>
      </form>
      <p>
        No account yet?{' '}
        <button type="button" onClick={() => onNavigate('signup')}>Sign up</button>
      </p>
    </main>
  );
}
