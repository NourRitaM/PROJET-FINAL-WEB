import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { Hero } from '../components/Hero.jsx';
import { PhoneNumberField } from '../components/PhoneNumberField.jsx';
import { validateEmail } from '../utils/validateEmail.js';
import { readPhoneNumber } from '../utils/phoneNumber.js';

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
    const phone = readPhoneNumber(form);
    if (!phone.ok) {
      setError(phone.message);
      return;
    }

    try {
      await signup({
        name: form.get('name'),
        username: form.get('username'),
        email: check.email,
        phone: phone.phone,
        password: form.get('password'),
        role: form.get('role'),
      });
      setError('');
    } catch (err) {
      setError(err.message); // ex. 409 "Email already registered" ou "Username already taken"
    }
  }

  return (
    <>
    <Hero variant="full" title="Sign up" text="Create your account and start making a difference." />
    <main className="narrow">
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input name="name" required maxLength={100} />
        </label>
        <label>
          Username (unique, 3 to 30 characters, no spaces)
          <input name="username" required minLength={3} maxLength={30} pattern="\S{3,30}" title="3 to 30 characters, no spaces. Letters, numbers and symbols like # are allowed." />
        </label>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <PhoneNumberField label="Phone number (optional)" />
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
    </>
  );
}
