import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';

function ContractorDirectory() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/contractors`)
      .then(res => res.json())
      .then(data => { setContractors(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Contractor Directory</h1>
        <p>Employers actively hiring skilled trade workers</p>
      </div>
      <div className="container" style={{padding:'40px 20px'}}>
        {loading ? (
          <div className="loading"><div className="spinner"></div>Loading contractors...</div>
        ) : (
          <div className="card-grid">
            {contractors.map(c => (
              <div className="card" key={c.id}>
                <h3>{c.companyName}</h3>
                <div className="job-meta" style={{marginTop:8}}>
                  <span>🔧 {c.tradeFocus || c.primaryTrade}</span>
                  <span>📍 {c.metro}</span>
                </div>
                <p style={{margin:'12px 0'}}>{c.description || `Hiring skilled ${c.tradeFocus || c.primaryTrade} professionals in the ${c.metro} area.`}</p>
                <div className="tags">
                  <span className="badge badge-primary">{c.unionStatus}</span>
                  <span className="badge badge-gray">{c.projectType}</span>
                  {c.travelRadius && <span className="badge badge-secondary">{c.travelRadius} radius</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ContractorDirectory;
