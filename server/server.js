// Point d'entree : verifie la config, connecte la base, PUIS ecoute (Session 18 / 21 / 23).
import 'dotenv/config'; // premiere ligne : avant que quoi que ce soit lise process.env
import app from './app.js';
import { pool } from './db/pool.js';
import { startReminderTimer } from './email/reminders.js';

// Secret manquant : on plante au demarrage plutot qu'en pleine requete (Session 21).
// En production, CLIENT_ORIGIN est obligatoire : sinon CORS pointerait vers localhost (Session 23).
const required = ['DATABASE_URL', 'JWT_SECRET'];
if (process.env.NODE_ENV === 'production') required.push('CLIENT_ORIGIN');
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in the environment`);
    process.exit(1);
  }
}

// L'hebergeur choisit le port (Session 23) : ne jamais ecrire app.listen(3000) en dur
const port = Number(process.env.PORT) || 3000;

try {
  await pool.query('SELECT 1');
  console.log('connected to PostgreSQL');
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
    // Rappels 1-2 jours avant l'activite : maintenant, puis toutes les heures (email/reminders.js)
    startReminderTimer();
  });
} catch (err) {
  console.error('DB connection failed:', err.message);
  process.exit(1);
}
