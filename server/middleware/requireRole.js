// Autorisation (authz) : connu, mais a-t-il le droit ? -> 403
// A placer APRES requireAuth. Exemple : requireRole('organizer')
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}
