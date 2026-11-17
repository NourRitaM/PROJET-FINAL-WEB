import { lazy, Suspense, useState } from 'react';
import { useAuth } from './auth/AuthContext.jsx';
import { Navbar } from './components/Navbar.jsx';
import { RequireRole } from './components/RequireRole.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { SignupPage } from './pages/SignupPage.jsx';
import { getStoredPage, storePage } from './utils/pageState.js';

// Code splitting (Session 22) : login / signup restent dans le bundle de depart (petits, vus en premier) ;
// chaque espace connecte est charge seulement quand on y entre. Les pages sont des exports nommes :
// on les adapte pour React.lazy, qui attend un export par defaut.
const OrganizerPage = lazy(() =>
  import('./pages/OrganizerPage.jsx').then((m) => ({ default: m.OrganizerPage })));
const ActivitiesPage = lazy(() =>
  import('./pages/ActivitiesPage.jsx').then((m) => ({ default: m.ActivitiesPage })));
const ActivityDetailsPage = lazy(() =>
  import('./pages/ActivityDetailsPage.jsx').then((m) => ({ default: m.ActivityDetailsPage })));
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage.jsx').then((m) => ({ default: m.ProfilePage })));
const MyRegistrationsPage = lazy(() =>
  import('./pages/MyRegistrationsPage.jsx').then((m) => ({ default: m.MyRegistrationsPage })));

// La page affichee est un state (Session 14) ; l'App garde l'acces selon le token
// (Session 20) puis selon le role.
// Pages benevole : 'activities' (liste + recherche), 'activity' (details), 'registrations'.
export default function App() {
  const { user } = useAuth();
  const [page, setPage] = useState(getStoredPage);
  const [activityId, setActivityId] = useState(() => sessionStorage.getItem('vo-activity-id'));

  function navigateTo(nextPage) {
    storePage(nextPage);
    setPage(nextPage);
  }

  function openActivity(id) {
    sessionStorage.setItem('vo-activity-id', id);
    setActivityId(id);
    navigateTo('activity');
  }

  let content;
  if (!user) {
    if (page === 'signup') {
      content = <SignupPage onNavigate={navigateTo} />;
    } else if (page === 'login') {
      content = <LoginPage onNavigate={navigateTo} />;
    } else {
      content = <HomePage onNavigate={navigateTo} />;
    }
  } else if (page === 'home') {
    content = <HomePage user={user} onNavigate={navigateTo} />;
  } else if (page === 'profile') {
    // Meme page pour le volontaire et l'organisateur
    content = <ProfilePage />;
  } else if (user.role === 'organizer') {
    const organizerPage = ['organizer-create', 'organizer-activities'].includes(page)
      ? page
      : 'organizer';
    content = (
      <RequireRole allowed={['organizer']}>
        <OrganizerPage page={organizerPage} onNavigate={navigateTo} />
      </RequireRole>
    );
  } else {
    // Benevole : la liste des activites est la page par defaut
    let volunteerPage;
    if (page === 'registrations') {
      volunteerPage = <MyRegistrationsPage />;
    } else if (page === 'activity' && activityId) {
      volunteerPage = (
        <ActivityDetailsPage activityId={activityId} onBack={() => navigateTo('activities')} />
      );
    } else {
      volunteerPage = <ActivitiesPage onOpenActivity={openActivity} />;
    }
    content = <RequireRole allowed={['volunteer']}>{volunteerPage}</RequireRole>;
  }

  const transitionKey = !user
    ? ['login', 'signup'].includes(page) ? page : 'home'
    : page === 'home' || page === 'profile' ? page
      : user.role === 'organizer'
        ? ['organizer-create', 'organizer-activities'].includes(page) ? page : 'organizer'
        : page === 'registrations' ? 'registrations'
          : page === 'activity' && activityId ? `activity-${activityId}` : 'activities';

  return (
    <>
      <Navbar onNavigate={navigateTo} />
      <Suspense fallback={<main><p>Loading...</p></main>}>
        <div key={transitionKey} className="page-transition">{content}</div>
      </Suspense>
      <footer className="site-footer">
        <p><span aria-hidden="true">♥</span> Volunteer Organizer · Together we will rebuild our future</p>
      </footer>
    </>
  );
}
