// My Profile : volontaire ET organisateur. Nom, username (unique), email, telephone, mot de passe.
import { useState } from 'react';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Hero } from '../components/Hero.jsx';
import { PhoneNumberField } from '../components/PhoneNumberField.jsx';
import { useApi } from '../hooks/useApi.js';
import { validateEmail } from '../utils/validateEmail.js';
import { readPhoneNumber } from '../utils/phoneNumber.js';

function Required() {
  return <span className="required-star" aria-hidden="true"> *</span>;
}

export function ProfilePage() {
  const { updateUser } = useAuth();
  const { data: profile, loading, error, reload } = useApi('/api/auth/me');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');

  const [showPassword, setShowPassword] = useState(false); // le formulaire mot de passe est cache tant qu'on ne clique pas
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');

  async function handleSave(e) {
    e.preventDefault();
    setMessage('');
    setFormError('');
    const form = new FormData(e.currentTarget);

    const check = validateEmail(form.get('email'));
    if (!check.ok) {
      setFormError(check.message);
      return;
    }
    const phone = readPhoneNumber(form);
    if (!phone.ok) {
      setFormError(phone.message);
      return;
    }

    setSaving(true);
    try {
      const updated = await apiFetch('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.get('name'),
          username: form.get('username'),
          email: check.email,
          phone: phone.phone, // '' = enlever le numero
        }),
      });
      updateUser(updated); // la barre de navigation affiche le nouveau nom tout de suite
      setMessage('Profile updated.');
      reload();
    } catch (err) {
      setFormError(err.message); // ex. 409 "Username already taken"
    } finally {
      setSaving(false);
    }
  }

  async function handlePassword(e) {
    e.preventDefault();
    setPwMessage('');
    setPwError('');
    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    if (form.get('newPassword') !== form.get('confirmPassword')) {
      setPwError('The new passwords do not match.');
      return;
    }

    setPwSaving(true);
    try {
      await apiFetch('/api/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: form.get('currentPassword'),
          newPassword: form.get('newPassword'),
        }),
      });
      formEl.reset();
      setShowPassword(false);
      setPwMessage('Password updated.');
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <>
    <Hero title="My Profile" text="Check and update your personal information." />
    <main className="narrow">
      {loading && !profile && <p>Loading...</p>}
      {error && <p role="alert">{error.message}</p>}

      {profile && (
        <>
          <form onSubmit={handleSave}>
            <fieldset disabled={saving}>
              <legend>Your information</legend>
              <p className="profile-hint">Account type: {profile.role}</p>
              <p className="profile-hint"><span className="required-star">*</span> = required</p>
              <label>
                Name<Required />
                <input name="name" defaultValue={profile.name} required maxLength={100} />
              </label>
              <label>
                Username (must be unique)<Required />
                <input
                  name="username"
                  defaultValue={profile.username}
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="\S{3,30}"
                  title="3 to 30 characters, no spaces. Letters, numbers and symbols like # are allowed."
                />
              </label>
              <label>
                Email<Required />
                <input name="email" type="email" defaultValue={profile.email} required />
              </label>
              <PhoneNumberField value={profile.phone} label="Phone number (optional)" />
              {formError && <p role="alert">{formError}</p>}
              {message && <p role="status">{message}</p>}
              <button type="submit">Save changes</button>
            </fieldset>
          </form>

          {!showPassword && (
            <>
              {pwMessage && <p role="status">{pwMessage}</p>}
              <button
                type="button"
                onClick={() => {
                  setPwMessage('');
                  setPwError('');
                  setShowPassword(true);
                }}
              >
                Change my password
              </button>
            </>
          )}

          {showPassword && (
            <form onSubmit={handlePassword}>
              <fieldset disabled={pwSaving}>
                <legend>Password</legend>
                <p className="profile-hint">
                  Your password is stored encrypted (hashed) and can never be shown.
                </p>
                <p className="profile-hint"><span className="required-star">*</span> = required</p>
                <label>
                  Current password<Required />
                  <input name="currentPassword" type="password" required autoComplete="current-password" />
                </label>
                <label>
                  New password (8 to 72 characters)<Required />
                  <input name="newPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
                </label>
                <label>
                  Confirm new password<Required />
                  <input name="confirmPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
                </label>
                {pwError && <p role="alert">{pwError}</p>}
                <button type="submit">Change password</button>
                <button type="button" onClick={() => setShowPassword(false)}>
                  Cancel
                </button>
              </fieldset>
            </form>
          )}
        </>
      )}
    </main>
    </>
  );
}
