// A appeler quand une activite passe a 'cancelled' (la route d'annulation sera ajoutee par l'equipe) :
//   await query("UPDATE activities SET status = 'cancelled' WHERE id = $1 AND organizer_id = $2", [id, req.userId]);
//   notifyActivityCancelled(id);   // sans await : la reponse n'attend pas les emails
import { query } from '../db/pool.js';
import { sendActivityCancelled, sendMissionRegistered } from './mailer.js';
import { CANCEL_DEADLINE_DAYS } from '../rules.js';

// Apres POST /api/missions/:id/register (routes/missions.js), sans await :
// la reponse n'attend pas l'email, et un email rate ne fait pas echouer l'inscription.
export async function notifyMissionRegistered(registrationId) {
  const { rows } = await query(
    `SELECT u.name, u.email, r.status,
            m.title AS mission_title,
            a.title AS activity_title,
            to_char(a.date, 'YYYY-MM-DD')        AS date,
            to_char(a.start_time, 'HH24:MI')     AS start_time,
            to_char(a.end_time, 'HH24:MI')       AS end_time,
            a.location,
            to_char(a.date - $2::int, 'YYYY-MM-DD') AS cancel_deadline
       FROM registrations r
       JOIN users u      ON u.id = r.user_id
       JOIN missions m   ON m.id = r.mission_id
       JOIN activities a ON a.id = m.activity_id
      WHERE r.id = $1`,
    [registrationId, CANCEL_DEADLINE_DAYS]
  );
  if (rows.length === 0) return;
  await sendMissionRegistered(rows[0]);
}

export async function notifyActivityCancelled(activityId) {
  const act = await query(
    "SELECT title, to_char(date, 'YYYY-MM-DD') AS date FROM activities WHERE id = $1",
    [activityId]
  );
  if (act.rows.length === 0) return;

  // Tous les benevoles inscrits a une mission de cette activite
  const { rows } = await query(
    `SELECT DISTINCT u.name, u.email
       FROM registrations r
       JOIN missions m ON m.id = r.mission_id
       JOIN users u ON u.id = r.user_id
      WHERE m.activity_id = $1`,
    [activityId]
  );
  await sendActivityCancelled(act.rows[0], rows);
}
