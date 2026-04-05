import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = 'http://localhost:5000/api';

function JobListings() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ trade: '', type: '', unionStatus: '', projectType: '', metro: '' });

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    fetch(`${API}/jobs?${params}`)
      .then(res => res.json())
      .then(data => { setJobs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filters]);

  const handleFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="page-header">
        <h1>Job Listings</h1>
        <p>Browse apprenticeships and positions from contractors in your area</p>
      </div>
      <div className="page-layout">
        <aside className="filters-sidebar">
          <h3>Filter Jobs</h3>
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
            <label>Job Type</label>
            <select value={filters.type} onChange={e => handleFilter('type', e.target.value)}>
              <option value="">All Types</option>
              <option value="Apprenticeship">Apprenticeship</option>
              <option value="Journeyman">Journeyman</option>
              <option value="Entry-Level">Entry-Level</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Union Status</label>
            <select value={filters.unionStatus} onChange={e => handleFilter('unionStatus', e.target.value)}>
              <option value="">Any</option>
              <option value="Union">Union</option>
              <option value="Non-Union">Non-Union</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Project Type</label>
            <select value={filters.projectType} onChange={e => handleFilter('projectType', e.target.value)}>
              <option value="">Any</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
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
        </aside>
        <div>
          {loading ? (
            <div className="loading"><div className="spinner"></div>Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="loading">No jobs found matching your filters.</div>
          ) : (
            <div className="card-grid">
              {jobs.map(job => (
                <Link to={`/jobs/${job.id}`} key={job.id} style={{textDecoration:'none'}}>
                  <div className="card job-card">
                    <div className="job-card-header">
                      <h3>{job.title}</h3>
                      <span className="badge badge-primary">{job.type}</span>
                    </div>
                    <div className="job-meta">
                      <span>🏢 {job.contractorName || 'Contractor'}</span>
                      <span>📍 {job.metro}</span>
                      <span>🔧 {job.trade}</span>
                    </div>
                    <p>{job.description?.substring(0, 120)}...</p>
                    <div className="tags">
                      <span className="badge badge-secondary">{job.unionStatus}</span>
                      <span className="badge badge-gray">{job.projectType}</span>
                      {job.wageRange && <span className="wage-range">{job.wageRange}</span>}
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

export default JobListings;
