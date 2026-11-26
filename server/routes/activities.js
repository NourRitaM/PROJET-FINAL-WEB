// Consultation des activites : liste (avec recherche) et details.
// Tout utilisateur connecte peut consulter -> requireAuth seulement (Session 19 / 21).
import express from 'express';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/requireAuth.js';

const activitiesRouter = express.Router();

// "2026-12-31" valide ET reel (refuse 2026-02-31) : on valide l'entree avant la base (Session 21)
function isValidDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const d = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(text);
}

// GET /api/activities?title=beach&date=2026-12-31&location=campus  (activites a venir, ouvertes)
// Les trois filtres sont optionnels. Les valeurs passent TOUJOURS en parametres ($1, $2).
activitiesRouter.get('/', requireAuth, async (req, res) => {
  const title = typeof req.query.title === 'string' ? req.query.title.trim() : '';
  const date = typeof req.query.date === 'string' ? req.query.date.trim() : '';
  const location = typeof req.query.location === 'string' ? req.query.location.trim() : '';

  if (title.length > 100) {
    return res.status(400).json({ error: 'title is too long (max 100 characters)' });
  }
  if (date && !isValidDate(date)) {
    return res.status(400).json({ error: 'date must look like YYYY-MM-DD' });
  }
  if (location.length > 100) {
    return res.status(400).json({ error: 'location is too long (max 100 characters)' });
  }

  const { rows } = await query(
    `SELECT a.id, a.title, a.description,
            to_char(a.date, 'YYYY-MM-DD')      AS date,
            to_char(a.start_time, 'HH24:MI')   AS start_time,
            to_char(a.end_time, 'HH24:MI')     AS end_time,
            a.location, a.status,
            (SELECT COUNT(*)::int FROM missions m WHERE m.activity_id = a.id) AS mission_count,
            -- places restantes par mission (ex. 2 sur 3) : demandees - inscriptions confirmees
            COALESCE((SELECT json_agg(json_build_object(
                        'id', m.id,
                        'title', m.title,
                        'spots_needed', m.spots_needed,
                        'spots_left', GREATEST(0, m.spots_needed - (
                          SELECT COUNT(*)::int FROM registrations r
                           WHERE r.mission_id = m.id AND r.status = 'confirmed'))
                      ) ORDER BY m.id)
                        FROM missions m WHERE m.activity_id = a.id), '[]'::json) AS missions
       FROM activities a
      WHERE a.status = 'open'
        AND a.date >= CURRENT_DATE   -- activites a venir seulement
        AND ($1::date IS NULL OR a.date = $1::date)
        AND ($2::text IS NULL OR a.location ILIKE '%' || $2::text || '%')
        AND ($3::text IS NULL OR a.title ILIKE '%' || $3::text || '%')
      ORDER BY a.date, a.start_time`,
    [date || null, location || null, title || null] // filtre vide -> NULL -> pas de filtre
  );
  res.json(rows);
});

// GET /api/activities/:id : l'activite + ses missions avec places restantes
// et, pour le benevole connecte, son propre statut dans chaque mission.
activitiesRouter.get('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id); // un id dans l'URL est une chaine (Session 21)
  if (!Number.isInteger(id) || id < 1) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  const act = await query(
    `SELECT a.id, a.title, a.description,
            to_char(a.date, 'YYYY-MM-DD')    AS date,
            to_char(a.start_time, 'HH24:MI') AS start_time,
            to_char(a.end_time, 'HH24:MI')   AS end_time,
            a.location, a.status
       FROM activities a
      WHERE a.id = $1`,
    [id]
  );
  if (act.rows.length === 0) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  const { rows } = await query(
    `SELECT m.id, m.title, m.spots_needed,
            (SELECT COUNT(*)::int FROM registrations r
              WHERE r.mission_id = m.id AND r.status = 'confirmed') AS confirmed_count,
            (SELECT COUNT(*)::int FROM registrations r
              WHERE r.mission_id = m.id AND r.status = 'waiting')   AS waiting_count,
            (SELECT r.id FROM registrations r
              WHERE r.mission_id = m.id AND r.user_id = $2)         AS my_registration_id,
            (SELECT r.status FROM registrations r
              WHERE r.mission_id = m.id AND r.user_id = $2)         AS my_status
       FROM missions m
      WHERE m.activity_id = $1
      ORDER BY m.id`,
    [id, req.userId]
  );

  // Places restantes = places demandees - inscriptions confirmees (jamais sous 0)
  const missions = rows.map((m) => ({
    ...m,
    spots_left: Math.max(0, m.spots_needed - m.confirmed_count),
  }));

  res.json({ ...act.rows[0], missions });
});

export default activitiesRouter;
