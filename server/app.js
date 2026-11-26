// L'application Express, SANS ecouter sur un port et SANS se connecter a la base (Session 22) :
// les tests peuvent l'importer et lui envoyer des requetes sans port ni base.
// server.js (a cote) s'occupe de la base et du listen.
import 'dotenv/config'; // avant que quoi que ce soit lise process.env
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth.js';
import activitiesRouter from './routes/activities.js';
import missionsRouter from './routes/missions.js';
import registrationsRouter from './routes/registrations.js';
import organizerRouter from './routes/organizer.js';
import organizerMissionsRouter from './routes/organizerMissions.js';
import cronRouter from './routes/cron.js';

const app = express();

// Middleware logger (Session 16)
function logger(req, res, next) {
  const time = new Date().toLocaleTimeString();
  console.log(`${time} ${req.method} ${req.path}`);
  next(); // ne pas oublier next()
}

// Limites (Session 21). Configurables par variables d'environnement pour les tests en local.
const windowMs = 15 * 60 * 1000;
const apiLimiter = rateLimit({
  windowMs,
  limit: Number(process.env.API_RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' },
});
// Login : 5 essais RATES puis on attend (les connexions reussies ne comptent pas)
const loginLimiter = rateLimit({
  windowMs,
  limit: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again later.' },
});

app.set('trust proxy', 1); // derriere le proxy de l'hebergeur (Render) : sinon tout le monde a la meme IP
app.use(helmet()); // en-tetes de securite, X-Powered-By retire (Session 21)
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' })); // plafonne la taille du body (Session 21)
app.use(logger);

// Route que l'hebergeur peut "pinger" (Session 23) : declaree avant le limiter
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', apiLimiter);
app.use('/api/auth/login', loginLimiter);

// Public : signup / login. Protege : logout / me (voir routes/auth.js)
app.use('/api/auth', authRouter);

// Partie benevole : consulter, s'inscrire, annuler (chaque route est protegee dans son fichier)
app.use('/api/activities', activitiesRouter);
app.use('/api/missions', missionsRouter);
app.use('/api/registrations', registrationsRouter);

// Partie organisateur : activites et missions (chaque route est protegee dans son fichier)
app.use('/api/organizer', organizerMissionsRouter);
app.use('/api/organizer', organizerRouter);

// Rappels par email declenches par GitHub Actions (protege par CRON_SECRET, voir routes/cron.js)
app.use('/api/cron', cronRouter);

app.get("/", (req, res) => {
  res.send("Volunteer Activity Organizer API is running.");
});
// Aucune route ne correspond (apres toutes les routes)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Gestion d'erreurs : JSON malforme -> 400, body trop gros -> 413, le reste -> 500,
// sans jamais planter le serveur. Express 5 envoie ici les erreurs des handlers async.
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  if (err.status === 400 || err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

export default app;
