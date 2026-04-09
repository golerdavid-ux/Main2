const express = require('express');
const router = express.Router();
const multer = require('multer');
const mammoth = require('mammoth');
const {
  generateId,
  readBooks,
  writeBooks,
  readChapters,
  writeChapters,
  deleteChaptersFile,
} = require('../db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// GET /api/books - List all books with stats
router.get('/', (req, res) => {
  const books = readBooks();
  const booksWithStats = books.map(book => {
    const chapters = readChapters(book.id);
    return {
      ...book,
      chapterCount: chapters.length,
      wordCount: chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0),
    };
  });
  res.json(booksWithStats);
});

// POST /api/books - Create a new book
router.post('/', (req, res) => {
  const { title, author, description, coverColor } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const books = readBooks();
  const newBook = {
    id: generateId(),
    title,
    author: author || '',
    description: description || '',
    coverColor: coverColor || '#1a1a2e',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  books.push(newBook);
  writeBooks(books);

  // Create first chapter automatically
  const firstChapter = {
    id: generateId(),
    title: 'Chapter 1',
    content: '',
    sortOrder: 0,
    wordCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeChapters(newBook.id, [firstChapter]);

  res.status(201).json(newBook);
});

// GET /api/books/:id - Get a book with its chapters
router.get('/:id', (req, res) => {
  const books = readBooks();
  const book = books.find(b => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const chapters = readChapters(book.id);
  res.json({
    ...book,
    chapters: chapters.sort((a, b) => a.sortOrder - b.sortOrder),
  });
});

// PUT /api/books/:id - Update a book
router.put('/:id', (req, res) => {
  const books = readBooks();
  const index = books.findIndex(b => b.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Book not found' });

  const { title, author, description, coverColor } = req.body;
  books[index] = {
    ...books[index],
    ...(title !== undefined && { title }),
    ...(author !== undefined && { author }),
    ...(description !== undefined && { description }),
    ...(coverColor !== undefined && { coverColor }),
    updatedAt: new Date().toISOString(),
  };
  writeBooks(books);
  res.json(books[index]);
});

// DELETE /api/books/:id - Delete a book and its chapters
router.delete('/:id', (req, res) => {
  const books = readBooks();
  const filtered = books.filter(b => b.id !== req.params.id);
  if (filtered.length === books.length) {
    return res.status(404).json({ error: 'Book not found' });
  }

  writeBooks(filtered);
  deleteChaptersFile(req.params.id);
  res.json({ success: true });
});

// --- Chapter Routes ---

// POST /api/books/:id/chapters - Create a chapter
router.post('/:id/chapters', (req, res) => {
  const books = readBooks();
  const book = books.find(b => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const chapters = readChapters(req.params.id);
  const { title } = req.body;

  const newChapter = {
    id: generateId(),
    title: title || `Chapter ${chapters.length + 1}`,
    content: '',
    sortOrder: chapters.length,
    wordCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  chapters.push(newChapter);
  writeChapters(req.params.id, chapters);

  // Update book timestamp
  const bookIndex = books.findIndex(b => b.id === req.params.id);
  books[bookIndex].updatedAt = new Date().toISOString();
  writeBooks(books);

  res.status(201).json(newChapter);
});

// PUT /api/books/:bookId/chapters/:chapterId - Update a chapter
router.put('/:bookId/chapters/:chapterId', (req, res) => {
  const chapters = readChapters(req.params.bookId);
  const index = chapters.findIndex(c => c.id === req.params.chapterId);
  if (index === -1) return res.status(404).json({ error: 'Chapter not found' });

  const { title, content, sortOrder } = req.body;

  // Calculate word count from HTML content
  let wordCount = chapters[index].wordCount;
  if (content !== undefined) {
    const text = content
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    wordCount = text ? text.split(' ').length : 0;
  }

  chapters[index] = {
    ...chapters[index],
    ...(title !== undefined && { title }),
    ...(content !== undefined && { content }),
    ...(sortOrder !== undefined && { sortOrder }),
    wordCount,
    updatedAt: new Date().toISOString(),
  };
  writeChapters(req.params.bookId, chapters);

  // Update book timestamp
  const books = readBooks();
  const bookIndex = books.findIndex(b => b.id === req.params.bookId);
  if (bookIndex !== -1) {
    books[bookIndex].updatedAt = new Date().toISOString();
    writeBooks(books);
  }

  res.json(chapters[index]);
});

// DELETE /api/books/:bookId/chapters/:chapterId - Delete a chapter
router.delete('/:bookId/chapters/:chapterId', (req, res) => {
  const chapters = readChapters(req.params.bookId);
  const filtered = chapters.filter(c => c.id !== req.params.chapterId);
  if (filtered.length === chapters.length) {
    return res.status(404).json({ error: 'Chapter not found' });
  }

  // Reorder remaining chapters
  filtered
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach((ch, i) => {
      ch.sortOrder = i;
    });
  writeChapters(req.params.bookId, filtered);
  res.json({ success: true });
});

// PUT /api/books/:id/reorder - Reorder chapters
router.put('/:id/reorder', (req, res) => {
  const { chapterIds } = req.body;
  if (!Array.isArray(chapterIds)) {
    return res.status(400).json({ error: 'chapterIds array required' });
  }

  const chapters = readChapters(req.params.id);
  chapterIds.forEach((id, index) => {
    const ch = chapters.find(c => c.id === id);
    if (ch) ch.sortOrder = index;
  });
  writeChapters(req.params.id, chapters);
  res.json({ success: true });
});

// POST /api/books/import - Import a .docx file as a new book
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    if (ext !== 'docx') {
      return res.status(400).json({ error: 'Only .docx files are supported' });
    }

    // Parse .docx to HTML
    const result = await mammoth.convertToHtml({ buffer: req.file.buffer });
    const html = result.value;

    // Extract title from filename (strip extension)
    const fileName = req.file.originalname.replace(/\.docx$/i, '');
    const title = req.body.title || fileName;
    const author = req.body.author || '';

    // Split into chapters by <h1> or <h2> tags
    const chapterSplitRegex = /<h[12][^>]*>(.*?)<\/h[12]>/gi;
    const headings = [];
    let match;
    while ((match = chapterSplitRegex.exec(html)) !== null) {
      headings.push({ index: match.index, title: match[1].replace(/<[^>]*>/g, '').trim(), fullMatch: match[0] });
    }

    let chapters = [];
    if (headings.length > 0) {
      // Split content at each heading
      headings.forEach((heading, i) => {
        const start = heading.index + heading.fullMatch.length;
        const end = i + 1 < headings.length ? headings[i + 1].index : html.length;
        const content = html.substring(start, end).trim();
        const text = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        const wordCount = text ? text.split(' ').length : 0;

        chapters.push({
          id: generateId(),
          title: heading.title || `Chapter ${i + 1}`,
          content,
          sortOrder: i,
          wordCount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      // If there's content before the first heading, prepend it as "Preface"
      const beforeFirst = html.substring(0, headings[0].index).trim();
      if (beforeFirst && beforeFirst.replace(/<[^>]*>/g, '').trim().length > 0) {
        const text = beforeFirst.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        chapters.unshift({
          id: generateId(),
          title: 'Preface',
          content: beforeFirst,
          sortOrder: 0,
          wordCount: text ? text.split(' ').length : 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        // Re-number sort orders
        chapters.forEach((ch, i) => { ch.sortOrder = i; });
      }
    } else {
      // No headings found — put everything in one chapter
      const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      chapters = [{
        id: generateId(),
        title: 'Chapter 1',
        content: html,
        sortOrder: 0,
        wordCount: text ? text.split(' ').length : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }];
    }

    // Create the book
    const books = readBooks();
    const newBook = {
      id: generateId(),
      title,
      author,
      description: '',
      coverColor: '#1a1a2e',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    books.push(newBook);
    writeBooks(books);
    writeChapters(newBook.id, chapters);

    res.status(201).json({
      ...newBook,
      chapterCount: chapters.length,
      wordCount: chapters.reduce((sum, ch) => sum + ch.wordCount, 0),
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Failed to import file: ' + err.message });
  }
});

// GET /api/books/:id/export - Export book as PDF
router.get('/:id/export', (req, res) => {
  const PDFDocument = require('pdfkit');
  const books = readBooks();
  const book = books.find(b => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const chapters = readChapters(book.id).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 72, bottom: 72, left: 72, right: 72 },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${book.title.replace(/[^a-zA-Z0-9 ]/g, '')}.pdf"`
  );
  doc.pipe(res);

  // Title page
  doc.moveDown(8);
  doc
    .fontSize(36)
    .font('Helvetica-Bold')
    .text(book.title, { align: 'center' });
  doc.moveDown(2);
  if (book.author) {
    doc
      .fontSize(18)
      .font('Helvetica')
      .text(`by ${book.author}`, { align: 'center' });
  }
  if (book.description) {
    doc.moveDown(4);
    doc
      .fontSize(12)
      .font('Helvetica-Oblique')
      .text(book.description, { align: 'center' });
  }

  // Chapters
  chapters.forEach(chapter => {
    doc.addPage();
    doc.fontSize(24).font('Helvetica-Bold').text(chapter.title);
    doc.moveDown(1.5);

    // Parse HTML content to plain text with basic formatting
    const text = (chapter.content || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (text) {
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(text, { align: 'left', lineGap: 6, paragraphGap: 8 });
    }
  });

  doc.end();
});

module.exports = router;
