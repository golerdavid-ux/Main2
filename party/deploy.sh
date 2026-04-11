#!/bin/bash
set -e

echo "=== Party Planning - Cloudflare Deployment ==="
echo ""

# Always run from the party/ directory
cd "$(dirname "$0")"

# Check for wrangler
if ! command -v wrangler &> /dev/null && ! npx wrangler --version &> /dev/null; then
  echo "Installing wrangler..."
  npm install -g wrangler
fi

# Step 1: Create D1 database (if not exists)
echo "Step 1: Setting up D1 database..."
DB_OUTPUT=$(npx wrangler d1 create party-planning-db 2>&1 || true)

PLACEHOLDER_ID="00000000-0000-0000-0000-000000000000"

if echo "$DB_OUTPUT" | grep -q "database_id"; then
  DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | head -1 | awk -F'"' '{print $2}')
  echo "  Created D1 database: $DB_ID"
  sed -i "s/database_id = \"$PLACEHOLDER_ID\"/database_id = \"$DB_ID\"/" wrangler.toml
  sed -i "s/database_id = \"\"/database_id = \"$DB_ID\"/" wrangler.toml
elif echo "$DB_OUTPUT" | grep -q "already exists"; then
  echo "  D1 database already exists."
  DB_ID=$(npx wrangler d1 list 2>&1 | grep "party-planning-db" | awk '{print $1}')
  if [ -n "$DB_ID" ]; then
    sed -i "s/database_id = \"$PLACEHOLDER_ID\"/database_id = \"$DB_ID\"/" wrangler.toml
    sed -i "s/database_id = \"\"/database_id = \"$DB_ID\"/" wrangler.toml
  fi
else
  echo "  D1 output: $DB_OUTPUT"
fi

# Step 2: Run the schema migration
echo "Step 2: Applying database schema..."
npx wrangler d1 execute party-planning-db --remote --file=schema.sql

# Step 3: Create R2 bucket (if not exists)
echo "Step 3: Setting up R2 bucket for inspiration photos..."
npx wrangler r2 bucket create party-planning-photos 2>&1 || echo "  R2 bucket may already exist."

# Step 3b: Un-comment the R2 bucket block in wrangler.toml if it's still commented
if grep -q "^# \[\[r2_buckets\]\]" wrangler.toml; then
  echo "  Enabling R2 binding in wrangler.toml..."
  sed -i 's/^# \[\[r2_buckets\]\]/[[r2_buckets]]/' wrangler.toml
  sed -i 's/^# binding = "PHOTOS"/binding = "PHOTOS"/' wrangler.toml
  sed -i 's/^# bucket_name = "party-planning-photos"/bucket_name = "party-planning-photos"/' wrangler.toml
fi

# Step 4: Set the shared-password secret
echo "Step 4: Setting shared password..."
echo "  The password is hashed with SHA-256 before being stored as a Pages secret."
if [ -z "${PARTY_PASSWORD:-}" ]; then
  read -s -p "  Enter the shared party password: " PARTY_PASSWORD
  echo ""
fi
PARTY_PASSWORD_HASH=$(printf '%s' "$PARTY_PASSWORD" | shasum -a 256 | awk '{print $1}')
echo "$PARTY_PASSWORD_HASH" | npx wrangler pages secret put PARTY_PASSWORD_HASH --project-name=party-planning

# Step 5: Build the React frontend
echo "Step 5: Building React frontend..."
cd frontend
npm install
npm run build
cd ..

# Step 6: Deploy to Cloudflare Pages
echo "Step 6: Deploying to Cloudflare Pages..."
npx wrangler pages deploy frontend/build --project-name=party-planning

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Your Party Planning app is live!"
echo ""
echo "Next step: Add a custom domain in Cloudflare Dashboard:"
echo "  Pages > party-planning > Custom Domains"
echo ""
