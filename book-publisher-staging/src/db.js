const DB_NAME = 'BookPublisher';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('chapters')) {
        const store = db.createObjectStore('chapters', { keyPath: 'id' });
        store.createIndex('bookId', 'bookId', { unique: false });
      }
    };
  });
}

function tx(storeName, mode = 'readonly') {
  return openDB().then(db => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    return { store, transaction, db };
  });
}

function req(promise) {
  return new Promise((resolve, reject) => {
    promise.onsuccess = () => resolve(promise.result);
    promise.onerror = () => reject(promise.error);
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function countWords(html) {
  const text = (html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.split(' ').length : 0;
}

// --- Books ---

export async function getBooks() {
  const { store } = await tx('books');
  const books = await req(store.getAll());
  // Attach chapter stats
  const { store: chStore } = await tx('chapters');
  const allChapters = await req(chStore.getAll());
  return books.map(book => {
    const chapters = allChapters.filter(c => c.bookId === book.id);
    return {
      ...book,
      chapterCount: chapters.length,
      wordCount: chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0),
    };
  }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function getBook(id) {
  const { store } = await tx('books');
  const book = await req(store.get(id));
  if (!book) return null;
  const { store: chStore } = await tx('chapters');
  const allChapters = await req(chStore.getAll());
  const chapters = allChapters
    .filter(c => c.bookId === id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return { ...book, chapters };
}

export async function createBook({ title, author = '', description = '', coverColor = '#1a1a2e' }) {
  const book = {
    id: generateId(),
    title,
    author,
    description,
    coverColor,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const { store } = await tx('books', 'readwrite');
  await req(store.put(book));

  // Create first chapter
  const chapter = {
    id: generateId(),
    bookId: book.id,
    title: 'Chapter 1',
    content: '',
    sortOrder: 0,
    wordCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const { store: chStore } = await tx('chapters', 'readwrite');
  await req(chStore.put(chapter));

  return book;
}

export async function updateBook(id, updates) {
  const { store } = await tx('books', 'readwrite');
  const book = await req(store.get(id));
  if (!book) return null;
  const updated = { ...book, ...updates, updatedAt: new Date().toISOString() };
  await req(store.put(updated));
  return updated;
}

export async function deleteBook(id) {
  const { store } = await tx('books', 'readwrite');
  await req(store.delete(id));
  // Delete all chapters
  const { store: chStore } = await tx('chapters', 'readwrite');
  const allChapters = await req(chStore.getAll());
  for (const ch of allChapters) {
    if (ch.bookId === id) await req(chStore.delete(ch.id));
  }
}

// --- Chapters ---

export async function createChapter(bookId, title) {
  const { store: chStore } = await tx('chapters', 'readwrite');
  const allChapters = await req(chStore.getAll());
  const bookChapters = allChapters.filter(c => c.bookId === bookId);

  const chapter = {
    id: generateId(),
    bookId,
    title: title || `Chapter ${bookChapters.length + 1}`,
    content: '',
    sortOrder: bookChapters.length,
    wordCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await req(chStore.put(chapter));

  // Touch book
  await updateBook(bookId, {});
  return chapter;
}

export async function updateChapter(chapterId, updates) {
  const { store } = await tx('chapters', 'readwrite');
  const chapter = await req(store.get(chapterId));
  if (!chapter) return null;

  if (updates.content !== undefined) {
    updates.wordCount = countWords(updates.content);
  }

  const updated = { ...chapter, ...updates, updatedAt: new Date().toISOString() };
  await req(store.put(updated));

  // Touch book
  await updateBook(chapter.bookId, {});
  return updated;
}

export async function deleteChapter(bookId, chapterId) {
  const { store } = await tx('chapters', 'readwrite');
  await req(store.delete(chapterId));

  // Reorder remaining
  const allChapters = await req(store.getAll());
  const remaining = allChapters
    .filter(c => c.bookId === bookId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  for (let i = 0; i < remaining.length; i++) {
    remaining[i].sortOrder = i;
    await req(store.put(remaining[i]));
  }
}

export async function reorderChapters(bookId, chapterIds) {
  const { store } = await tx('chapters', 'readwrite');
  for (let i = 0; i < chapterIds.length; i++) {
    const ch = await req(store.get(chapterIds[i]));
    if (ch) {
      ch.sortOrder = i;
      await req(store.put(ch));
    }
  }
}

// --- Import ---

export async function importDocx(file, title, author) {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  const bookTitle = title || file.name.replace(/\.docx$/i, '');

  // Split by H1/H2 headings
  const headingRegex = /<h[12][^>]*>(.*?)<\/h[12]>/gi;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    headings.push({ index: match.index, title: match[1].replace(/<[^>]*>/g, '').trim(), fullMatch: match[0] });
  }

  let chapters = [];
  const now = new Date().toISOString();
  const bookId = generateId();

  if (headings.length > 0) {
    // Content before first heading
    const before = html.substring(0, headings[0].index).trim();
    if (before && before.replace(/<[^>]*>/g, '').trim().length > 0) {
      chapters.push({
        id: generateId(), bookId, title: 'Preface', content: before,
        sortOrder: 0, wordCount: countWords(before), createdAt: now, updatedAt: now,
      });
    }

    headings.forEach((h, i) => {
      const start = h.index + h.fullMatch.length;
      const end = i + 1 < headings.length ? headings[i + 1].index : html.length;
      const content = html.substring(start, end).trim();
      chapters.push({
        id: generateId(), bookId, title: h.title || `Chapter ${i + 1}`, content,
        sortOrder: chapters.length, wordCount: countWords(content), createdAt: now, updatedAt: now,
      });
    });
  } else {
    chapters = [{
      id: generateId(), bookId, title: 'Chapter 1', content: html,
      sortOrder: 0, wordCount: countWords(html), createdAt: now, updatedAt: now,
    }];
  }

  // Save book
  const book = {
    id: bookId, title: bookTitle, author: author || '', description: '',
    coverColor: '#1a1a2e', createdAt: now, updatedAt: now,
  };
  const { store: bStore } = await tx('books', 'readwrite');
  await req(bStore.put(book));

  // Save chapters
  const { store: cStore } = await tx('chapters', 'readwrite');
  for (const ch of chapters) {
    await req(cStore.put(ch));
  }

  return { ...book, chapterCount: chapters.length, wordCount: chapters.reduce((s, c) => s + c.wordCount, 0) };
}

// --- Export helpers ---

export { generateId, countWords };
