// Validation partagee par signup et par My Profile (un seul endroit pour les regles).
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Username : 3 a 30 caracteres, aucun espace. Lettres, chiffres, #, @, _, - ... tout est permis.
export function cleanUsername(value) {
  return typeof value === 'string' ? value.trim() : '';
}
export function usernameError(username) {
  if (!/^\S{3,30}$/u.test(username)) {
    return 'Username must be 3 to 30 characters with no spaces (letters, numbers and symbols like # are allowed)';
  }
  return null;
}

// Telephone : optionnel. Chiffres, +, espaces, ( ) - . acceptes ; 7 a 15 chiffres.
export function cleanPhone(value) {
  return typeof value === 'string' ? value.trim() : '';
}
export function phoneError(phone) {
  if (phone === '') return null; // pas obligatoire
  const digits = phone.replace(/\D/g, '');
  if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
    return 'Phone number must have 7 to 15 digits (you can use +, spaces, - and parentheses)';
  }
  return null;
}
