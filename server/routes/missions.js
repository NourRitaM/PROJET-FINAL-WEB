// Inscription d'un benevole a une mission.
// Regle : s'il reste de la place -> 'confirmed', sinon -> 'waiting' (liste d'attente).
// Regle : pas deux missions en meme temps (meme date, heures qui se chevauchent) -> 409.
import express from 'express';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { notifyMissionRegistered } from '../email/notifications.js';

const missionsRouter = express.Router();

// POST /api/missions/:id/register   (benevole seulement)
// L'identite vient du token (req.userId), jamais du body (Session 21).
missionsRouter.post('/:id/register', requireAuth, requireRole('volunteer'), async (req, res) => {
  const missionId = Number(req.params.id);
  if (!Number.isInteger(missionId) || missionId < 1) {
    return res.status(404).json({ error: 'Mission not found' });
  }

  try {
    // Un benevole ne peut pas etre a deux endroits en meme temps : si une autre de ses
    // inscriptions (confirmee ou en attente) tombe le meme jour sur des heures qui se
    // chevauchent, on refuse. 16:00-17:00 puis 17:00-18:00 ne se chevauchent pas.
    const conflict = await query(
      `SELECT ra.title,
              to_char(ra.start_time, 'HH24:MI') AS start_time,
              to_char(ra.end_time, 'HH24:MI')   AS end_time
         FROM missions tm
         JOIN activities ta    ON ta.id = tm.activity_id
         JOIN registrations r  ON r.user_id = $2
         JOIN missions rm      ON rm.id = r.mission_id
         JOIN activities ra    ON ra.id = rm.activity_id
        WHERE tm.id = $1
          AND ta.status = 'open'
          AND ra.status = 'open'
          AND rm.id <> tm.id
          AND ra.date = ta.date
          AND ra.start_time < ta.end_time
          AND ta.start_time < ra.end_time
        LIMIT 1`,
      [missionId, req.userId]
    );
    if (conflict.rows.length > 0) {
      const c = conflict.rows[0];
      return res.status(409).json({
        error: `You already have a mission at the same time: ${c.title} (${c.start_time} - ${c.end_time})`,
      });
    }

    // Une seule requete : elle compte les places prises ET insere, avec le bon statut.
    // Le WHERE refuse les missions inexistantes ou dont l'activite est annulee.
    const { rows } = await query(
      `INSERT INTO registrations (mission_id, user_id, status)
       SELECT m.id, $2::int,
              CASE WHEN (SELECT COUNT(*) FROM registrations r
                          WHERE r.mission_id = m.id AND r.status = 'confirmed') < m.spots_needed
                   THEN 'confirmed' ELSE 'waiting' END
         FROM missions m
         JOIN activities a ON a.id = m.activity_id
        WHERE m.id = $1 AND a.status = 'open'
       RETURNING id, mission_id, user_id, status`,
      [missionId, req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Mission not found or activity cancelled' });
    }

    // Email "You are registered" (ou liste d'attente) : sans await, la reponse n'attend pas
    notifyMissionRegistered(rows[0].id).catch((err) => console.error('[email]', err.message));

    res.status(201).json(rows[0]);
  } catch (err) {
    // 23505 = UNIQUE (mission_id, user_id) : deja inscrit a cette mission
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You are already registered for this mission' });
    }
    throw err;
  }
});

export default missionsRouter;
