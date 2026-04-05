import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = 'http://localhost:5000/api';

function GraduateDirectory() {
  const [graduates, setGraduates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ trade: '', metro: '', availability: '' });

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    fetch(`${API}/graduates?${params}`)
      .then(res => res.json())
      .then(data => { setGraduates(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filters]);

  const handleFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="page-header">
        <h1>Find Talent</h1>
        <p>Browse pre-vetted graduates from accredited trade school programs</p>
      </div>
      <div className="page-layout">
        <aside className="filters-sidebar">
          <h3>Filter Candidates</h3>
          <div className="filter-group">
            <label>Trade</label>
            <select value={filters.trade} onChange={e => handleFilter('trade', e.target.value)}>
              <option value="">All Trades</option>
              <option value="Electrical">Electrical</option>
              <option value="HVAC">HVAC</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Welding">Welding</option>
              <option value="Solar Installation">Solar Installation</option>
              <option value="Carpentry">Carpentry</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Metro Area</label>
            <select value={filters.metro} onChange={e => handleFilter('metro', e.target.value)}>
              <option value="">All Areas</option>
              <option value="Phoenix, AZ">Phoenix, AZ</option>
              <option value="Denver, CO">Denver, CO</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Availability</label>
            <select value={filters.availability} onChange={e => handleFilter('availability', e.target.value)}>
              <option value="">Any</option>
              <option value="Immediate">Immediate</option>
              <option value="2 Weeks">2 Weeks</option>
              <option value="1 Month">1 Month</option>
            </select>
          </div>
        </aside>
        <div>
          {loading ? (
            <div className="loading"><div className="spinner"></div>Loading graduates...</div>
          ) : graduates.length === 0 ? (
            <div className="loading">No graduates found matching your filters.</div>
          ) : (
            <div className="card-grid">
              {graduates.map(grad => (
                <Link to={`/graduates/${grad.id}`} key={grad.id} style={{textDecoration:'none'}}>
                  <div className="card job-card">
                    <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:12}}>
                      <div className="profile-avatar">{grad.name?.charAt(0)}</div>
                      <div>
                        <h3 style={{color:'var(--dark)'}}>{grad.name}</h3>
                        <p style={{color:'var(--primary)',fontWeight:600}}>{grad.trade}</p>
                      </div>
                    </div>
                    <div className="job-meta">
                      <span>🎓 {grad.school}</span>
                      <span>📍 {grad.metro}</span>
                    </div>
                    <div className="tags">
                      {grad.certifications?.slice(0, 3).map((cert, i) => (
                        <span key={i} className="badge badge-primary">{cert}</span>
                      ))}
                      <span className={`badge ${grad.availability === 'Immediate' ? 'badge-success' : 'badge-gray'}`}>
                        {grad.availability}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GraduateDirectory;
