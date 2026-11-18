import communityLogo from '../assets/community-logo.jpg';

export function Hero({ title, text, variant = 'compact' }) {
  return (
    <section className={`hero hero-${variant}`}>
      <div className="hero-text">
        <p className="hero-kicker">
          Together we will rebuild our future
        </p>

        <h1>{title}</h1>

        {text && <p className="hero-sub">{text}</p>}
      </div>

      {variant === 'full' && (
        <div className="hero-art" aria-hidden="true">
          <img
            className="community-logo hero-logo"
            src={communityLogo}
            alt=""
            width="612"
            height="612"
          />

          <p className="hero-logo-caption">
            A place to help. A community to belong to.
          </p>
        </div>
      )}
    </section>
  );
}