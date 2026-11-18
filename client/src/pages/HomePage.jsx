import { Hero } from '../components/Hero.jsx';

export function HomePage({ onNavigate, user = null }) {
  return (
    <>
      <Hero
        variant="full"
        title="Welcome to Volunteer Organizer"
        text="Bring your community together and help every volunteer find their role."
      />

      <main className="home-page">
        <section aria-labelledby="problem-title">
          <h2 id="problem-title">
            Less confusion. More teamwork.
          </h2>

          <p>
            Organize activities, share clear missions and see
            where help is still needed.
          </p>

          <ul className="home-highlights" aria-label="Benefits">
            <li>Clear roles</li>
            <li>Visible places</li>
            <li>One shared plan</li>
          </ul>
        </section>

        <section
          className="home-audience"
          aria-labelledby="audience-title"
        >
          <h2 id="audience-title">
            Made for organizers and volunteers
          </h2>

          <div className="home-info-grid">
            <article className="home-organizers">
              <h3>Organizers</h3>

              <ul>
                <li>Create and edit activities</li>
                <li>Add missions and set places</li>
                <li>See registered volunteers</li>
              </ul>
            </article>

            <article className="home-volunteers">
              <h3>Volunteers</h3>

              <ul>
                <li>Browse upcoming activities</li>
                <li>Join a mission</li>
                <li>Manage your registrations</li>
              </ul>
            </article>
          </div>

          <p className="home-note">
            Accounts are for organizers and volunteers only.
            Children and other activity participants do not need accounts.
          </p>
        </section>

        <section aria-labelledby="solution-title">
          <h2 id="solution-title">
            See what is still needed
          </h2>

          <p>
            Available places update after each registration.
          </p>
        </section>

        <section
          className="home-example"
          aria-labelledby="example-title"
        >
          <span className="home-example-label">Example</span>

          <h2 id="example-title">
            A children’s games morning
          </h2>

          <p>Saturday, 9–11 am</p>

          <ul className="home-missions">
            <li>
              <span>Run the games: 3 places</span>
              <strong>2 of 3 places left</strong>
            </li>

            <li>
              <span>Prepare the equipment: 2 places</span>
              <strong>2 of 2 places left</strong>
            </li>

            <li>
              <span>Welcome the children: 1 place</span>
              <strong>0 places left</strong>
            </li>
          </ul>

        </section>

        <section className="home-actions" aria-label="Get started">
          {user ? (
            <>
              <h2>Welcome back, {user.name}!</h2>

              <button
                onClick={() =>
                  onNavigate(
                    user.role === 'organizer'
                      ? 'organizer'
                      : 'activities'
                  )
                }
              >
                {user.role === 'organizer'
                  ? 'Go to Organizer space'
                  : 'Browse activities'}
              </button>
            </>
          ) : (
            <>
              <h2>Ready to make a difference together?</h2>

              <button onClick={() => onNavigate('signup')}>
                Create an account
              </button>

              <button
                type="button"
                onClick={() => onNavigate('login')}
              >
                Log in
              </button>
            </>
          )}
        </section>
      </main>
    </>
  );
}