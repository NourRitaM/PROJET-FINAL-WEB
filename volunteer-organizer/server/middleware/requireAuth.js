// Authentification (authn) : pas de token valide, pas d'entree. -> 401
// Remplit req.userId et req.userRole pour toutes les routes qui suivent.
import { verifyToken } from '../auth/token.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const payload = verifyToken(token);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId)) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.userId = userId; // l'identite vient du token, jamais du body (Session 21)
    req.userRole = payload.role;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
