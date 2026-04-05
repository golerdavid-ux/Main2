import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = 'http://localhost:5000/api';

function ForSchools() {
  const [schools, setSchools] = useState([]);

  useEffect(() => {
    fetch(`${API}/schools`)
      .then(res => res.json())
      .then(data => setSchools(data))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="hero" style={{padding:'80px 20px'}}>
        <div className="container">
          <h1>Boost Your Placement Rates</h1>
          <p>
            Partner with Guildpost to connect your graduates directly with employers.
            When placement rates climb, enrollment follows.
          </p>
          <Link to="/signup/contractor" className="btn btn-secondary btn-lg">Become a Partner</Link>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <h2 className="section-title">How the Partnership Works</h2>
          <p className="section-subtitle">Guildpost becomes part of your graduation process</p>
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Integrate at Graduation</h3>
              <p>Students build their Guildpost profile as part of completing their program. Certifications, skills, and preferences are loaded on graduation day.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Track Placement</h3>
              <p>See real-time data on which graduates are getting matched, interviewing, and hired. Report placement rates with confidence.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Grow Over Time</h3>
              <p>Graduate profiles carry forward through journeyman certification and beyond. Your school's reputation compounds with every successful placement.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title">Why Schools Partner With Us</h2>
          <div className="card-grid" style={{maxWidth:900,margin:'0 auto'}}>
            <div className="card">
              <h3>Higher Placement Rates</h3>
              <p>Direct connections to local contractors mean graduates find work faster. Placement rates drive enrollment numbers — our platform makes yours climb.</p>
            </div>
            <div className="card">
              <h3>Skills-Based Matching</h3>
              <p>Graduates are matched on what they can actually do — certifications, tool experience, and trade specialty — not resume keywords.</p>
            </div>
            <div className="card">
              <h3>Lifetime Graduate Profiles</h3>
              <p>The profile built on graduation day grows with endorsements, project history, and verifications. Your school stays connected to alumni success.</p>
            </div>
            <div className="card">
              <h3>Enrollment Marketing</h3>
              <p>"92% of our graduates are employed within 60 days through Guildpost." That's a recruiting message that fills seats.</p>
            </div>
          </div>
        </div>
      </section>

      {schools.length > 0 && (
        <section className="section">
          <div className="container">
            <h2 className="section-title">Our Partner Schools</h2>
            <p className="section-subtitle">Leading trade schools in the Phoenix and Denver metros</p>
            <div className="card-grid" style={{maxWidth:900,margin:'0 auto'}}>
              {schools.map(school => (
                <div className="card" key={school.id}>
                  <h3>{school.name}</h3>
                  <div className="job-meta" style={{marginTop:8}}>
                    <span>📍 {school.location}</span>
                    <span>🎓 {school.graduateCount} graduates</span>
                  </div>
                  <div className="tags" style={{marginTop:12}}>
                    {school.tradesOffered?.map((trade, i) => (
                      <span key={i} className="badge badge-primary">{trade}</span>
                    ))}
                  </div>
                  {school.placementRate && (
                    <p style={{marginTop:12,fontWeight:600,color:'var(--primary)'}}>
                      {school.placementRate} placement rate
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="cta-section">
        <div className="container">
          <h2>Ready to Partner?</h2>
          <p>Join the trade schools already using Guildpost to place graduates faster and track outcomes better.</p>
          <Link to="/signup/contractor" className="btn btn-secondary btn-lg">Get in Touch</Link>
        </div>
      </section>
    </div>
  );
}

export default ForSchools;
