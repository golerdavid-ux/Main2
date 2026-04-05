import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="navbar-brand">
          <span className="icon">⚒</span> Guildpost
        </Link>
        <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <li><Link to="/jobs" onClick={() => setMenuOpen(false)}>Find Jobs</Link></li>
          <li><Link to="/graduates" onClick={() => setMenuOpen(false)}>Find Talent</Link></li>
          <li><Link to="/for-schools" onClick={() => setMenuOpen(false)}>For Schools</Link></li>
          <li><Link to="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link></li>
        </ul>
        <div className="nav-buttons">
          <Link to="/signup/graduate" className="btn btn-outline btn-sm">Graduate Sign Up</Link>
          <Link to="/signup/contractor" className="btn btn-primary btn-sm">Contractor Sign Up</Link>
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
