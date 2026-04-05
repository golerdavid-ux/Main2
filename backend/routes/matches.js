const express = require('express');
const router = express.Router();

/**
 * Scoring algorithm:
 * - Trade match (exact)           = 50 points
 * - Certification overlap         = 10 points per matching cert
 * - Location/metro match          = 20 points
 * - Shift preference compatibility = 10 points
 * - Union preference match        = 10 points
 */

function scoreGraduateForJob(graduate, job) {
  let score = 0;
  const breakdown = {};

  // Trade match (50 points)
  if (graduate.trade.toLowerCase() === job.trade.toLowerCase()) {
    score += 50;
    breakdown.tradeMatch = 50;
  } else {
    breakdown.tradeMatch = 0;
  }

  // Certification overlap (10 points each)
  const jobCerts = (job.requiredCertifications || []).map(c => c.toLowerCase());
  const gradCerts = (graduate.certifications || []).map(c => c.toLowerCase());
  const matchingCerts = jobCerts.filter(c => gradCerts.includes(c));
  const certScore = matchingCerts.length * 10;
  score += certScore;
  breakdown.certificationMatch = certScore;
  breakdown.matchingCertifications = matchingCerts;

  // Location/metro match (20 points)
  if (graduate.metro.toLowerCase() === job.metro.toLowerCase()) {
    score += 20;
    breakdown.locationMatch = 20;
  } else {
    breakdown.locationMatch = 0;
  }

  // Shift preference compatibility (10 points)
  if (graduate.shiftPreference === job.shiftAvailable) {
    score += 10;
    breakdown.shiftMatch = 10;
  } else {
    breakdown.shiftMatch = 0;
  }

  // Union preference match (10 points)
  if (
    graduate.unionPreference === 'either' ||
    graduate.unionPreference === job.unionStatus
  ) {
    score += 10;
    breakdown.unionMatch = 10;
  } else {
    breakdown.unionMatch = 0;
  }

  return { score, breakdown };
}

module.exports = function (store) {
  // GET matches for a graduate (jobs ranked by fit)
  router.get('/graduate/:graduateId', (req, res) => {
    const graduate = store.graduates.find(g => g.id === req.params.graduateId);
    if (!graduate) {
      return res.status(404).json({ error: 'Graduate not found' });
    }

    const openJobs = store.jobs.filter(j => j.status === 'open');

    const matches = openJobs.map(job => {
      const { score, breakdown } = scoreGraduateForJob(graduate, job);
      const contractor = store.contractors.find(c => c.id === job.contractorId);
      return {
        job,
        contractor: contractor
          ? { id: contractor.id, companyName: contractor.companyName }
          : null,
        score,
        breakdown
      };
    });

    matches.sort((a, b) => b.score - a.score);

    // Optional: filter by minimum score
    const minScore = parseInt(req.query.minScore) || 0;
    const filtered = matches.filter(m => m.score >= minScore);

    res.json({
      graduate: {
        id: graduate.id,
        name: `${graduate.firstName} ${graduate.lastName}`,
        trade: graduate.trade,
        metro: graduate.metro
      },
      matchCount: filtered.length,
      matches: filtered
    });
  });

  // GET matches for a job (graduates ranked by fit)
  router.get('/job/:jobId', (req, res) => {
    const job = store.jobs.find(j => j.id === req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const availableGrads = store.graduates.filter(
      g => g.availability === 'immediate' || g.availability === 'two-weeks'
    );

    const matches = availableGrads.map(graduate => {
      const { score, breakdown } = scoreGraduateForJob(graduate, job);
      return {
        graduate: {
          id: graduate.id,
          name: `${graduate.firstName} ${graduate.lastName}`,
          trade: graduate.trade,
          metro: graduate.metro,
          certifications: graduate.certifications,
          availability: graduate.availability,
          tradeSchool: graduate.tradeSchool
        },
        score,
        breakdown
      };
    });

    matches.sort((a, b) => b.score - a.score);

    const minScore = parseInt(req.query.minScore) || 0;
    const filtered = matches.filter(m => m.score >= minScore);

    const contractor = store.contractors.find(c => c.id === job.contractorId);

    res.json({
      job: {
        id: job.id,
        title: job.title,
        trade: job.trade,
        metro: job.metro,
        contractor: contractor
          ? { id: contractor.id, companyName: contractor.companyName }
          : null
      },
      matchCount: filtered.length,
      matches: filtered
    });
  });

  return router;
};
