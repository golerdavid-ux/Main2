import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const API = 'http://localhost:5000/api';

function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/jobs/${id}`).then(r => r.json()),
      fetch(`${API}/matches/job/${id}`).then(r => r.json()).catch(() => [])
    ]).then(([jobData, matchData]) => {
      setJob(jobData);
      setMatches(matchData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner"></div>Loading...</div>;
  if (!job) return <div className="loading">Job not found.</div>;

  const getScoreClass = (score) => score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

  return (
    <div>
      <div className="page-header">
        <h1>{job.title}</h1>
        <p>{job.contractorName} — {job.metro}</p>
      </div>
      <div className="detail-page">
        <div className="detail-grid">
          <div className="detail-main">
            <h2>About This Position</h2>
            <p>{job.description}</p>

            {job.requiredCertifications?.length > 0 && (
              <>
                <h2 style={{marginTop:24}}>Required Certifications</h2>
                <ul>
                  {job.requiredCertifications.map((cert, i) => <li key={i}>{cert}</li>)}
                </ul>
              </>
            )}

            <div style={{marginTop:32}}>
              <Link to="/signup/graduate" className="btn btn-primary btn-lg">Apply Now</Link>
            </div>
          </div>
          <div className="detail-sidebar">
            <div className="info-card">
              <h3>Job Details</h3>
              <div className="info-row"><span className="label">Trade</span><span className="value">{job.trade}</span></div>
              <div className="info-row"><span className="label">Type</span><span className="value">{job.type}</span></div>
              <div className="info-row"><span className="label">Union</span><span className="value">{job.unionStatus}</span></div>
              <div className="info-row"><span className="label">Project</span><span className="value">{job.projectType}</span></div>
              {job.wageRange && <div className="info-row"><span className="label">Wage</span><span className="value">{job.wageRange}</span></div>}
              {job.travelRadius && <div className="info-row"><span className="label">Travel</span><span className="value">{job.travelRadius}</span></div>}
              {job.progressionTimeline && <div className="info-row"><span className="label">Progression</span><span className="value">{job.progressionTimeline}</span></div>}
            </div>
          </div>
        </div>

        {matches.length > 0 && (
          <div style={{marginTop:40}}>
            <h2 className="section-title" style={{textAlign:'left',fontSize:'1.5rem'}}>Matched Graduates</h2>
            <p style={{color:'var(--gray-600)',marginBottom:20}}>Candidates ranked by skills alignment</p>
            {matches.map(match => (
              <Link to={`/graduates/${match.graduate?.id || match.graduateId}`} key={match.graduate?.id || match.graduateId} style={{textDecoration:'none',color:'inherit'}}>
                <div className="match-card">
                  <div className={`match-score ${getScoreClass(match.score)}`}>{match.score}%</div>
                  <div className="match-info">
                    <h4>{match.graduate?.name || 'Graduate'}</h4>
                    <p>{match.graduate?.trade} — {match.graduate?.school} — {match.graduate?.metro}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default JobDetail;
