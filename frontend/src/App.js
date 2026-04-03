import React, { useState } from 'react';
import './App.css';

function App() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');

    // TODO: Replace this with your actual email service (Mailchimp, ConvertKit, Beehiiv, etc.)
    // Example Mailchimp: POST to your form action URL
    // Example ConvertKit: POST to https://api.convertkit.com/v3/forms/{form_id}/subscribe
    setTimeout(() => {
      setStatus('success');
      setEmail('');
    }, 800);
  };

  return (
    <div className="page">

      {/* ── NAV ── */}
      <nav className="nav">
        <span className="nav-logo">The AI Memo</span>
        <a href="#subscribe" className="nav-cta">Subscribe Free</a>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-badge">Every week. No fluff.</div>
        <h1 className="hero-headline">
          The AI insights that actually <span className="accent">matter</span>.
        </h1>
        <p className="hero-sub">
          A weekly memo breaking down the most important developments in AI —
          what's happening, why it matters, and what you should do about it.
          Written for curious humans, not engineers.
        </p>
        <a href="#subscribe" className="btn-primary hero-btn">Get the Weekly Memo →</a>
        <p className="hero-proof">Join 500+ readers. Free. Unsubscribe anytime.</p>
      </section>

      {/* ── WHAT YOU GET ── */}
      <section className="what-section">
        <div className="container">
          <h2 className="section-title">What's inside each issue</h2>
          <div className="cards">
            <div className="card">
              <div className="card-icon">🔍</div>
              <h3>Top AI Stories</h3>
              <p>The 3–5 most important AI developments of the week, curated and explained without the hype.</p>
            </div>
            <div className="card">
              <div className="card-icon">💡</div>
              <h3>Practical Takeaways</h3>
              <p>Concrete ways to apply new AI tools and trends to your work, business, or everyday life.</p>
            </div>
            <div className="card">
              <div className="card-icon">🔭</div>
              <h3>What to Watch</h3>
              <p>Early signals and emerging ideas worth tracking before everyone else is talking about them.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MY WHY ── */}
      <section className="why-section" id="why">
        <div className="container why-inner">
          <div className="why-text">
            <span className="section-eyebrow">My Why</span>
            <h2 className="section-title left">I started this because I was overwhelmed too.</h2>
            <p>
              AI moves fast — faster than any of us can keep up with alone. Every week there's a new model,
              a new tool, a new headline. Most of it is noise. Some of it is genuinely life-changing.
            </p>
            <p>
              I spent years working at the intersection of technology and strategy, and I got tired of
              watching smart people miss important shifts because they didn't have the time to cut through
              the noise themselves.
            </p>
            <p>
              So I started writing this memo — first for myself, then for a few colleagues who asked to be
              included. The goal has always been the same: give you the 10-minute read that makes you
              meaningfully more informed than everyone around you.
            </p>
            <p className="why-signature">— <em>Your Name</em></p>
          </div>
          <div className="why-visual">
            <div className="avatar-placeholder">
              <span>YN</span>
            </div>
            <div className="why-stats">
              <div className="stat">
                <strong>Weekly</strong>
                <span>Every Friday morning</span>
              </div>
              <div className="stat">
                <strong>~10 min</strong>
                <span>Read time</span>
              </div>
              <div className="stat">
                <strong>Free</strong>
                <span>Always</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SUBSCRIBE ── */}
      <section className="subscribe-section" id="subscribe">
        <div className="container subscribe-inner">
          <h2 className="subscribe-title">Stay ahead of the curve.</h2>
          <p className="subscribe-sub">
            Get the weekly AI memo delivered to your inbox every Friday.
          </p>

          {status === 'success' ? (
            <div className="success-message">
              <span className="success-icon">✓</span>
              <strong>You're in!</strong> Check your inbox — the next issue lands Friday.
            </div>
          ) : (
            <form className="subscribe-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                className="subscribe-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                className="btn-primary subscribe-btn"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Subscribing…' : 'Subscribe Free'}
              </button>
            </form>
          )}

          {status === 'error' && (
            <p className="error-text">Something went wrong — please try again.</p>
          )}
          <p className="subscribe-note">No spam. No ads. Unsubscribe in one click.</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} The AI Memo. All rights reserved.</p>
        <p className="footer-links">
          <a href="mailto:hello@example.com">Contact</a>
          <span>·</span>
          <a href="#why">About</a>
        </p>
      </footer>

    </div>
  );
}

export default App;
