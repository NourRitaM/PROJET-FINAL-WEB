// Liste des activites + recherche par date / lieu (Session 14 : state, Session 20 : fetch + hook).
import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { Hero } from '../components/Hero.jsx';

export function ActivitiesPage({ onOpenActivity }) {
  // Ce que la personne tape (formulaire) et ce qui est reellement cherche (filtres appliques)
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [filters, setFilters] = useState({ date: '', location: '' });

  // Construit /api/activities?date=...&location=... (valeurs encodees pour l'URL)
  const params = new URLSearchParams();
  if (filters.date) params.set('date', filters.date);
  if (filters.location) params.set('location', filters.location);
  const path = '/api/activities' + (params.toString() ? `?${params}` : '');

  const { data, loading, error } = useApi(path);

  function handleSearch(e) {
    e.preventDefault();
    setFilters({ date, location: location.trim() });
  }

  function handleReset() {
    setDate('');
    setLocation('');
    setFilters({ date: '', location: '' });
  }

  return (
    <>
    <Hero title="Activities" text="Find an activity near you and join the team." />
    <main>

      <form className="search-form" onSubmit={handleSearch}>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Location
          <input
            value={location}
            maxLength={100}
            placeholder="e.g. library"
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <button type="submit">Search</button>
        <button type="button" onClick={handleReset}>Reset</button>
      </form>

      {loading && <p>Loading...</p>}
      {error && <p role="alert">{error.message}</p>}
      {data && data.length === 0 && <p>No activity found.</p>}

      <div className="card-grid">
      {data && data.map((a) => (
        <article key={a.id}>
          <h2>{a.title}</h2>
          <p>{a.date} · {a.start_time} – {a.end_time} · {a.location}</p>
          <p>{a.mission_count} mission(s)</p>
          {a.missions && a.missions.length > 0 && (
            <ul>
              {a.missions.map((m) => (
                <li key={m.id}>{m.title} : {m.spots_left}/{m.spots_needed} spot(s) left</li>
              ))}
            </ul>
          )}
          <button onClick={() => onOpenActivity(a.id)}>View details</button>
        </article>
      ))}
      </div>
    </main>
    </>
  );
}
