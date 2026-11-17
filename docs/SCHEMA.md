# Wireframes et schema (Capstone, Milestone 1)

## Parcours des ecrans

```mermaid
flowchart LR
  L[Login] -->|pas de compte| S[Sign up]
  S --> L
  L -->|role volunteer| A[Activities : liste + filtres date / lieu]
  A --> D[Activity details : missions, places restantes]
  D -->|Register| D
  A --> R[My registrations : statut, annuler]
  L -->|role organizer| O[Organizer space]
  O --> OC[Create activity + missions]
  O --> OE[Edit / Cancel activity, edit missions, export CSV]
```

## Maquettes basse fidelite

```
LOGIN                         ACTIVITIES (volunteer)
+---------------------+      +----------------------------------------+
| Log in              |      | [Activities] [My registrations] [Log out]
| Email [__________]  |      | Date [____] Location [____] [Search][Reset]
| Password [_______]  |      | Beach cleanup  14/12 09:00-12:00       |
| [Log in]            |      |   Collect litter : 5/5 spot(s) left    |
| No account? Sign up |      |   [View details]                       |
+---------------------+      +----------------------------------------+

ACTIVITY DETAILS             MY REGISTRATIONS
+---------------------+      +----------------------------------------+
| Food drive          |      | Solo mission - Food drive - 21/12      |
| Pack boxes 3 left   |      | Status: waiting list (position 2)      |
|   [Register]        |      | [Cancel registration]                  |
| Solo mission 0 left |      +----------------------------------------+
|   [Join waiting list]
+---------------------+

ORGANIZER SPACE
+--------------------------------------------------------+
| Create an Activity: title, date, times, location, desc |
|   Mission 1: name + spots   [Add mission]  [Create]    |
| My Activities                                          |
|   Beach cleanup  Active                                |
|     Collect litter - 2 spots left - Understaffed       |
|       Registered volunteers: Alice, Bob                |
|     [Edit Mission][Remove Mission] [Edit][Cancel][CSV] |
+--------------------------------------------------------+
```

## Schema de la base (PostgreSQL)

```mermaid
erDiagram
  users ||--o{ activities : "organise (organizer_id)"
  activities ||--o{ missions : "contient (activity_id)"
  missions ||--o{ registrations : "recoit (mission_id)"
  users ||--o{ registrations : "s'inscrit (user_id)"

  users {
    serial id PK
    text name
    text email UK
    text password_hash "bcrypt, jamais le mot de passe"
    text role "organizer | volunteer"
  }
  activities {
    serial id PK
    int organizer_id FK
    text title
    text description
    date date
    time start_time
    time end_time
    text location
    text status "open | cancelled"
  }
  missions {
    serial id PK
    int activity_id FK
    text title
    int spots_needed ">0"
  }
  registrations {
    serial id PK
    int mission_id FK
    int user_id FK
    text status "confirmed | waiting"
    timestamp created_at
  }
```

Regles : `UNIQUE (mission_id, user_id)` (pas de double inscription), suppression en cascade,
`end_time > start_time`. Chaque ecran a ses donnees : liste/details (`activities` + `missions` + `registrations`),
mes inscriptions (`registrations` filtre par `user_id`), espace organisateur (`activities` filtre par `organizer_id`).

Index : `activities(organizer_id)`, `activities(status, date)`, `missions(activity_id)`, `registrations(user_id)`.
