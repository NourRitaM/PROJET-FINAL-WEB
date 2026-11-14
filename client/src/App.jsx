import { useState } from 'react';
import { useAuth } from './auth/AuthContext.jsx';
import { Navbar } from './components/Navbar.jsx';
import { RequireRole } from './components/RequireRole.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { SignupPage } from './pages/SignupPage.jsx';
import { OrganizerPage } from './pages/OrganizerPage.jsx';
import { VolunteerPage } from './pages/VolunteerPage.jsx';

// La page affichee est un state (Session 14) ; l'App garde l'acces selon le token
// (Session 20) puis selon le role.
export default function App() {
  const { user } = useAuth();
  const [page, setPage] = useState('login');

  let content;
  if (!user) {
    content = page === 'signup'
      ? <SignupPage onNavigate={setPage} />
      : <LoginPage onNavigate={setPage} />;
  } else {
    // Connecte : on ouvre l'espace de son role par defaut
    const current = page === 'organizer' || page === 'volunteer' ? page : user.role;
    content = current === 'organizer'
      ? <RequireRole allowed={['organizer']}><OrganizerPage /></RequireRole>
      : <RequireRole allowed={['volunteer']}><VolunteerPage /></RequireRole>;
  }

  return (
    <>
      <Navbar onNavigate={setPage} />
      {content}
    </>
  );
}
