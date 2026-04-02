# Money Book - U.S. Currency Cataloger

A serverless web app for cataloging your U.S. banknote collection. Runs entirely on Cloudflare (Pages + Functions + D1 + R2).

Upload photos, detect star notes and fancy serials, look up Friedberg numbers, track grading info, and export your collection to CSV.

## Features

- **Photo Upload**: Attach banknote photos (stored in Cloudflare R2)
- **Auto-Detection**: Star notes, fancy serial patterns (Radar, Repeater, Ladder, Low Number, Binary, Solid, and more)
- **Friedberg Number Lookup**: Auto-fills Fr# based on denomination and series year
- **Grading Support**: Log PMG/PCGS/CGC grades, cert numbers, and label comments
- **Error Tracking**: Flag common error types (Miscut, Inverted Overprint, Gutter Fold, etc.)
- **Value Tracking**: Estimated market value and cost paid per note
- **Collection Stats**: Total notes, estimated value, cost, star note count, graded count
- **Search & Filter**: Find notes by denomination, series, serial, Friedberg #, or flags
- **CSV Export**: Export your entire Money Book for Google Sheets or Excel

## Architecture

| Layer | Cloudflare Service |
|-------|-------------------|
| Frontend | Pages (static React build) |
| API | Pages Functions (serverless) |
| Database | D1 (SQLite) |
| Photo Storage | R2 (object storage) |

## Deployment

### Prerequisites
- Node.js v14+
- A Cloudflare account with your domain configured
- `wrangler` CLI authenticated (`npx wrangler login`)

### One-command deploy

```bash
./deploy.sh
```

This script will:
1. Create a D1 database (`money-book-db`)
2. Apply the schema
3. Create an R2 bucket (`money-book-photos`)
4. Build the React frontend
5. Deploy everything to Cloudflare Pages

### Custom domain setup

After deploying, go to **Cloudflare Dashboard > Pages > money-book > Custom Domains** and add:
```
moneybook.davidgoler.com
```

## Project Structure

```
Main2/
├── functions/                    # Cloudflare Pages Functions (API)
│   └── api/
│       ├── _currency.js          # Shared analysis utilities
│       ├── health.js             # GET /api/health
│       ├── notes/
│       │   ├── index.js          # GET/POST /api/notes
│       │   ├── [id].js           # GET/PUT/DELETE /api/notes/:id
│       │   ├── analyze.js        # POST /api/notes/analyze
│       │   └── export/csv.js     # GET /api/notes/export/csv
│       └── photos/
│           └── [key].js          # GET /api/photos/:key (serves R2 images)
├── frontend/                     # React app
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── public/index.html
├── schema.sql                    # D1 database schema
├── wrangler.toml                 # Cloudflare configuration
├── deploy.sh                     # One-command deployment
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | Get all notes |
| GET | `/api/notes/:id` | Get a single note |
| POST | `/api/notes` | Add a note (multipart form with optional photo) |
| PUT | `/api/notes/:id` | Update a note |
| DELETE | `/api/notes/:id` | Delete a note |
| POST | `/api/notes/analyze` | Analyze a note without saving |
| GET | `/api/notes/export/csv` | Export collection as CSV |
| GET | `/api/photos/:key` | Serve a photo from R2 |
| GET | `/api/health` | Health check |

## Local Development

```bash
cd frontend && npm install && npm start
```

For local API testing with wrangler:
```bash
npx wrangler pages dev frontend/build --d1=DB --r2=PHOTOS
```

## License

ISC
