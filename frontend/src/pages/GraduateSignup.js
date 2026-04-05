import React, { useState } from 'react';

const API = 'http://localhost:5000/api';

const CERTIFICATIONS = {
  Electrical: ['Journeyman Electrician License', 'OSHA 30', 'OSHA 10', 'NFPA 70E', 'EPA 608'],
  HVAC: ['EPA 608', 'OSHA 30', 'OSHA 10', 'R-410A Certification', 'NATE Certification'],
  Plumbing: ['Journeyman Plumber License', 'OSHA 10', 'OSHA 30', 'Medical Gas Certification', 'Backflow Prevention'],
  Welding: ['AWS D1.1', 'OSHA 10', 'OSHA 30', 'CWI', '6G Pipe Certification'],
  'Solar Installation': ['NABCEP PV Associate', 'OSHA 10', 'OSHA 30', 'NEC Code', 'EPA 608'],
  Carpentry: ['OSHA 10', 'OSHA 30', 'Lead-Safe Renovator', 'First Aid/CPR', 'Scaffolding Certification'],
};

function GraduateSignup() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', trade: '', school: '',
    graduationDate: '', certifications: [], toolExperience: '',
    shiftPreference: '', metro: '', unionPreference: '', bio: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'trade') setForm(prev => ({ ...prev, certifications: [] }));
  };

  const handleCert = (cert) => {
    setForm(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch(`${API}/graduates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, availability: 'Immediate' })
    })
      .then(r => r.json())
      .then(() => setSubmitted(true))
      .catch(() => setSubmitted(true));
  };

  if (submitted) {
    return (
      <div className="form-page" style={{textAlign:'center',paddingTop:80}}>
        <div className="form-success" style={{maxWidth:500,margin:'0 auto',padding:40}}>
          <h2 style={{marginBottom:12,color:'var(--success)'}}>Profile Created!</h2>
          <p style={{color:'var(--gray-700)'}}>Your Guildpost profile is live. Contractors can now find you based on your skills and certifications. We'll notify you when there's a match.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Create Your Graduate Profile</h1>
        <p>Free forever. Get matched with contractors who need your skills.</p>
      </div>
      <div className="form-page">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name *</label>
              <input name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Trade Specialty *</label>
              <select name="trade" value={form.trade} onChange={handleChange} required>
                <option value="">Select a trade</option>
                <option>Electrical</option>
                <option>HVAC</option>
                <option>Plumbing</option>
                <option>Welding</option>
                <option>Solar Installation</option>
                <option>Carpentry</option>
              </select>
            </div>
            <div className="form-group">
              <label>Trade School *</label>
              <input name="school" value={form.school} onChange={handleChange} required placeholder="e.g., Arizona Trade Institute" />
            </div>
            <div className="form-group">
              <label>Graduation Date *</label>
              <input type="date" name="graduationDate" value={form.graduationDate} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Shift Preference *</label>
              <select name="shiftPreference" value={form.shiftPreference} onChange={handleChange} required>
                <option value="">Select preference</option>
                <option>Day Shift</option>
                <option>Night Shift</option>
                <option>Flexible</option>
              </select>
            </div>
            <div className="form-group">
              <label>Metro Area *</label>
              <select name="metro" value={form.metro} onChange={handleChange} required>
                <option value="">Select metro</option>
                <option>Phoenix, AZ</option>
                <option>Denver, CO</option>
              </select>
            </div>
            <div className="form-group">
              <label>Union Preference</label>
              <select name="unionPreference" value={form.unionPreference} onChange={handleChange}>
                <option value="">No preference</option>
                <option>Union</option>
                <option>Non-Union</option>
                <option>Open to Both</option>
              </select>
            </div>
          </div>

          {form.trade && CERTIFICATIONS[form.trade] && (
            <div className="form-group" style={{marginTop:20}}>
              <label>Certifications</label>
              <div className="checkbox-group">
                {CERTIFICATIONS[form.trade].map(cert => (
                  <label key={cert}>
                    <input type="checkbox" checked={form.certifications.includes(cert)} onChange={() => handleCert(cert)} />
                    {cert}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-group" style={{marginTop:20}}>
            <label>Tool Experience</label>
            <textarea name="toolExperience" value={form.toolExperience} onChange={handleChange} placeholder="List tools and equipment you're experienced with..." rows={3} />
          </div>

          <div className="form-group">
            <label>Brief Bio</label>
            <textarea name="bio" value={form.bio} onChange={handleChange} placeholder="Tell contractors about yourself..." rows={3} />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%',marginTop:24}}>Create My Profile</button>
        </form>
      </div>
    </div>
  );
}

export default GraduateSignup;
