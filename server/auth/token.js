// Signer et verifier les JWT (Session 19).
import 'dotenv/config';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

// Le token contient l'id (sub) et le role. Un JWT est signe, PAS chiffre :
// jamais de mot de passe ni de secret dedans.
export function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, SECRET, {
    expiresIn: '1h',
  });
}

// Lance une erreur si le token est modifie ou expire : toujours dans un try/catch.
export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
