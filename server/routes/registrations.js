// Mes inscriptions + annulation (avec promotion automatique de la liste d'attente).
import express from 'express';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const registrationsRouter = express.Router();

// GET /api/registrations/mine   (benevole seulement)
// Declaree AVANT '/:id' pour que "mine" ne soit pas pris pour un id.
registrationsRouter.get('/mine', requireAuth, requireRole('volunteer'), async (req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.status, r.mission_id,
            m.title AS mission_title,
            a.id    AS activity_id,
            a.title AS activity_title,
            a.status AS activity_status,
            to_char(a.date, 'YYYY-MM-DD')    AS date,
            to_char(a.start_time, 'HH24:MI') AS start_time,
            to_char(a.end_time, 'HH24:MI')   AS end_time,
            a.location,
            -- position dans la file d'attente (1 = prochain a etre promu)
            CASE WHEN r.status = 'waiting' THEN
              (SELECT COUNT(*)::int FROM registrations w
                WHERE w.mission_id = r.mission_id AND w.status = 'waiting'
                  AND (w.created_at, w.id) <= (r.created_at, r.id))
            END AS waiting_position
       FROM registrations r
       JOIN missions m   ON m.id = r.mission_id
       JOIN activities a ON a.id = m.activity_id
      WHERE r.user_id = $1
      ORDER BY a.date, a.start_time`,
    [req.userId]
  );
  res.json(rows);
});

// DELETE /api/registrations/:id   (benevole seulement)
// On filtre par id ET proprietaire : on ne peut annuler que SA propre inscription,
// sinon 404 (Session 21).
registrationsRouter.delete('/:id', requireAuth, requireRole('volunteer'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(404).json({ error: 'Registration not found' });
  }

  const deleted = await query(
    'DELETE FROM registrations WHERE id = $1 AND user_id = $2 RETURNING mission_id, status',
    [id, req.userId]
  );
  if (deleted.rows.length === 0) {
    return res.status(404).json({ error: 'Registration not found' });
  }

  const { mission_id, status } = deleted.rows[0];
  let promoted = false;

  // Une place confirmee vient de se liberer : le plus ancien en attente la prend.
  // (Annuler une inscription 'waiting' ne libere aucune place.)
  if (status === 'confirmed') {
    const next = await query(
      `UPDATE registrations SET status = 'confirmed'
        WHERE id = (SELECT id FROM registrations
                     WHERE mission_id = $1 AND status = 'waiting'
                     ORDER BY created_at, id
                     LIMIT 1)
        RETURNING id`,
      [mission_id]
    );
    promoted = next.rows.length > 0;
  }

  res.json({ message: 'Registration cancelled', promoted });
});

export default registrationsRouter;
