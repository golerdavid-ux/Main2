import React from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1>Where Skilled Trades<br />Meet Skilled Workers</h1>
          <p>
            Guildpost connects trade school graduates with contractors who need their exact skills.
            No keyword guessing. No buried postings. Just the right match between certified talent
            and employers who value craft.
          </p>
          <div className="hero-buttons">
            <Link to="/jobs" className="btn btn-secondary btn-lg">Find Work</Link>
            <Link to="/graduates" className="btn btn-outline btn-lg" style={{borderColor:'#fff',color:'#fff'}}>Find Talent</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <h3>200+</h3>
            <p>Graduates</p>
          </div>
          <div className="stat-item">
            <h3>50+</h3>
            <p>Contractors</p>
          </div>
          <div className="stat-item">
            <h3>5</h3>
            <p>Trade Schools</p>
          </div>
          <div className="stat-item">
            <h3>92%</h3>
            <p>Placement Rate</p>
          </div>
        </div>
      </section>

      {/* How it works — Graduates */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">How It Works for Graduates</h2>
          <p className="section-subtitle">From graduation day to your first job site in three steps</p>
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Upload Your Credentials</h3>
              <p>Add your certifications, tool experience, shift preferences, and the trade school you graduated from.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Get Matched</h3>
              <p>Our matching engine connects you with contractors who need your exact skills — not just keyword matches.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Start Your Career</h3>
              <p>Interview with contractors who already know what you can do. Your profile grows with every job and endorsement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — Contractors */}
      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title">How It Works for Contractors</h2>
          <p className="section-subtitle">Stop calling the same three contacts. Find pre-vetted talent ready to work.</p>
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Post Your Position</h3>
              <p>Specify trade, union/non-union, residential or commercial, travel radius, and progression timeline.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Browse Matched Candidates</h3>
              <p>See pre-vetted graduates ranked by how well they match your exact requirements — not generic resumes.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Fill Positions Faster</h3>
              <p>Connect directly with candidates who have the right certifications, availability, and location.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trades */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Trades We Support</h2>
          <p className="section-subtitle">Starting with the highest-demand skilled trades</p>
          <div className="trades-grid">
            <div className="trade-card">
              <div className="trade-icon">⚡</div>
              <h3>Electrical</h3>
            </div>
            <div className="trade-card">
              <div className="trade-icon">❄️</div>
              <h3>HVAC</h3>
            </div>
            <div className="trade-card">
              <div className="trade-icon">🔧</div>
              <h3>Plumbing</h3>
            </div>
            <div className="trade-card">
              <div className="trade-icon">🔥</div>
              <h3>Welding</h3>
            </div>
            <div className="trade-card">
              <div className="trade-icon">☀️</div>
              <h3>Solar Installation</h3>
            </div>
            <div className="trade-card">
              <div className="trade-icon">🪵</div>
              <h3>Carpentry</h3>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <h2>Partner With Guildpost</h2>
          <p>Trade schools: make Guildpost part of your graduation process and watch your placement rates climb.</p>
          <Link to="/for-schools" className="btn btn-secondary btn-lg">Learn About Partnerships</Link>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
