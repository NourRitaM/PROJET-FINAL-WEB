// Connexion a PostgreSQL (Session 18 : connecter, puis ecouter).
import 'dotenv/config'; // en premier, avant de lire process.env
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase / Neon demandent SSL : DB_SSL=true dans .env
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Raccourci : query('SELECT ... WHERE id = $1', [id])
// Toujours passer les valeurs dans le tableau (requetes parametrees, Session 21)
// et JAMAIS les coller dans la chaine SQL (injection SQL).
export const query = (text, params) => pool.query(text, params);
