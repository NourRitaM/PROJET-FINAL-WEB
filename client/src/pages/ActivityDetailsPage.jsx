// Details d'une activite : ses missions, places restantes, bouton "Register".
import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Hero } from '../components/Hero.jsx';

export function ActivityDetailsPage({ activityId, onBack }) {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(`/api/activities/${activityId}`);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [pending, setPending] = useState(null); // la mission pour laquelle le pop-up est ouvert
  const [busy, setBusy] = useState(false);

  // Clic sur "Register" : on ouvre le pop-up, rien n'est enregistre tant que Confirm n'est pas clique.
  async function handleConfirm() {
    const missionId = pending.id;
    setBusy(true);
    setPending(null);
    await handleRegister(missionId);
    setBusy(false);
  }

  async function handleRegister(missionId) {
    setMessage('');
    setActionError('');
    try {
      const result = await apiFetch(`/api/missions/${missionId}/register`, { method: 'POST' });
      setMessage(
        result.status === 'confirmed'
          ? 'You are registered!'
          : 'The mission is full: you are on the waiting list.'
      );
      reload(); // rafraichit les places restantes et le statut
    } catch (err) {
      setActionError(err.message); // ex. 409 "You are already registered for this mission"
    }
  }

  if (loading) return <main><p>Loading...</p></main>;
  if (error) {
    return (
      <main>
        <p role="alert">{error.message}</p>
        <button onClick={onBack}>Back to activities</button>
      </main>
    );
  }

  const isVolunteer = user?.role === 'volunteer';

  return (
    <>
    <Hero title={data.title} text={`${data.date} · ${data.start_time} – ${data.end_time} · ${data.location}`} />
    <main>
      <button className="btn-outline" onClick={onBack}>Back to activities</button>
      {data.description && <p>{data.description}</p>}
      {data.status === 'cancelled' && <p role="alert">This activity has been cancelled.</p>}

      {message && <p role="status">{message}</p>}
      {actionError && <p role="alert">{actionError}</p>}

      <h2>Missions</h2>
      {data.missions.length === 0 && <p>No mission yet.</p>}
      {data.missions.map((m) => (
        <article key={m.id}>
          <h3>{m.title}</h3>
          <p>
            {m.spots_left} spot(s) left out of {m.spots_needed}
            {m.waiting_count > 0 && ` · ${m.waiting_count} waiting`}
          </p>

          {m.my_status === 'confirmed' && <p role="status">You are registered.</p>}
          {m.my_status === 'waiting' && <p role="status">You are on the waiting list.</p>}

          {isVolunteer && !m.my_status && data.status === 'open' && (
            <button disabled={busy} onClick={() => setPending(m)}>
              {m.spots_left > 0 ? 'Register' : 'Join the waiting list'}
            </button>
          )}
        </article>
      ))}

      {pending && (
        <ConfirmDialog
          title={`You want to be part of "${data.title}"?`}
          message={
            pending.spots_left > 0
              ? `Mission: ${pending.title}. Confirm to take your spot, or discard to cancel.`
              : `Mission: ${pending.title} is full. Confirm to join the waiting list, or discard to cancel.`
          }
          confirmLabel="Confirm"
          cancelLabel="Discard"
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}
    </main>
    </>
  );
}
