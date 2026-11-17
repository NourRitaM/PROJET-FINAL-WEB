const PAGE_STORAGE_KEY = 'vo-current-page';

const VALID_PAGES = new Set([
  'home',
  'login',
  'signup',
  'activities',
  'activity',
  'registrations',
  'organizer',
  'profile',
]);

export function getStoredPage() {
  const page = sessionStorage.getItem(PAGE_STORAGE_KEY);
  return VALID_PAGES.has(page) ? page : 'home';
}

export function storePage(page) {
  sessionStorage.setItem(PAGE_STORAGE_KEY, page);
}
