// PM2 ecosystem config — for non-Docker deployments
// Usage: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'book-platform',
      cwd: './backend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
