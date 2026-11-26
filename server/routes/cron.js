// Taches planifiees declenchees de l'exterieur (GitHub Actions, voir .github/workflows/reminders.yml).
// Pas de JWT ici (aucun utilisateur) : la route est protegee par un secret partage, CRON_SECRET.
import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { sendDueReminders } from '../email/reminders.js';

const cronRouter = express.Router();

// Comparaison a temps constant : la duree de la reponse ne revele rien du secret (Session 21).
function sameSecret(given, expected) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// POST /api/cron/reminders   en-tete : Authorization: Bearer <CRON_SECRET>
cronRouter.post('/reminders', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  // Secret non configure : la route n'existe pas (impossible de l'appeler sans secret).
  if (!secret) return res.status(404).json({ error: 'Not found' });

  if (!sameSecret(req.get('Authorization') ?? '', `Bearer ${secret}`)) {
    return res.status(401).json({ error: 'Invalid cron secret' });
  }

  res.json(await sendDueReminders());
});

export default cronRouter;
