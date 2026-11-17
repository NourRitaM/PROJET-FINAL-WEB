// Donnees de test : npm run db:seed (relancable : repart toujours de zero pour ce compte).
// Les dates sont calculees : plage Beach cleanup = J+14, Food drive et Library help = J+21 (meme jour, heures qui se chevauchent).
// Cree un organisateur de test + 3 activites + des missions, dont une mission a 1 seule place
// ("Solo mission") pour tester la capacite pleine et la liste d'attente.
import bcrypt from 'bcrypt';
import { pool } from './pool.js';

const EMAIL = 'seed.organizer@test.dev';

// Dates relatives a aujourd'hui : les activites restent toujours "a venir" quand on relance le seed.
function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

try {
  const hash = await bcrypt.hash('hunter22', 12);
  await pool.query(
    `INSERT INTO users (name, username, email, password_hash, role)
     VALUES ('Seed Organizer', 'seed_organizer', $1, $2, 'organizer')
     ON CONFLICT (email) DO NOTHING`,
    [EMAIL, hash]
  );
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [EMAIL]);
  const organizerId = rows[0].id;

  // Repartir de zero : la suppression en cascade enleve missions et inscriptions
  await pool.query('DELETE FROM activities WHERE organizer_id = $1', [organizerId]);

  const activities = [
    ['Beach cleanup', 'Pick up litter along the shore.', inDays(14), '09:00', '12:00', 'Beirut Beach',
      [['Collect litter', 5], ['Sort recycling', 3]]],
    ['Food drive', 'Pack and hand out food boxes.', inDays(21), '10:00', '15:00', 'Campus Hall',
      [['Pack boxes', 4], ['Solo mission', 1]]],
    ['Library help', 'Shelve and label donated books.', inDays(21), '14:00', '17:00', 'City Library',
      [['Shelving', 2]]],
  ];

  for (const [title, description, date, start, end, location, missions] of activities) {
    const act = await pool.query(
      `INSERT INTO activities (organizer_id, title, description, date, start_time, end_time, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [organizerId, title, description, date, start, end, location]
    );
    for (const [missionTitle, spots] of missions) {
      await pool.query(
        'INSERT INTO missions (activity_id, title, spots_needed) VALUES ($1, $2, $3)',
        [act.rows[0].id, missionTitle, spots]
      );
    }
  }
  console.log('Seed done: 3 activities for', EMAIL);
} catch (err) {
  console.error('db:seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
