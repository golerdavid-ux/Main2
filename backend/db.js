const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const BOOKS_FILE = path.join(DATA_DIR, 'books.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function readBooks() {
  if (!fs.existsSync(BOOKS_FILE)) {
    return [];
  }
  const data = fs.readFileSync(BOOKS_FILE, 'utf8');
  return JSON.parse(data);
}

function writeBooks(books) {
  fs.writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2));
}

function getChaptersFile(bookId) {
  return path.join(DATA_DIR, `chapters-${bookId}.json`);
}

function readChapters(bookId) {
  const file = getChaptersFile(bookId);
  if (!fs.existsSync(file)) {
    return [];
  }
  const data = fs.readFileSync(file, 'utf8');
  return JSON.parse(data);
}

function writeChapters(bookId, chapters) {
  const file = getChaptersFile(bookId);
  fs.writeFileSync(file, JSON.stringify(chapters, null, 2));
}

function deleteChaptersFile(bookId) {
  const file = getChaptersFile(bookId);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

module.exports = {
  generateId,
  readBooks,
  writeBooks,
  readChapters,
  writeChapters,
  deleteChaptersFile,
};
