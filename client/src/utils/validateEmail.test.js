import { expect, it } from 'vitest';
import { validateEmail } from './validateEmail.js';

it('normalizes an allowed email address', () => {
  expect(validateEmail(' Alice@GMAIL.COM ')).toEqual({ ok: true, email: 'alice@gmail.com' });
});

it('suggests a correction for a common domain typo', () => {
  expect(validateEmail('alice@gmial.com')).toEqual({
    ok: false,
    message: 'Did you mean alice@gmail.com?',
  });
});

it('rejects unsupported domains and malformed addresses', () => {
  expect(validateEmail('alice@example.org')).toEqual({
    ok: false,
    message: 'Please use a Gmail, Outlook or iCloud email address.',
  });
  expect(validateEmail('not-an-email')).toEqual({
    ok: false,
    message: 'Please enter a valid email address.',
  });
});
