# Party Planning

A private, shared-password web app for planning a party together. Built on Cloudflare Pages + Pages Functions + D1 + R2. Same stack as the Money Book app at the repo root, fully independent from it.

## Features

- **Dashboard** — countdown to the party, budget summary, open-task count, upcoming deadlines
- **Tasks** — checklist with due dates and assignee (him / wife / vendor)
- **Budget** — line items with estimated vs. actual cost, running total, category breakdown
- **Vendors & contacts** — venue, caterer, DJ, florist, bakery, etc. with deposit/balance tracking
- **Shopping list** — decor, groceries, supplies, grouped by store
- **Menu planner** — courses, dishes, dietary notes, serving counts
- **Inspiration** — freeform notes with photos for theme/decor/outfit ideas
- **Shared-password login** — you and your wife both edit the same workspace behind one cookie-gated password

## Architecture

| Layer | Cloudflare Service |
|---|---|
| Frontend | Pages (static React build) |
| API | Pages Functions |
| Database | D1 (SQLite) — `party-planning-db` |
| Photo storage | R2 — `party-planning-photos` |
| Auth secret | Pages secret `PARTY_PASSWORD_HASH` |

## One-command deploy

```bash
cd party
./deploy.sh
```

This will:
1. Create the D1 database `party-planning-db` (or reuse if it exists)
2. Apply `schema.sql`
3. Create the R2 bucket `party-planning-photos` and enable the `PHOTOS` binding in `wrangler.toml`
4. Prompt for the shared password, SHA-256 it, and upload it as the `PARTY_PASSWORD_HASH` secret
5. Build the React frontend
6. Deploy to a Cloudflare Pages project called `party-planning`

## Local development

Bare React (no Functions):

```bash
cd party/frontend
npm install
npm start
```

With Functions (D1, R2, middleware, auth):

```bash
cd party
# Pre-compute the SHA-256 of your dev password once:
HASH=$(printf 'devpassword' | shasum -a 256 | awk '{print $1}')
npx wrangler pages dev frontend/build \
  --d1 DB=party-planning-db \
  --r2 PHOTOS=party-planning-photos \
  --binding PARTY_PASSWORD_HASH="$HASH"
```

Then visit http://localhost:8788 and log in with `devpassword`.

## API endpoints

All `/api/*` endpoints are gated by `_middleware.js` except `/api/login` and `/api/health`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/login` | Accepts `{password}`; sets `party_auth` cookie |
| POST | `/api/logout` | Clears the cookie |
| GET | `/api/health` | Liveness check |
| GET/PUT | `/api/settings` | Party name, date, venue headline |
| GET | `/api/dashboard` | Aggregated totals for the home view |
| GET/POST | `/api/tasks` + `/api/tasks/:id` | Task CRUD |
| GET/POST | `/api/budget` + `/api/budget/:id` | Budget CRUD |
| GET/POST | `/api/vendors` + `/api/vendors/:id` | Vendor CRUD |
| GET/POST | `/api/shopping` + `/api/shopping/:id` | Shopping CRUD |
| GET/POST | `/api/menu` + `/api/menu/:id` | Menu CRUD |
| GET/POST | `/api/inspiration` + `/api/inspiration/:id` | Multipart form with optional photo upload |
| GET | `/api/photos/:key` | Serves an inspiration photo from R2 |

## Extracting to a new repo

This project lives in a subfolder so Money Book stays untouched. To move it to its own GitHub repo:

```bash
git subtree split --prefix=party -b party-app-standalone
# Create an empty repo in the GitHub UI, then:
git push git@github.com:<you>/party-planning.git party-app-standalone:main
```
