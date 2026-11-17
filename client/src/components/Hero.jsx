// Bandeau d'en-tete des pages (style "Donority") : titre de la page + decor.
// variant="full"    -> grand bandeau avec panneau sombre a droite (accueil, connexion)
// variant="compact" -> bandeau simple pour les pages internes
export function Hero({ title, text, variant = 'compact' }) {
  return (
    <section className={`hero hero-${variant}`}>
      <div className="hero-text">
        <p className="hero-kicker">Together we will rebuild our future</p>
        <h1>{title}</h1>
        {text && <p className="hero-sub">{text}</p>}
      </div>
      {variant === 'full' && (
        <div className="hero-art" aria-hidden="true">
          <div className="hero-ring" />
          <span className="hero-word">Volunteer</span>
          <span className="hero-ribbon">Join the community</span>
        </div>
      )}
    </section>
  );
}
