// Envoi d'emails avec Resend (API REST appelee avec fetch : aucune dependance en plus).
// Un email qui echoue ne doit JAMAIS faire echouer la requete : on log et on continue.
const RESEND_URL = 'https://api.resend.com/emails';

// Le texte vient des utilisateurs : on l'echappe avant de le mettre dans du HTML (Session 21).
function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[email] RESEND_API_KEY manquant : email non envoye');
    return false;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error('[email] echec', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] echec', err.message);
    return false;
  }
}

// Email 1 : inscription confirmee
export function sendSignupConfirmation(user) {
  return sendEmail({
    to: user.email,
    subject: 'Welcome to Volunteer Organizer',
    html: `<p>Hello ${esc(user.name)},</p>
<p>Your account is confirmed. You are registered as <strong>${esc(user.role)}</strong>.</p>`,
  });
}

// Email 2 : activite annulee (un email par benevole)
export function sendActivityCancelled(activity, recipients) {
  return Promise.all(
    recipients.map((r) =>
      sendEmail({
        to: r.email,
        subject: `Activity cancelled: ${activity.title}`,
        html: `<p>Hello ${esc(r.name)},</p>
<p>The activity <strong>${esc(activity.title)}</strong> planned on ${esc(activity.date)} has been cancelled.</p>`,
      })
    )
  );
}
