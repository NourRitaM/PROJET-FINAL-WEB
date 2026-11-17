-- Les 4 tables du schema (proposition, page 2).
-- Le script peut etre relance sans erreur (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('organizer', 'volunteer'))
);

-- Profil : username unique + numero de telephone optionnel.
-- Ces ALTER sont relancables et migrent une base qui existe deja.
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone    TEXT;
-- Les anciens comptes n'ont pas de username : on leur en donne un (ex. user12), modifiable dans My Profile.
UPDATE users SET username = 'user' || id WHERE username IS NULL;
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
-- Unique sans tenir compte des majuscules : "Alex#1" et "alex#1" sont le meme username.
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_key ON users (lower(username));

CREATE TABLE IF NOT EXISTS activities (
  id           SERIAL PRIMARY KEY,
  organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  date         DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  location     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'cancelled')),
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS missions (
  id           SERIAL PRIMARY KEY,
  activity_id  INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  spots_needed INTEGER NOT NULL CHECK (spots_needed > 0)
);

CREATE TABLE IF NOT EXISTS registrations (
  id         SERIAL PRIMARY KEY,
  mission_id INTEGER NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waiting')),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  -- Regle de la proposition : pas de double inscription a la meme mission
  UNIQUE (mission_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_activities_organizer ON activities(organizer_id);
CREATE INDEX IF NOT EXISTS idx_missions_activity    ON missions(activity_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user   ON registrations(user_id);
-- Session 22 : la liste des benevoles filtre sur status + date a chaque affichage.
-- (UNIQUE (mission_id, user_id) cree deja un index qui sert aux recherches par mission.)
CREATE INDEX IF NOT EXISTS idx_activities_status_date ON activities(status, date);
