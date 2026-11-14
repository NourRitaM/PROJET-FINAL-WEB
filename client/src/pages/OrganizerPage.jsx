import { useApi } from '../hooks/useApi.js';

// Appelle la route reelle /api/demo/organizer (requireAuth + requireRole('organizer')).
// A remplacer par les vraies routes d'activites quand elles existeront.
export function OrganizerPage() {
  const { data, loading, error } = useApi('/api/demo/organizer');

  if (loading) return <p>Loading...</p>;
  if (error) return <p role="alert">{error.message}</p>;
  return (
    <main>
      <h1>Organizer space</h1>
      <p>{data.message}</p>
    </main>
  );
}
