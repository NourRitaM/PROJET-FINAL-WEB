import { Hero } from '../components/Hero.jsx';

export function HomePage({ onNavigate, user = null }) {
  return (
    <>
      <Hero
        variant="full"
        title="Welcome to Volunteer Organizer"
        text="Bring your community together, organize meaningful activities, and make sure every volunteer knows where they can help."
      />
      <main className="home-page">
        <section aria-labelledby="problem-title">
          <h2 id="problem-title">From scattered messages to organized teamwork</h2>
          <p>
            Associations, church groups, communities, and university clubs often recruit
            volunteers through WhatsApp messages. It can be hard to keep track of who is
            coming, who is doing each task, and how many people are still needed.
          </p>
        </section>

        <section className="home-audience" aria-labelledby="audience-title">
          <h2 id="audience-title">Made for organizers and volunteers</h2>
          <div className="home-info-grid">
            <article>
              <h3>Organizers</h3>
              <p>
                Create activities, break them into missions, and set how many volunteers
                each task needs.
              </p>
            </article>
            <article>
              <h3>Volunteers</h3>
              <p>
                See what help is needed and sign up for the specific mission that suits you.
              </p>
            </article>
          </div>
          <p className="home-note">
            Accounts are for organizers and volunteers only. Children and other activity
            participants do not need accounts.
          </p>
        </section>

        <section aria-labelledby="solution-title">
          <h2 id="solution-title">Everyone can see what is covered</h2>
          <p>
            When a volunteer signs up for a mission, the remaining places update so the
            whole team can see what is still needed.
          </p>
        </section>

        <section className="home-example" aria-labelledby="example-title">
          <h2 id="example-title">For example: a children’s games afternoon</h2>
          <p>Saturday, 3–5 pm</p>
          <ul>
            <li>Run the games: 3 places</li>
            <li>Prepare the equipment: 2 places</li>
            <li>Welcome the children: 1 place</li>
          </ul>
          <p>
            When one volunteer signs up to run the games, the activity shows that 2 of 3
            places remain.
          </p>
        </section>

        <section className="home-actions" aria-label="Get started">
          {user ? (
            <>
              <h2>Welcome back, {user.name}!</h2>
              <button
                onClick={() => onNavigate(user.role === 'organizer' ? 'organizer' : 'activities')}
              >
                {user.role === 'organizer' ? 'Go to Organizer space' : 'Browse activities'}
              </button>
            </>
          ) : (
            <>
              <h2>Ready to make a difference together?</h2>
              <button onClick={() => onNavigate('signup')}>Create an account</button>
              <button type="button" onClick={() => onNavigate('login')}>Log in</button>
            </>
          )}
        </section>
      </main>
    </>
  );
}
