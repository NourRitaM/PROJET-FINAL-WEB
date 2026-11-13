// Inscription, connexion, deconnexion (Session 19 : valider, hasher, sauver, signer).
import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db/pool.js';
import { signToken } from '../auth/token.js';
import { requireAuth } from '../middleware/requireAuth.js';

const authRouter = express.Router();

const ROLES = ['organizer', 'volunteer'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/signup
authRouter.post('/signup', async (req, res) => {
  const { name, email, password, role } = req.body ?? {};

  // On verifie le TYPE aussi, pas seulement la valeur (Session 21)
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!cleanName || cleanName.length > 100) {
    return res.status(400).json({ error: 'Name is required (max 100 characters)' });
  }
  if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 254) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  // bcrypt ne lit que les 72 premiers octets : on plafonne
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'Password must be 8 to 72 characters' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'Role must be "organizer" or "volunteer"' });
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [cleanName, cleanEmail, passwordHash, role]
    );
    const user = rows[0];
    // 201 : token + user, jamais le hash
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    // 23505 = violation de UNIQUE (deux inscriptions simultanees avec le meme email)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    throw err;
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { rows } = await query(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
    [email.trim().toLowerCase()]
  );
  const user = rows[0];

  const ok = user && (await bcrypt.compare(password, user.password_hash));

  // Un seul message : ne pas dire si c'est l'email ou le mot de passe qui est faux
  if (!ok) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// POST /api/auth/logout
// Un JWT est "stateless" : le serveur ne garde rien. Se deconnecter = le client
// supprime son token (Session 19). Cette route confirme juste que le token etait valide.
authRouter.post('/logout', requireAuth, (req, res) => {
  res.json({ message: 'Logged out. Delete the token on the client.' });
});

// GET /api/auth/me : qui suis-je ? (utile pour le front et pour tester le token)
authRouter.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, email, role FROM users WHERE id = $1',
    [req.userId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(rows[0]);
});

export default authRouter;
