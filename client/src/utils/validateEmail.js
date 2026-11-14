const ALLOWED_DOMAINS = [
  'gmail.com',
  'outlook.com', 'hotmail.com', 'live.com',
  'icloud.com', 'me.com',
];

const TYPO_HINTS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com',
  'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com',
  'hotmial.com': 'hotmail.com', 'iclod.com': 'icloud.com', 'icloud.con': 'icloud.com',
};

const EMAIL_FORMAT = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export function validateEmail(raw) {
  const email = String(raw || '').trim().toLowerCase();

  if (!EMAIL_FORMAT.test(email)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  const [name, domain] = email.split('@');

  if (TYPO_HINTS[domain]) {
    return { ok: false, message: `Did you mean ${name}@${TYPO_HINTS[domain]}?` };
  }
  if (!ALLOWED_DOMAINS.includes(domain)) {
    return { ok: false, message: 'Please use a Gmail, Outlook or iCloud email address.' };
  }
  return { ok: true, email };
}
