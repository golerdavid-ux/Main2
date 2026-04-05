const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

module.exports = function (store) {
  // GET all graduates with optional filters
  router.get('/', (req, res) => {
    let results = [...store.graduates];
    const { trade, metro, availability, school, unionPreference, search } = req.query;

    if (trade) {
      results = results.filter(g => g.trade.toLowerCase() === trade.toLowerCase());
    }
    if (metro) {
      results = results.filter(g => g.metro.toLowerCase() === metro.toLowerCase());
    }
    if (availability) {
      results = results.filter(g => g.availability === availability);
    }
    if (school) {
      results = results.filter(g => g.tradeSchool === school);
    }
    if (unionPreference) {
      results = results.filter(g => g.unionPreference === unionPreference || g.unionPreference === 'either');
    }
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(g =>
        g.firstName.toLowerCase().includes(q) ||
        g.lastName.toLowerCase().includes(q) ||
        g.trade.toLowerCase().includes(q) ||
        g.bio.toLowerCase().includes(q)
      );
    }

    res.json({ count: results.length, graduates: results });
  });

  // GET single graduate
  router.get('/:id', (req, res) => {
    const graduate = store.graduates.find(g => g.id === req.params.id);
    if (!graduate) return res.status(404).json({ error: 'Graduate not found' });
    res.json(graduate);
  });

  // POST create graduate
  router.post('/', (req, res) => {
    const graduate = {
      id: `grad-${uuidv4().slice(0, 8)}`,
      ...req.body
    };
    const required = ['firstName', 'lastName', 'email', 'trade', 'metro'];
    const missing = required.filter(f => !graduate[f]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }
    store.graduates.push(graduate);
    res.status(201).json(graduate);
  });

  // PUT update graduate
  router.put('/:id', (req, res) => {
    const index = store.graduates.findIndex(g => g.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Graduate not found' });
    store.graduates[index] = { ...store.graduates[index], ...req.body, id: req.params.id };
    res.json(store.graduates[index]);
  });

  // DELETE graduate
  router.delete('/:id', (req, res) => {
    const index = store.graduates.findIndex(g => g.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Graduate not found' });
    const removed = store.graduates.splice(index, 1)[0];
    res.json({ message: 'Graduate deleted', graduate: removed });
  });

  return router;
};
