import { useAuth } from '../auth/AuthContext.jsx';

// Barre de navigation : change selon l'etat de connexion et le role.
export function Navbar({ onNavigate }) {
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    onNavigate('login');
  }

  return (
    <nav className="navbar">
      <strong>Volunteer Organizer</strong>
      <div className="navbar-links">
        {user ? (
          <>
            <button onClick={() => onNavigate(user.role)}>
              {user.role === 'organizer' ? 'Organizer space' : 'Volunteer space'}
            </button>
            <span>{user.name} ({user.role})</span>
            <button onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <button onClick={() => onNavigate('login')}>Log in</button>
            <button onClick={() => onNavigate('signup')}>Sign up</button>
          </>
        )}
      </div>
    </nav>
  );
}
