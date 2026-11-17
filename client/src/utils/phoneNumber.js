import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function readPhoneNumber(form) {
  const nationalNumber = String(form.get('phoneNational') ?? '').trim();
  if (!nationalNumber) return { ok: true, phone: '' };

  const country = String(form.get('phoneCountry') ?? '');
  const parsed = parsePhoneNumberFromString(nationalNumber, country);
  if (!parsed?.isValid()) {
    return { ok: false, message: 'Enter a valid phone number for the selected country.' };
  }

  return { ok: true, phone: parsed.number };
}
