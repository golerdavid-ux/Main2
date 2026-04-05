import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const API = 'http://localhost:5000/api';

function GraduateProfile() {
  const { id } = useParams();
  const [graduate, setGraduate] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/graduates/${id}`).then(r => r.json()),
      fetch(`${API}/matches/graduate/${id}`).then(r => r.json()).catch(() => [])
    ]).then(([gradData, matchData]) => {
      setGraduate(gradData);
      setMatches(matchData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner"></div>Loading...</div>;
  if (!graduate) return <div className="loading">Graduate not found.</div>;

  const getScoreClass = (score) => score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

  return (
    <div>
      <div className="page-header">
        <h1>{graduate.name}</h1>
        <p>{graduate.trade} — {graduate.metro}</p>
      </div>
      <div className="detail-page">
        <div className="detail-grid">
          <div className="detail-main">
            <div className="profile-header">
              <div className="profile-avatar" style={{fontSize:'2rem'}}>{graduate.name?.charAt(0)}</div>
              <div>
                <h1 style={{fontSize:'1.6rem',marginBottom:4}}>{graduate.name}</h1>
                <p style={{color:'var(--primary)',fontWeight:600,fontSize:'1.1rem'}}>{graduate.trade}</p>
              </div>
            </div>

            {graduate.bio && (
              <>
                <h2>About</h2>
                <p style={{marginBottom:24}}>{graduate.bio}</p>
              </>
            )}

            <h2>Certifications</h2>
            <div className="tags" style={{marginBottom:24}}>
              {graduate.certifications?.map((cert, i) => (
                <span key={i} className="badge badge-primary">{cert}</span>
              ))}
            </div>

            {graduate.toolExperience && (
              <>
                <h2>Tool Experience</h2>
                <p style={{marginBottom:24}}>{graduate.toolExperience}</p>
              </>
            )}
          </div>
          <div className="detail-sidebar">
            <div className="info-card">
              <h3>Profile Details</h3>
              <div className="info-row"><span className="label">Trade</span><span className="value">{graduate.trade}</span></div>
              <div className="info-row"><span className="label">School</span><span className="value">{graduate.school}</span></div>
              <div className="info-row"><span className="label">Graduated</span><span className="value">{graduate.graduationDate}</span></div>
              <div className="info-row"><span className="label">Metro</span><span className="value">{graduate.metro}</span></div>
              <div className="info-row"><span className="label">Shift</span><span className="value">{graduate.shiftPreference}</span></div>
              <div className="info-row"><span className="label">Union</span><span className="value">{graduate.unionPreference || 'Open'}</span></div>
              <div className="info-row"><span className="label">Available</span><span className="value">{graduate.availability}</span></div>
            </div>
          </div>
        </div>

        {matches.length > 0 && (
          <div style={{marginTop:40}}>
            <h2 className="section-title" style={{textAlign:'left',fontSize:'1.5rem'}}>Matched Jobs</h2>
            <p style={{color:'var(--gray-600)',marginBottom:20}}>Positions ranked by skills alignment</p>
            {matches.map(match => (
              <Link to={`/jobs/${match.job?.id || match.jobId}`} key={match.job?.id || match.jobId} style={{textDecoration:'none',color:'inherit'}}>
                <div className="match-card">
                  <div className={`match-score ${getScoreClass(match.score)}`}>{match.score}%</div>
                  <div className="match-info">
                    <h4>{match.job?.title || 'Job'}</h4>
                    <p>{match.job?.contractorName} — {match.job?.trade} — {match.job?.metro}</p>
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

export default GraduateProfile;
