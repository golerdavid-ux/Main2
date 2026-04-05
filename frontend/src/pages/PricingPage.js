import React from 'react';
import { Link } from 'react-router-dom';

function PricingPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Simple, Transparent Pricing</h1>
        <p>Graduates always free. Contractors pay for access to pre-vetted talent.</p>
      </div>

      <section className="section">
        <div className="container">
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Starter</h3>
              <div className="price">$150<span>/mo</span></div>
              <p style={{color:'var(--gray-600)',marginBottom:16}}>For contractors just getting started</p>
              <ul>
                <li>Up to 5 active job listings</li>
                <li>Basic candidate search</li>
                <li>Skills-based matching</li>
                <li>Email support</li>
                <li>Candidate profiles with certifications</li>
              </ul>
              <Link to="/signup/contractor" className="btn btn-outline" style={{width:'100%',marginTop:16}}>Get Started</Link>
            </div>
            <div className="pricing-card featured">
              <h3>Professional</h3>
              <div className="price">$300<span>/mo</span></div>
              <p style={{color:'var(--gray-600)',marginBottom:16}}>For growing teams with ongoing needs</p>
              <ul>
                <li>Up to 15 active listings</li>
                <li>Advanced matching algorithm</li>
                <li>Priority placement in results</li>
                <li>Phone & email support</li>
                <li>Candidate engagement analytics</li>
                <li>Bulk candidate outreach</li>
              </ul>
              <Link to="/signup/contractor" className="btn btn-primary" style={{width:'100%',marginTop:16}}>Get Started</Link>
            </div>
            <div className="pricing-card">
              <h3>Enterprise</h3>
              <div className="price">$500<span>/mo</span></div>
              <p style={{color:'var(--gray-600)',marginBottom:16}}>For large operations and workforce boards</p>
              <ul>
                <li>Unlimited job listings</li>
                <li>Premium matching & priority</li>
                <li>Dedicated account manager</li>
                <li>API access</li>
                <li>Workforce board integration</li>
                <li>Custom reporting & analytics</li>
                <li>Government program compatibility</li>
              </ul>
              <Link to="/signup/contractor" className="btn btn-outline" style={{width:'100%',marginTop:16}}>Contact Sales</Link>
            </div>
          </div>

          <div className="card" style={{maxWidth:700,margin:'48px auto',textAlign:'center',padding:32}}>
            <h3 style={{fontSize:'1.3rem',marginBottom:8}}>Premium Listing Boost</h3>
            <p style={{color:'var(--gray-600)',marginBottom:12}}>
              Make individual listings stand out with premium placement. $50–$200 per listing depending on duration and visibility.
            </p>
            <span className="badge badge-secondary" style={{fontSize:'1rem',padding:'8px 20px'}}>Add to any plan</span>
          </div>

          <div style={{textAlign:'center',marginTop:48,padding:'32px',background:'rgba(27,67,50,0.05)',borderRadius:'var(--radius)'}}>
            <h3 style={{fontSize:'1.5rem',marginBottom:8,color:'var(--primary)'}}>Graduates Always Free</h3>
            <p style={{color:'var(--gray-600)',maxWidth:500,margin:'0 auto'}}>
              Trade school graduates never pay to use Guildpost. Create your profile, get matched, and launch your career at zero cost.
            </p>
            <Link to="/signup/graduate" className="btn btn-primary" style={{marginTop:20}}>Create Free Profile</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PricingPage;
