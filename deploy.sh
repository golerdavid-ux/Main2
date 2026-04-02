#!/bin/bash
set -e

echo "=== Money Book - Cloudflare Deployment ==="
echo ""

# Check for wrangler
if ! command -v wrangler &> /dev/null && ! npx wrangler --version &> /dev/null; then
  echo "Installing wrangler..."
  npm install -g wrangler
fi

# Step 1: Create D1 database (if not exists)
echo "Step 1: Setting up D1 database..."
DB_OUTPUT=$(npx wrangler d1 create money-book-db 2>&1 || true)

if echo "$DB_OUTPUT" | grep -q "database_id"; then
  DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | head -1 | awk -F'"' '{print $2}')
  echo "  Created D1 database: $DB_ID"
  # Update wrangler.toml with the database ID
  sed -i "s/database_id = \"\"/database_id = \"$DB_ID\"/" wrangler.toml
elif echo "$DB_OUTPUT" | grep -q "already exists"; then
  echo "  D1 database already exists."
  # Try to get the ID from existing databases
  DB_ID=$(npx wrangler d1 list 2>&1 | grep "money-book-db" | awk '{print $1}')
  if [ -n "$DB_ID" ]; then
    sed -i "s/database_id = \"\"/database_id = \"$DB_ID\"/" wrangler.toml
  fi
else
  echo "  D1 output: $DB_OUTPUT"
fi

# Step 2: Run the schema migration
echo "Step 2: Applying database schema..."
npx wrangler d1 execute money-book-db --remote --file=schema.sql

# Step 3: Create R2 bucket (if not exists)
echo "Step 3: Setting up R2 bucket for photos..."
npx wrangler r2 bucket create money-book-photos 2>&1 || echo "  R2 bucket may already exist."

# Step 4: Build the React frontend
echo "Step 4: Building React frontend..."
cd frontend
npm install
npm run build
cd ..

# Step 5: Deploy to Cloudflare Pages
echo "Step 5: Deploying to Cloudflare Pages..."
npx wrangler pages deploy frontend/build --project-name=money-book

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Your Money Book is live!"
echo ""
echo "Next step: Add a custom domain in Cloudflare Dashboard:"
echo "  Pages > money-book > Custom Domains > Add: moneybook.davidgoler.com"
echo ""
