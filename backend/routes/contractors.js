const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

module.exports = function (store) {
  // GET all contractors with optional filters
  router.get('/', (req, res) => {
    let results = [...store.contractors];
    const { trade, metro, unionStatus, projectType, tier } = req.query;

    if (trade) {
      results = results.filter(c =>
        c.tradeFocus.some(t => t.toLowerCase() === trade.toLowerCase())
      );
    }
    if (metro) {
      results = results.filter(c => c.metro.toLowerCase() === metro.toLowerCase());
    }
    if (unionStatus) {
      results = results.filter(c => c.unionStatus === unionStatus);
    }
    if (projectType) {
      results = results.filter(c => c.projectType === projectType);
    }
    if (tier) {
      results = results.filter(c => c.subscriptionTier === tier);
    }

    res.json({ count: results.length, contractors: results });
  });

  // GET single contractor
  router.get('/:id', (req, res) => {
    const contractor = store.contractors.find(c => c.id === req.params.id);
    if (!contractor) return res.status(404).json({ error: 'Contractor not found' });
    res.json(contractor);
  });

  // POST create contractor
  router.post('/', (req, res) => {
    const contractor = {
      id: `con-${uuidv4().slice(0, 8)}`,
      ...req.body
    };
    const required = ['companyName', 'contactName', 'email', 'tradeFocus', 'metro'];
    const missing = required.filter(f => !contractor[f]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }
    store.contractors.push(contractor);
    res.status(201).json(contractor);
  });

  // PUT update contractor
  router.put('/:id', (req, res) => {
    const index = store.contractors.findIndex(c => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Contractor not found' });
    store.contractors[index] = { ...store.contractors[index], ...req.body, id: req.params.id };
    res.json(store.contractors[index]);
  });

  // DELETE contractor
  router.delete('/:id', (req, res) => {
    const index = store.contractors.findIndex(c => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Contractor not found' });
    const removed = store.contractors.splice(index, 1)[0];
    res.json({ message: 'Contractor deleted', contractor: removed });
  });

  return router;
};
