// A appeler quand une activite passe a 'cancelled' (la route d'annulation sera ajoutee par l'equipe) :
//   await query("UPDATE activities SET status = 'cancelled' WHERE id = $1 AND organizer_id = $2", [id, req.userId]);
//   notifyActivityCancelled(id);   // sans await : la reponse n'attend pas les emails
import { query } from '../db/pool.js';
import { sendActivityCancelled } from './mailer.js';

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
