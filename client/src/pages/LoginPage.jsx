import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { Hero } from '../components/Hero.jsx';

export function LoginPage({ onNavigate }) {
  const { login } = useAuth();
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await login(form.get('email'), form.get('password'));
      setError('');
      onNavigate('home');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
    <Hero variant="full" title="Log in" text="Welcome back! Sign in to find your next volunteer mission." />
    <main className="narrow">
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
    </>
  );
}
