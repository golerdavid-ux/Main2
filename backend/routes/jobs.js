const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

module.exports = function (store) {
  // GET all jobs with optional filters
  router.get('/', (req, res) => {
    let results = [...store.jobs];
    const { trade, metro, type, unionStatus, projectType, contractorId, status, search } = req.query;

    if (trade) {
      results = results.filter(j => j.trade.toLowerCase() === trade.toLowerCase());
    }
    if (metro) {
      results = results.filter(j => j.metro.toLowerCase() === metro.toLowerCase());
    }
    if (type) {
      results = results.filter(j => j.type === type);
    }
    if (unionStatus) {
      results = results.filter(j => j.unionStatus === unionStatus);
    }
    if (projectType) {
      results = results.filter(j => j.projectType === projectType);
    }
    if (contractorId) {
      results = results.filter(j => j.contractorId === contractorId);
    }
    if (status) {
      results = results.filter(j => j.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.trade.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q)
      );
    }

    res.json({ count: results.length, jobs: results });
  });

  // GET single job
  router.get('/:id', (req, res) => {
    const job = store.jobs.find(j => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Include contractor info
    const contractor = store.contractors.find(c => c.id === job.contractorId);
    res.json({ ...job, contractor: contractor || null });
  });

  // POST create job
  router.post('/', (req, res) => {
    const job = {
      id: `job-${uuidv4().slice(0, 8)}`,
      postedDate: new Date().toISOString().split('T')[0],
      status: 'open',
      ...req.body
    };
    const required = ['title', 'trade', 'type', 'metro', 'contractorId'];
    const missing = required.filter(f => !job[f]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }
    // Verify contractor exists
    const contractor = store.contractors.find(c => c.id === job.contractorId);
    if (!contractor) {
      return res.status(400).json({ error: 'Contractor not found' });
    }
    store.jobs.push(job);
    res.status(201).json(job);
  });

  // PUT update job
  router.put('/:id', (req, res) => {
    const index = store.jobs.findIndex(j => j.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Job not found' });
    store.jobs[index] = { ...store.jobs[index], ...req.body, id: req.params.id };
    res.json(store.jobs[index]);
  });

  // DELETE job
  router.delete('/:id', (req, res) => {
    const index = store.jobs.findIndex(j => j.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Job not found' });
    const removed = store.jobs.splice(index, 1)[0];
    res.json({ message: 'Job deleted', job: removed });
  });

  return router;
};
