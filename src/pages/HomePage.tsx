import { Link } from "react-router-dom";

const FEATURE_CARDS = [
  {
    title: "Shoulders & Arms Focus",
    body: "Rear deltoid flies, raises, shoulder press, curls, and tricep pushdowns with dedicated PR tracking.",
    image:
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Chest, Back, and Pull Strength",
    body: "Chest press, lat pulldown, cable rows, pull ups, and dips all mapped into your weekly rotations.",
    image:
      "https://images.unsplash.com/photo-1534367610401-9f5ed68180aa?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Leg Day Progression",
    body: "Leg extensions, leg press, squats, hamstrings, and calf work with clear current-vs-max snapshots.",
    image:
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=80"
  }
];

export function HomePage(): JSX.Element {
  return (
    <section className="stack home-page">
      <article className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">PERFORMANCE STUDIO</p>
          <h2>Track every rep, gram, and decision</h2>
          <p>
            Your gym system now has a real front door: plan your week, run your calculators, and lock in normal working sets vs PR maxes.
          </p>
          <div className="row">
            <Link to="/dashboard" className="btn-primary">
              Open Dashboard
            </Link>
            <Link to="/calculators" className="btn-ghost">
              Explore Calculators
            </Link>
          </div>
        </div>
        <div className="hero-photo-wrap">
          <img
            src="https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=1200&q=80"
            alt="Athlete training in a modern gym"
          />
        </div>
      </article>

      <article className="card">
        <h3>Workout Systems Built Around Your Split</h3>
        <div className="feature-grid">
          {FEATURE_CARDS.map((card) => (
            <div key={card.title} className="feature-card interactive-lift">
              <img src={card.image} alt={card.title} />
              <div>
                <h4>{card.title}</h4>
                <p>{card.body}</p>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <h3>Quick Launch</h3>
        <div className="quick-grid">
          <Link to="/workouts" className="quick-tile interactive-lift">
            Log Normal / PR
          </Link>
          <Link to="/week-planner" className="quick-tile interactive-lift">
            Plan Training Week
          </Link>
          <Link to="/diet" className="quick-tile interactive-lift">
            Track Diet
          </Link>
          <Link to="/goals" className="quick-tile interactive-lift">
            Set Goals
          </Link>
        </div>
      </article>
    </section>
  );
}
