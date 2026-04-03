#!/usr/bin/env bash
# Paperclip AI Setup Script
# Orchestrates a team of AI agents to run a business using Claude Code
# Docs: https://paperclip.ing/docs | Repo: https://github.com/paperclipai/paperclip

set -euo pipefail

echo "=== Paperclip AI Setup ==="

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null || [ "$(node -e 'console.log(parseInt(process.versions.node))')" -lt 20 ]; then
  echo "ERROR: Node.js 20+ is required. Install from https://nodejs.org"
  exit 1
fi
echo "  Node.js $(node --version) OK"

if ! command -v pnpm &> /dev/null; then
  echo "  Installing pnpm..."
  npm install -g pnpm
fi
echo "  pnpm $(pnpm --version) OK"

# Check if PostgreSQL is available (for environments where embedded PG fails)
USE_EXTERNAL_PG=false
if command -v psql &> /dev/null && pg_isready -q 2>/dev/null; then
  echo "  PostgreSQL detected and running"
  USE_EXTERNAL_PG=true
fi

# Run Paperclip onboarding
echo ""
echo "Running Paperclip onboarding..."
npx paperclipai onboard --yes

# If external PostgreSQL is needed (embedded PG fails in some environments)
if [ "$USE_EXTERNAL_PG" = true ]; then
  echo ""
  echo "Configuring external PostgreSQL..."

  # Create database and user if they don't exist
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='paperclip'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER paperclip WITH PASSWORD 'paperclip' CREATEDB;"

  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='paperclip'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE paperclip OWNER paperclip;"

  # Update config to use external PostgreSQL
  CONFIG_FILE="$HOME/.paperclip/instances/default/config.json"
  if [ -f "$CONFIG_FILE" ]; then
    # Replace embedded-postgres with postgres mode and add connection string
    node -e "
      const fs = require('fs');
      const config = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));
      config.database.mode = 'postgres';
      config.database.connectionString = 'postgresql://paperclip:paperclip@127.0.0.1:5432/paperclip';
      fs.writeFileSync('$CONFIG_FILE', JSON.stringify(config, null, 2));
    "
    echo "  Config updated for external PostgreSQL"
  fi
fi

# Verify setup
echo ""
echo "Running diagnostics..."
npx paperclipai doctor

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start Paperclip:"
echo "  npx paperclipai run"
echo ""
echo "Then open http://localhost:3100 in your browser to:"
echo "  1. Create your company and set a mission"
echo "  2. Define agent roles (CEO, engineer, marketer, etc.)"
echo "  3. Configure Claude Code as the AI runtime"
echo "  4. Set heartbeat schedules for each agent"
echo ""
echo "Useful commands:"
echo "  npx paperclipai doctor --repair   # Fix common issues"
echo "  npx paperclipai configure         # Reconfigure settings"
