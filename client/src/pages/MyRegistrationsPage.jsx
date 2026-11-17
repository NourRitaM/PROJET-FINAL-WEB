// Mes inscriptions : statut, position dans la liste d'attente, annulation.
import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { apiFetch } from '../api/client.js';

export function MyRegistrationsPage() {
  const { data, loading, error, reload } = useApi('/api/registrations/mine');
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');

  async function handleCancel(id) {
    setMessage('');
    setActionError('');
    try {
      const result = await apiFetch(`/api/registrations/${id}`, { method: 'DELETE' });
      setMessage(
        result.promoted
          ? 'Registration cancelled. The first volunteer on the waiting list got the spot.'
          : 'Registration cancelled.'
      );
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <main>
      <h1>My registrations</h1>

      {message && <p role="status">{message}</p>}
      {actionError && <p role="alert">{actionError}</p>}
      {loading && <p>Loading...</p>}
      {error && <p role="alert">{error.message}</p>}
      {data && data.length === 0 && <p>You have no registration yet.</p>}

      {data && data.map((r) => (
        <article key={r.id}>
          <h2>{r.mission_title}</h2>
          <p>{r.activity_title} · {r.date} · {r.start_time} – {r.end_time} · {r.location}</p>
          {r.activity_status === 'cancelled' && <p role="alert">This activity was cancelled.</p>}
          <p>
            {r.status === 'confirmed'
              ? 'Status: confirmed'
              : `Status: waiting list (position ${r.waiting_position})`}
          </p>
          <button onClick={() => handleCancel(r.id)}>Cancel registration</button>
        </article>
      ))}
    </main>
  );
}
