#!/bin/bash
set -e

echo "=== Book Publishing Platform — Deploy ==="

# Determine deploy method
if command -v docker &>/dev/null && command -v docker-compose &>/dev/null; then
  echo ""
  echo "Docker detected. Using Docker deployment."
  echo ""

  # Build and start containers
  docker-compose down
  docker-compose build --no-cache
  docker-compose up -d

  echo ""
  echo "Containers running. Checking health..."
  sleep 3
  docker-compose ps
  echo ""
  echo "Done! App is running at http://book.davidgoler.com"

else
  echo ""
  echo "No Docker found. Using PM2 deployment."
  echo ""

  # Install dependencies
  echo "Installing backend dependencies..."
  cd backend && npm ci --omit=dev && cd ..

  echo "Building frontend..."
  cd frontend && npm ci && npm run build && cd ..

  # Start with PM2
  if command -v pm2 &>/dev/null; then
    pm2 delete book-platform 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    echo ""
    echo "Done! App running via PM2 on port 3001"
    echo "Set up nginx to proxy book.davidgoler.com -> localhost:3001"
  else
    echo "PM2 not found. Install it: npm install -g pm2"
    echo "Or run directly: cd backend && NODE_ENV=production node server.js"
  fi
fi

echo ""
echo "=== SSL Setup (if not done yet) ==="
echo "Run: sudo certbot certonly --standalone -d book.davidgoler.com"
echo "Then copy certs to ./nginx/certs/ and restart nginx."
