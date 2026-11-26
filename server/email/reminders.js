// Rappel par email 1 ou 2 jours avant l'activite (benevoles CONFIRMES seulement).
//
// Qui appelle sendDueReminders() ?
//  - server.js : au demarrage puis toutes les heures (startReminderTimer) ;
//  - POST /api/cron/reminders (routes/cron.js), appele chaque jour par
//    .github/workflows/reminders.yml : sur Render gratuit le serveur s'endort quand
//    personne ne visite le site, ce workflow le reveille pour que les rappels partent quand meme.
//
// La colonne registrations.reminder_sent_at garantit UN SEUL rappel par inscription,
// meme si les deux mecanismes tournent en meme temps.
import { query } from '../db/pool.js';
import { sendMissionReminder } from './mailer.js';
import { REMINDER_DAYS_BEFORE } from '../rules.js';

const ONE_HOUR = 60 * 60 * 1000;
// Resend (offre gratuite) accepte environ 2 emails par seconde : on espace les envois.
const PAUSE_BETWEEN_EMAILS_MS = 600;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendDueReminders() {
  // Sans cle Resend, aucun email ne peut partir : on ne marque rien comme envoye,
  // les rappels partiront des que RESEND_API_KEY sera renseignee.
  if (!process.env.RESEND_API_KEY) return { due: 0, sent: 0, skipped: 'RESEND_API_KEY missing' };

  // 1. On "reserve" les rappels a envoyer en une seule requete (UPDATE ... RETURNING) :
  //    si deux appels arrivent en meme temps, PostgreSQL ne donne chaque ligne qu'a un seul.
  const { rows } = await query(
    `UPDATE registrations r
        SET reminder_sent_at = now()
       FROM missions m, activities a, users u
      WHERE m.id = r.mission_id
        AND a.id = m.activity_id
        AND u.id = r.user_id
        AND r.status = 'confirmed'
        AND r.reminder_sent_at IS NULL
        AND a.status = 'open'
        AND a.date - CURRENT_DATE BETWEEN 1 AND $1
      RETURNING r.id, u.name, u.email,
                m.title AS mission_title,
                a.title AS activity_title,
                to_char(a.date, 'YYYY-MM-DD')    AS date,
                to_char(a.start_time, 'HH24:MI') AS start_time,
                to_char(a.end_time, 'HH24:MI')   AS end_time,
                a.location`,
    [REMINDER_DAYS_BEFORE]
  );

  // 2. On envoie. Un email rate redevient "a envoyer" : il repartira au prochain passage.
  let sent = 0;
  for (const [i, r] of rows.entries()) {
    if (i > 0) await pause(PAUSE_BETWEEN_EMAILS_MS);
    if (await sendMissionReminder(r)) {
      sent += 1;
    } else {
      await query('UPDATE registrations SET reminder_sent_at = NULL WHERE id = $1', [r.id]);
    }
  }
  if (rows.length > 0) console.log(`[reminders] ${sent}/${rows.length} reminder(s) sent`);
  return { due: rows.length, sent };
}

// Lance un passage tout de suite, puis toutes les heures. Une erreur est loggee, jamais fatale.
export function startReminderTimer() {
  const run = () => sendDueReminders().catch((err) => console.error('[reminders]', err.message));
  run();
  // unref() : le minuteur n'empeche pas Node de s'arreter proprement
  setInterval(run, ONE_HOUR).unref();
}
