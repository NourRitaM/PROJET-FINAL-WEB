import 'dotenv/config'; // premiere ligne : avant que quoi que ce soit lise process.env
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pool } from './db/pool.js';
import authRouter from './routes/auth.js';
import { requireAuth } from './middleware/requireAuth.js';
import { requireRole } from './middleware/requireRole.js';



// Secret manquant : on plante au demarrage plutot qu'en pleine requete (Session 21)
for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in .env`);
    process.exit(1);
  }
}

const port = Number(process.env.PORT) || 3000;
const app = express();

// Middleware logger (Session 16)
function logger(req, res, next) {
  const time = new Date().toLocaleTimeString();
  console.log(`${time} ${req.method} ${req.path}`);
  next(); // ne pas oublier next()
}

app.use(helmet()); // en-tetes de securite (Session 21)
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());
app.use(logger);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Public : signup / login. Protege : logout / me (voir routes/auth.js)
app.use('/api/auth', authRouter);

// --- Routes de demonstration du middleware de role -------------------------
// A SUPPRIMER quand les vraies routes (activities, missions...) seront branchees.
// Les deux autres membres de l'equipe s'en servent comme modele :
//   router.post('/', requireAuth, requireRole('organizer'), createActivity)
app.get('/api/demo/organizer', requireAuth, requireRole('organizer'), (req, res) => {
  res.json({ message: 'Hello organizer', userId: req.userId });
});
app.get('/api/demo/volunteer', requireAuth, requireRole('volunteer'), (req, res) => {
  res.json({ message: 'Hello volunteer', userId: req.userId });
});
// ---------------------------------------------------------------------------

// Aucune route ne correspond (apres toutes les routes)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Gestion d'erreurs : JSON malforme -> 400, le reste -> 500, sans jamais planter le serveur.
// Express 5 envoie ici les erreurs des handlers async automatiquement.
app.use((err, req, res, next) => {
  if (err.status === 400 || err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// Connecter la base d'abord, puis ecouter (Session 18)
try {
  await pool.query('SELECT 1');
  console.log('connected to PostgreSQL');
  app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
} catch (err) {
  console.error('DB connection failed:', err);
  process.exit(1);
}

