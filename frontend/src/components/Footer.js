import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-col">
          <h4>For Graduates</h4>
          <ul>
            <li><Link to="/jobs">Find Jobs</Link></li>
            <li><Link to="/signup/graduate">Create Profile</Link></li>
            <li><Link to="/jobs">Browse Apprenticeships</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>For Contractors</h4>
          <ul>
            <li><Link to="/signup/contractor">Post a Job</Link></li>
            <li><Link to="/graduates">Browse Candidates</Link></li>
            <li><Link to="/pricing">Pricing</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Partners</h4>
          <ul>
            <li><Link to="/for-schools">Trade Schools</Link></li>
            <li><Link to="/contractors">Workforce Boards</Link></li>
            <li><Link to="/">About Guildpost</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Guildpost</h4>
          <ul>
            <li>Phoenix, AZ & Denver, CO</li>
            <li>info@guildpost.io</li>
            <li>(602) 555-0190</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        &copy; 2026 Guildpost. Where skilled trades meet skilled workers.
      </div>
    </footer>
  );
}

export default Footer;
