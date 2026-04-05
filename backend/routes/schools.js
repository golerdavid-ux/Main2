const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

module.exports = function (store) {
  // GET all trade schools with optional filters
  router.get('/', (req, res) => {
    let results = [...store.schools];
    const { location, trade } = req.query;

    if (location) {
      results = results.filter(s => s.location.toLowerCase() === location.toLowerCase());
    }
    if (trade) {
      results = results.filter(s =>
        s.tradesOffered.some(t => t.toLowerCase() === trade.toLowerCase())
      );
    }

    res.json({ count: results.length, schools: results });
  });

  // GET single school
  router.get('/:id', (req, res) => {
    const school = store.schools.find(s => s.id === req.params.id);
    if (!school) return res.status(404).json({ error: 'Trade school not found' });

    // Include graduates from this school
    const graduates = store.graduates.filter(g => g.tradeSchool === school.id);

    res.json({
      ...school,
      graduates: graduates.map(g => ({
        id: g.id,
        name: `${g.firstName} ${g.lastName}`,
        trade: g.trade,
        graduationDate: g.graduationDate,
        availability: g.availability
      }))
    });
  });

  // POST create school
  router.post('/', (req, res) => {
    const school = {
      id: `school-${uuidv4().slice(0, 8)}`,
      ...req.body
    };
    const required = ['name', 'location', 'tradesOffered'];
    const missing = required.filter(f => !school[f]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }
    store.schools.push(school);
    res.status(201).json(school);
  });

  // PUT update school
  router.put('/:id', (req, res) => {
    const index = store.schools.findIndex(s => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Trade school not found' });
    store.schools[index] = { ...store.schools[index], ...req.body, id: req.params.id };
    res.json(store.schools[index]);
  });

  // DELETE school
  router.delete('/:id', (req, res) => {
    const index = store.schools.findIndex(s => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Trade school not found' });
    const removed = store.schools.splice(index, 1)[0];
    res.json({ message: 'Trade school deleted', school: removed });
  });

  return router;
};
