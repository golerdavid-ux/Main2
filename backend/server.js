const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const currencyService = require('./services/currencyService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Serve uploaded photos statically
app.use('/uploads', express.static(uploadsDir));

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `note-${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|heic/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ─── API Routes ──────────────────────────────────────────────

/**
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Money Book API is running' });
});

/**
 * GET /api/notes
 * Get all banknotes in the money book.
 */
app.get('/api/notes', (req, res) => {
  const notes = currencyService.getAllNotes();
  res.json({ notes, count: notes.length });
});

/**
 * GET /api/notes/:id
 * Get a single banknote by ID.
 */
app.get('/api/notes/:id', (req, res) => {
  const note = currencyService.getNoteById(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.json(note);
});

/**
 * POST /api/notes
 * Add a new banknote. Optionally upload a photo.
 */
app.post('/api/notes', upload.single('photo'), (req, res) => {
  try {
    const id = uuidv4();
    const noteData = {
      id,
      ...req.body,
    };

    // Parse errors array if sent as JSON string
    if (typeof noteData.errors === 'string') {
      try {
        noteData.errors = JSON.parse(noteData.errors);
      } catch {
        noteData.errors = noteData.errors ? [noteData.errors] : [];
      }
    }

    if (req.file) {
      noteData.photoFilename = req.file.filename;
    }

    const note = currencyService.addNote(noteData);
    res.status(201).json({
      success: true,
      message: "That's another one for your collection! I've put it in your Money Book for you.",
      note,
    });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note: ' + error.message });
  }
});

/**
 * PUT /api/notes/:id
 * Update a banknote.
 */
app.put('/api/notes/:id', upload.single('photo'), (req, res) => {
  try {
    const updates = { ...req.body };

    if (typeof updates.errors === 'string') {
      try {
        updates.errors = JSON.parse(updates.errors);
      } catch {
        updates.errors = updates.errors ? [updates.errors] : [];
      }
    }

    if (req.file) {
      updates.photoFilename = req.file.filename;
    }

    const note = currencyService.updateNote(req.params.id, updates);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true, note });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note: ' + error.message });
  }
});

/**
 * DELETE /api/notes/:id
 * Delete a banknote.
 */
app.delete('/api/notes/:id', (req, res) => {
  const deleted = currencyService.deleteNote(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Note not found' });
  res.json({ success: true, message: 'Note deleted' });
});

/**
 * POST /api/notes/analyze
 * Analyze a serial number / note details without saving.
 */
app.post('/api/notes/analyze', (req, res) => {
  const analysis = currencyService.analyzeNote(req.body);
  res.json(analysis);
});

/**
 * GET /api/notes/export/csv
 * Export the full money book as CSV.
 */
app.get('/api/notes/export/csv', (req, res) => {
  const csv = currencyService.exportCSV();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="MoneyBook.csv"');
  res.send(csv);
});

// Start server
app.listen(PORT, () => {
  console.log(`Money Book API running on port ${PORT}`);
  const notes = currencyService.getAllNotes();
  console.log(`Collection loaded: ${notes.length} notes`);
});
