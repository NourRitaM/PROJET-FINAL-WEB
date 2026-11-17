// Qui est connecte = un state (Session 20). Token ET utilisateur (avec son role)
// sont gardes dans le state et dans localStorage : on ecrit les deux, on efface les deux.
import { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';

export const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() =>
    localStorage.getItem('token') ? readStoredUser() : null
  );

  function saveSession(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }

  async function login(email, password) {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveSession(data);
  }

  async function signup({ name, username, email, phone, password, role }) {
    const data = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, username, email, phone, password, role }),
    });
    saveSession(data);
  }

  // My Profile : le serveur renvoie l'utilisateur a jour, on le garde (state + localStorage)
  function updateUser(nextUser) {
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }

  // Token expire en cours de session : 401 -> apiFetch lance l'evenement -> login
  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, []);

  const value = { token, user, login, signup, logout, updateUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
