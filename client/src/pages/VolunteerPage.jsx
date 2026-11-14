import { useApi } from '../hooks/useApi.js';

// Appelle la route reelle /api/demo/volunteer (requireAuth + requireRole('volunteer')).
export function VolunteerPage() {
  const { data, loading, error } = useApi('/api/demo/volunteer');

  if (loading) return <p>Loading...</p>;
  if (error) return <p role="alert">{error.message}</p>;
  return (
    <main>
      <h1>Volunteer space</h1>
      <p>{data.message}</p>
    </main>
  );
}
