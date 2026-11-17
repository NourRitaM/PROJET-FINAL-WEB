// Mes inscriptions : statut, position dans la liste d'attente, annulation.
import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { apiFetch } from '../api/client.js';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Hero } from '../components/Hero.jsx';

export function MyRegistrationsPage() {
  const { data, loading, error, reload } = useApi('/api/registrations/mine');
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [pending, setPending] = useState(null); // l'inscription qu'on est en train de confirmer

  // Yes dans le pop-up : on supprime vraiment. No : l'inscription est gardee.
  async function handleYes() {
    const id = pending.id;
    setPending(null);
    await handleCancel(id);
  }

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
    <>
    <Hero title="My registrations" text="Follow your missions and your place on waiting lists." />
    <main>

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
          <button onClick={() => setPending(r)}>Delete registration</button>
        </article>
      ))}

      {pending && (
        <ConfirmDialog
          title={`Are you sure you want to delete "${pending.activity_title}"?`}
          message={`Mission: ${pending.mission_title}. It will be removed from your registrations.`}
          confirmLabel="Yes"
          cancelLabel="No"
          onConfirm={handleYes}
          onCancel={() => setPending(null)}
        />
      )}
    </main>
    </>
  );
}
