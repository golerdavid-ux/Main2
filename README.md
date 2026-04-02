# Money Book - U.S. Currency Cataloger

A full-stack web app for cataloging your U.S. banknote collection. Upload photos, detect star notes and fancy serials, look up Friedberg numbers, track grading info, and export your collection to CSV.

## Features

- **Photo Upload**: Attach photos of each banknote (stored locally)
- **Auto-Detection**: Star notes, fancy serial patterns (Radar, Repeater, Ladder, Low Number, Binary, Solid, and more)
- **Friedberg Number Lookup**: Auto-fills Fr# based on denomination and series year
- **Grading Support**: Log PMG/PCGS/CGC grades, cert numbers, and label comments
- **Error Tracking**: Flag common error types (Miscut, Inverted Overprint, Gutter Fold, etc.)
- **Value Tracking**: Estimated market value and cost paid per note
- **Collection Stats**: Total notes, estimated value, cost, star note count, graded count
- **Search & Filter**: Find notes by denomination, series, serial, Friedberg #, or flags
- **CSV Export**: Export your entire Money Book for use in Google Sheets or Excel
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

### Backend
- Node.js with Express
- Multer for photo uploads
- JSON file storage (no database needed)

### Frontend
- React 18
- Custom CSS with a currency-collecting theme

## Project Structure

```
Main2/
├── backend/
│   ├── services/
│   │   └── currencyService.js   # CRUD, rarity detection, Friedberg lookup, CSV export
│   ├── uploads/                 # Uploaded note photos
│   ├── server.js                # Express API server
│   ├── moneybook.json           # Your collection data
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js               # Main React component
│   │   ├── App.css              # Styles
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm

### Backend Setup

```bash
cd backend
npm install
npm start
```

The API runs on `http://localhost:3001`.

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The app opens at `http://localhost:3000`.

## Usage

1. **Add a Note**: Click "+ Add Note" and fill in the denomination, series year, serial number, and any other details you have.
2. **Upload a Photo**: Attach a photo of the front or back of the note.
3. **Analyze**: Click "Analyze Note" to auto-detect star notes, fancy serials, and look up the Friedberg number.
4. **Grading**: If the note is in a PMG/PCGS holder, enter the grade, cert number, and any label comments.
5. **Value**: Enter the estimated market value and what you paid.
6. **Save**: Click "Add to Money Book" to save the note to your collection.
7. **Export**: Click "Export CSV" to download your collection as a spreadsheet.

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
| GET | `/api/health` | Health check |

## Fancy Serial Detection

The app automatically detects these patterns:

| Pattern | Example | Description |
|---------|---------|-------------|
| Solid | 88888888 | All same digit |
| Radar | 12344321 | Palindrome |
| Repeater | 12341234 | First half = second half |
| Super Repeater | 07070707 | Two-digit pattern repeated |
| Ladder | 12345678 | Ascending or descending sequence |
| Low Number | 00000012 | 4+ leading zeros |
| Binary | 10010110 | Only two distinct digits |
| Near Solid | 88888828 | 7-of-a-kind |
| Trinary | 12112211 | Only three distinct digits |

## License

ISC
