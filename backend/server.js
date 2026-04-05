const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { graduates, contractors, jobs, schools } = require('./data/seedData');

const app = express();
const PORT = process.env.PORT || 5000;

// In-memory data store (seeded from seedData)
const store = {
  graduates: [...graduates],
  contractors: [...contractors],
  jobs: [...jobs],
  schools: [...schools]
};

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/graduates', require('./routes/graduates')(store));
app.use('/api/contractors', require('./routes/contractors')(store));
app.use('/api/jobs', require('./routes/jobs')(store));
app.use('/api/matches', require('./routes/matches')(store));
app.use('/api/schools', require('./routes/schools')(store));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'Guildpost',
    message: 'Guildpost API is running',
    data: {
      graduates: store.graduates.length,
      contractors: store.contractors.length,
      jobs: store.jobs.length,
      schools: store.schools.length
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Guildpost API running on port ${PORT}`);
  console.log(`Seed data loaded: ${store.graduates.length} graduates, ${store.contractors.length} contractors, ${store.jobs.length} jobs, ${store.schools.length} schools`);
});
