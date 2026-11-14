import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { validateEmail } from '../utils/validateEmail.js';

export function SignupPage({ onNavigate }) {
  const { signup } = useAuth();
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const check = validateEmail(form.get('email'));
    if (!check.ok) {
      setError(check.message);
      return;
    }

    try {
      await signup(
        form.get('name'),
        check.email,
        form.get('password'),
        form.get('role')
      );
      setError('');
    } catch (err) {
      setError(err.message); // ex. 409 "Email already registered"
    }
  }

  return (
    <main>
      <h1>Sign up</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input name="name" required maxLength={100} />
        </label>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password (8 to 72 characters)
          <input name="password" type="password" required minLength={8} maxLength={72} />
        </label>
        <label>
          Role
          <select name="role" defaultValue="volunteer">
            <option value="volunteer">Volunteer</option>
            <option value="organizer">Organizer</option>
          </select>
        </label>
        {error && <p role="alert">{error}</p>}
        <button>Create account</button>
      </form>
      <p>
        Already registered?{' '}
        <button type="button" onClick={() => onNavigate('login')}>Log in</button>
      </p>
    </main>
  );
}
