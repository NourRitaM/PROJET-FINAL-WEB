import { useAuth } from '../auth/AuthContext.jsx';

// Page protegee selon le role. Ce n'est que de l'UX : la vraie protection
// est celle du serveur (requireAuth + requireRole -> 401 / 403), Session 21.
export function RequireRole({ allowed, children }) {
  const { user } = useAuth();

  if (!user) return <p role="alert">Please log in.</p>;
  if (!allowed.includes(user.role)) {
    return <p role="alert">Forbidden: this page is for {allowed.join(', ')}.</p>;
  }
  return children;
}
