import communityLogo from './assets/community-logo.jpg';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useAuth } from './auth/AuthContext.jsx';
import { Navbar } from './components/Navbar.jsx';
import { RequireRole } from './components/RequireRole.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { SignupPage } from './pages/SignupPage.jsx';
import { pathFor, routeFromPath, visibleRoute } from './utils/pageState.js';

const OrganizerPage = lazy(() =>
  import('./pages/OrganizerPage.jsx').then((m) => ({
    default: m.OrganizerPage,
  }))
);

const ActivitiesPage = lazy(() =>
  import('./pages/ActivitiesPage.jsx').then((m) => ({
    default: m.ActivitiesPage,
  }))
);

const ActivityDetailsPage = lazy(() =>
  import('./pages/ActivityDetailsPage.jsx').then((m) => ({
    default: m.ActivityDetailsPage,
  }))
);

const ProfilePage = lazy(() =>
  import('./pages/ProfilePage.jsx').then((m) => ({
    default: m.ProfilePage,
  }))
);

const MyRegistrationsPage = lazy(() =>
  import('./pages/MyRegistrationsPage.jsx').then((m) => ({
    default: m.MyRegistrationsPage,
  }))
);

export default function App() {
  const { user } = useAuth();

  // La page vient de l'adresse (ex. /activities/12), plus de sessionStorage
  const [route, setRoute] = useState(() => routeFromPath(window.location.pathname));

  // Boutons Retour / Avancer du navigateur
  useEffect(() => {
    const onPopState = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function goTo(next) {
    const path = pathFor(next);
    if (path !== window.location.pathname) window.history.pushState(null, '', path);
    setRoute(next);
  }

  function navigateTo(nextPage) {
    goTo({ page: nextPage, activityId: null });
  }

  function openActivity(id) {
    goTo({ page: 'activity', activityId: String(id) });
  }

  // Ce qui est vraiment affiche (un visiteur sur /activities voit l'accueil, etc.)
  const { page, activityId } = visibleRoute(user, route);
  const visiblePath = pathFor({ page, activityId });

  // L'adresse suit toujours la page affichee (ex. apres connexion ou deconnexion)
  useEffect(() => {
    if (window.location.pathname !== visiblePath) {
      window.history.replaceState(null, '', visiblePath);
    }
  }, [visiblePath]);

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
    content = <ProfilePage />;
  } else if (user.role === 'organizer') {
    content = (
      <RequireRole allowed={['organizer']}>
        <OrganizerPage
          page={page}
          onNavigate={navigateTo}
        />
      </RequireRole>
    );
  } else {
    let volunteerPage;

    if (page === 'registrations') {
      volunteerPage = <MyRegistrationsPage />;
    } else if (page === 'activity' && activityId) {
      volunteerPage = (
        <ActivityDetailsPage
          activityId={activityId}
          onBack={() => navigateTo('activities')}
        />
      );
    } else {
      volunteerPage = (
        <ActivitiesPage onOpenActivity={openActivity} />
      );
    }

    content = (
      <RequireRole allowed={['volunteer']}>
        {volunteerPage}
      </RequireRole>
    );
  }

  // une cle par adresse : l'animation de transition rejoue a chaque changement de page
  const transitionKey = visiblePath;

  return (
    <>
      <Navbar onNavigate={navigateTo} />

      <Suspense
        fallback={
          <main>
            <p>Loading...</p>
          </main>
        }
      >
        <div key={transitionKey} className="page-transition">
          {content}
        </div>
      </Suspense>

      <footer className="site-footer">
        <img
          className="community-logo footer-logo"
          src={communityLogo}
          alt=""
          width="612"
          height="612"
        />

        <div>
          <strong>Volunteer Organizer</strong>
          <p>Together we will rebuild our future</p>
        </div>
      </footer>
    </>
  );
}