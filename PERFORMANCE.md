# PERFORMANCE.md : Session 22


```bash
cd client && npm run build && npm run preview   # http://localhost:4173, onglet prive, sans extensions
```


## Optimisations 

| Optimisation | Ou | Effet attendu |
|---|---|---|
| Code splitting : `React.lazy` + `Suspense` sur les 4 pages connectees | `client/src/App.jsx` | Le bundle de depart ne contient que login / signup ; `npm run build` affiche un fichier par page. Colle les tailles `kB` avant / apres ici. |
| Index `activities(status, date)` | `server/db/schema.sql` | La liste des benevoles filtre sur ces deux colonnes a chaque affichage |
| Index `activities(organizer_id)`, `missions(activity_id)`, `registrations(user_id)` | `server/db/schema.sql` | Evite de lire toutes les lignes (COLLSCAN) |
| Requete unique pour l'inscription (compte + insert) | `server/routes/missions.js` | Un seul aller-retour a la base |

Verifier un index : `EXPLAIN ANALYZE SELECT ... FROM activities WHERE status='open' AND date >= CURRENT_DATE;`
(le plan doit parler d'`Index Scan` quand la table est grande).

## Corrige : une optimisation a choisir dans "Opportunities" (une seule suffit pour le livrable)
A REMPLIR : laquelle, le score avant, le score apres.
