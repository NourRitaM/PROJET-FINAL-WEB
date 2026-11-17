// Inscription, connexion, deconnexion (Session 19 : valider, hasher, sauver, signer).
import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db/pool.js';
import { signToken } from '../auth/token.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sendSignupConfirmation } from '../email/mailer.js';
import { EMAIL_RE, cleanUsername, usernameError, cleanPhone, phoneError } from '../validators.js';

const authRouter = express.Router();

const ROLES = ['organizer', 'volunteer'];

// Colonnes publiques d'un utilisateur : jamais le hash.
const USER_COLUMNS = 'id, name, username, email, phone, role';

// 23505 = violation de UNIQUE : on regarde quelle contrainte pour dire email ou username.
function uniqueViolationMessage(err) {
  return String(err.constraint ?? '').includes('username')
    ? 'Username already taken'
    : 'Email already registered';
}

// POST /api/auth/signup
authRouter.post('/signup', async (req, res) => {
  const { name, username, email, phone, password, role } = req.body ?? {};

  // On verifie le TYPE aussi, pas seulement la valeur (Session 21)
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanUser = cleanUsername(username);
  const cleanPhoneNumber = cleanPhone(phone);

  if (!cleanName || cleanName.length > 100) {
    return res.status(400).json({ error: 'Name is required (max 100 characters)' });
  }
  if (usernameError(cleanUser)) {
    return res.status(400).json({ error: usernameError(cleanUser) });
  }
  if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 254) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (phoneError(cleanPhoneNumber)) {
    return res.status(400).json({ error: phoneError(cleanPhoneNumber) });
  }
  // bcrypt ne lit que les 72 premiers octets : on plafonne
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'Password must be 8 to 72 characters' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'Role must be "organizer" or "volunteer"' });
  }

  const existing = await query(
    'SELECT email FROM users WHERE email = $1 OR lower(username) = lower($2)',
    [cleanEmail, cleanUser]
  );
  if (existing.rows.length > 0) {
    return res.status(409).json({
      error: existing.rows.some((r) => r.email === cleanEmail)
        ? 'Email already registered'
        : 'Username already taken',
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await query(
      `INSERT INTO users (name, username, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${USER_COLUMNS}`,
      [cleanName, cleanUser, cleanEmail, cleanPhoneNumber || null, passwordHash, role]
    );
    const user = rows[0];
    // 201 : token + user, jamais le hash
    res.status(201).json({ token: signToken(user), user });
    sendSignupConfirmation(user); // email de confirmation, sans attendre ni bloquer
  } catch (err) {
    // 23505 = violation de UNIQUE (deux inscriptions simultanees avec le meme email / username)
    if (err.code === '23505') {
      return res.status(409).json({ error: uniqueViolationMessage(err) });
    }
    throw err;
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  console.time('login-total');
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  console.time('login-db');
  const { rows } = await query(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email.trim().toLowerCase()]
  );
  console.timeEnd('login-db');
  const user = rows[0];

  console.time('login-bcrypt');
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  console.timeEnd('login-bcrypt');

  if (!ok) {
    console.timeEnd('login-total');
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  console.time('login-token');
  const token = signToken(user);
  console.timeEnd('login-token');

  console.timeEnd('login-total');
  res.json({
    token,
    user: {
      id: user.id, name: user.name, username: user.username,
      email: user.email, phone: user.phone, role: user.role,
    },
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
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
    [req.userId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(rows[0]);
});

// PATCH /api/auth/me : My Profile. Modifie name, username, email, phone (les champs envoyes seulement).
// Le role ne change jamais ici, et l'id vient du token (Session 21).
authRouter.patch('/me', requireAuth, async (req, res) => {
  const body = req.body ?? {};
  const changes = {};

  if (body.name !== undefined) {
    const v = typeof body.name === 'string' ? body.name.trim() : '';
    if (!v || v.length > 100) {
      return res.status(400).json({ error: 'Name is required (max 100 characters)' });
    }
    changes.name = v;
  }
  if (body.username !== undefined) {
    const v = cleanUsername(body.username);
    if (usernameError(v)) return res.status(400).json({ error: usernameError(v) });
    changes.username = v;
  }
  if (body.email !== undefined) {
    const v = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!EMAIL_RE.test(v) || v.length > 254) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    changes.email = v;
  }
  if (body.phone !== undefined) {
    const v = body.phone === null ? '' : cleanPhone(body.phone);
    if (phoneError(v)) return res.status(400).json({ error: phoneError(v) });
    changes.phone = v === '' ? null : v; // vide = on enleve le numero
  }

  const columns = Object.keys(changes);
  if (columns.length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  // Le username / l'email d'un AUTRE compte ne doivent pas etre pris (le sien est permis)
  if (changes.username !== undefined || changes.email !== undefined) {
    const clash = await query(
      `SELECT email, username FROM users
        WHERE id <> $1 AND (email = $2 OR lower(username) = lower($3))`,
      [req.userId, changes.email ?? null, changes.username ?? null]
    );
    if (clash.rows.length > 0) {
      const emailTaken = changes.email !== undefined && clash.rows.some((r) => r.email === changes.email);
      return res.status(409).json({ error: emailTaken ? 'Email already registered' : 'Username already taken' });
    }
  }

  // Noms de colonnes : viennent de NOTRE liste ci-dessus, jamais du body. Valeurs : parametrees.
  const sets = columns.map((c, i) => `${c} = $${i + 2}`).join(', ');
  try {
    const { rows } = await query(
      `UPDATE users SET ${sets} WHERE id = $1 RETURNING ${USER_COLUMNS}`,
      [req.userId, ...columns.map((c) => changes[c])]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: uniqueViolationMessage(err) });
    throw err;
  }
});

// PATCH /api/auth/password : changer son mot de passe (il faut connaitre l'ancien).
// Le hash n'est JAMAIS renvoye au navigateur (SECURITY.md) : on ne l'affiche donc pas dans My Profile.
authRouter.patch('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== 'string' || currentPassword === '') {
    return res.status(400).json({ error: 'Current password is required' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 72) {
    return res.status(400).json({ error: 'New password must be 8 to 72 characters' });
  }

  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

  if (!(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
    // 400 et pas 401 : un 401 deconnecterait l'utilisateur cote client (auth:expired)
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = $2 WHERE id = $1', [req.userId, newHash]);
  res.json({ message: 'Password updated' });
});

export default authRouter;
