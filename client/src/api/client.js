// Une seule fonction possede toutes les requetes (Session 20, couche 01).
// Jamais d'adresse en dur : elle vient de VITE_API_URL (.env.development / dashboard Vercel).
const API_URL = import.meta.env.VITE_API_URL ?? '';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');

  let res;
  try {
    res = await fetch(API_URL + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
  } catch {
    // API eteinte, hors ligne, ou CORS : fetch lui-meme echoue
    throw new Error('Cannot reach the server. Please try again.');
  }

  // 401 : le token est mort -> on previent l'AuthProvider
  if (res.status === 401) {
    window.dispatchEvent(new Event('auth:expired'));
  }

  if (!res.ok) {
    // La reponse d'erreur n'est pas toujours du JSON (ex. une page d'erreur de l'hebergeur)
    let message = `Request failed (${res.status})`;
    try {
      message = (await res.json()).error ?? message;
    } catch {
      /* on garde le message par defaut */
    }
    throw new Error(message);
  }
  return res.status === 204 ? null : res.json();
}
