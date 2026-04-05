import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import JobListings from './pages/JobListings';
import JobDetail from './pages/JobDetail';
import GraduateDirectory from './pages/GraduateDirectory';
import GraduateProfile from './pages/GraduateProfile';
import ContractorDirectory from './pages/ContractorDirectory';
import PricingPage from './pages/PricingPage';
import ForSchools from './pages/ForSchools';
import GraduateSignup from './pages/GraduateSignup';
import ContractorSignup from './pages/ContractorSignup';

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/jobs" element={<JobListings />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/graduates" element={<GraduateDirectory />} />
          <Route path="/graduates/:id" element={<GraduateProfile />} />
          <Route path="/contractors" element={<ContractorDirectory />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/for-schools" element={<ForSchools />} />
          <Route path="/signup/graduate" element={<GraduateSignup />} />
          <Route path="/signup/contractor" element={<ContractorSignup />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
