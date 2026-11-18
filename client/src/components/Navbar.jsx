import communityLogo from '../assets/community-logo.jpg';
import { useAuth } from '../auth/AuthContext.jsx';

export function Navbar({ onNavigate }) {
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    onNavigate('login');
  }

  return (
    <nav className="navbar">
      <strong>
        <img
          className="community-logo navbar-logo"
          src={communityLogo}
          alt=""
          width="612"
          height="612"
        />

        Volunteer Organizer
      </strong>

      <div className="navbar-links">
        <button
          type="button"
          onClick={() => onNavigate('home')}
        >
          Home
        </button>

        {user ? (
          <>
            {user.role === 'organizer' ? (
              <button onClick={() => onNavigate('organizer')}>
                Organizer space
              </button>
            ) : (
              <>
                <button onClick={() => onNavigate('activities')}>
                  Activities
                </button>

                <button onClick={() => onNavigate('registrations')}>
                  My registrations
                </button>
              </>
            )}

            <button
              className="navbar-user"
              title="My Profile"
              onClick={() => onNavigate('profile')}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
              </svg>

              @{user.username ?? user.name} ({user.role})
            </button>

            <button onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <button onClick={() => onNavigate('login')}>
              Log in
            </button>

            <button onClick={() => onNavigate('signup')}>
              Sign up
            </button>
          </>
        )}
      </div>
    </nav>
  );
}