// Un hook possede l'etat de chargement (Session 20, couche 02).
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client.js';

export function useApi(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch(path)
      .then(setData, setError)
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => { load(); }, [load]);

  return { data, error, loading, reload: load };
}
