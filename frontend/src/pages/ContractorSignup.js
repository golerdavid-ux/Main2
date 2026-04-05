import React, { useState } from 'react';

const API = 'http://localhost:5000/api';

function ContractorSignup() {
  const [form, setForm] = useState({
    companyName: '', contactName: '', email: '', phone: '',
    primaryTrade: '', unionStatus: '', projectType: '',
    metro: '', travelRadius: '', description: '', subscriptionTier: 'Professional'
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch(`${API}/contractors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
      .then(r => r.json())
      .then(() => setSubmitted(true))
      .catch(() => setSubmitted(true));
  };

  if (submitted) {
    return (
      <div className="form-page" style={{textAlign:'center',paddingTop:80}}>
        <div className="form-success" style={{maxWidth:500,margin:'0 auto',padding:40}}>
          <h2 style={{marginBottom:12,color:'var(--success)'}}>Account Created!</h2>
          <p style={{color:'var(--gray-700)'}}>Your Guildpost contractor account is set up. You can now post jobs and browse pre-vetted candidates matched to your requirements.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Contractor Sign Up</h1>
        <p>Access pre-vetted trade school graduates matched to your needs</p>
      </div>
      <div className="form-page">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Company Name *</label>
              <input name="companyName" value={form.companyName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Contact Name *</label>
              <input name="contactName" value={form.contactName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Phone *</label>
              <input name="phone" value={form.phone} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Primary Trade *</label>
              <select name="primaryTrade" value={form.primaryTrade} onChange={handleChange} required>
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
              <label>Union Status *</label>
              <select name="unionStatus" value={form.unionStatus} onChange={handleChange} required>
                <option value="">Select</option>
                <option>Union</option>
                <option>Non-Union</option>
              </select>
            </div>
            <div className="form-group">
              <label>Project Type *</label>
              <select name="projectType" value={form.projectType} onChange={handleChange} required>
                <option value="">Select</option>
                <option>Residential</option>
                <option>Commercial</option>
                <option>Both</option>
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
              <label>Travel Radius</label>
              <select name="travelRadius" value={form.travelRadius} onChange={handleChange}>
                <option value="">Select</option>
                <option>10 miles</option>
                <option>25 miles</option>
                <option>50 miles</option>
                <option>100 miles</option>
              </select>
            </div>
            <div className="form-group">
              <label>Subscription Tier *</label>
              <select name="subscriptionTier" value={form.subscriptionTier} onChange={handleChange} required>
                <option value="Starter">Starter — $150/mo</option>
                <option value="Professional">Professional — $300/mo</option>
                <option value="Enterprise">Enterprise — $500/mo</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{marginTop:20}}>
            <label>Company Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Tell graduates about your company, projects, and culture..." rows={4} />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%',marginTop:24}}>Create Contractor Account</button>
        </form>
      </div>
    </div>
  );
}

export default ContractorSignup;
