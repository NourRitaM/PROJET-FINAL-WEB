// Regles decidees avec l'equipe, au meme endroit pour l'API, les emails et les tests.
// Les jours sont comptes par rapport a la DATE de l'activite (activities.date).

// Un benevole CONFIRME peut quitter une mission jusqu'a 2 jours (48 h) avant l'activite.
// Ex. activite le 25 : annulation possible jusqu'au 23 inclus, refusee (409) a partir du 24.
// (Quitter une liste d'attente reste toujours possible : cela ne libere aucune place.)
export const CANCEL_DEADLINE_DAYS = 2;

// Le rappel par email part une seule fois, 1 ou 2 jours avant l'activite.
export const REMINDER_DAYS_BEFORE = 2;
