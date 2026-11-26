// Navigation cote client avec de vraies adresses (Session 17 : client-side routing).
// Chaque page a son URL : le bouton Retour du navigateur marche, une adresse peut etre partagee,
// et un rafraichissement reste sur la meme page (client/vercel.json renvoie index.html pour toutes les URLs).
const PATHS = {
  home: '/',
  login: '/login',
  signup: '/signup',
  profile: '/profile',
  activities: '/activities',
  registrations: '/my-registrations',
  organizer: '/organizer',
  'organizer-create': '/organizer/create',
  'organizer-activities': '/organizer/activities',
};

// '/activities/12' -> { page: 'activity', activityId: '12' } ; adresse inconnue -> accueil
export function routeFromPath(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const match = path.match(/^\/activities\/(\d+)$/);
  if (match) return { page: 'activity', activityId: match[1] };
  const page = Object.keys(PATHS).find((name) => PATHS[name] === path);
  return { page: page ?? 'home', activityId: null };
}

// { page: 'activity', activityId: '12' } -> '/activities/12'
export function pathFor({ page, activityId }) {
  if (page === 'activity' && activityId) return `/activities/${activityId}`;
  return PATHS[page] ?? '/';
}

// La page vraiment affichee depend aussi de l'utilisateur : un visiteur ne voit pas /activities,
// un organisateur ne voit pas les pages benevoles, etc.
export function visibleRoute(user, { page, activityId }) {
  if (!user) {
    return { page: ['login', 'signup'].includes(page) ? page : 'home', activityId: null };
  }
  if (page === 'home' || page === 'profile') return { page, activityId: null };
  if (user.role === 'organizer') {
    const organizerPages = ['organizer-create', 'organizer-activities'];
    return { page: organizerPages.includes(page) ? page : 'organizer', activityId: null };
  }
  if (page === 'registrations') return { page, activityId: null };
  if (page === 'activity' && activityId) return { page, activityId };
  return { page: 'activities', activityId: null };
}
