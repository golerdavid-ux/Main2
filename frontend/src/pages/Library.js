import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Library.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const COVER_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#e94560', '#2d4059', '#ea5455', '#345b63',
  '#152d35', '#d4a574', '#8d6e63', '#5d4037',
];

export default function Library() {
  const [books, setBooks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', author: '', description: '', coverColor: '#1a1a2e' });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await fetch(`${API}/api/books`);
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  };

  const createBook = async (e) => {
    e.preventDefault();
    if (!newBook.title.trim()) return;
    try {
      const res = await fetch(`${API}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBook),
      });
      const book = await res.json();
      setShowModal(false);
      setNewBook({ title: '', author: '', description: '', coverColor: '#1a1a2e' });
      navigate(`/book/${book.id}`);
    } catch (err) {
      console.error('Failed to create book:', err);
    }
  };

  const deleteBook = async (e, bookId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this book? This cannot be undone.')) return;
    try {
      await fetch(`${API}/api/books/${bookId}`, { method: 'DELETE' });
      setBooks(books.filter(b => b.id !== bookId));
    } catch (err) {
      console.error('Failed to delete book:', err);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API}/api/books/import`, {
        method: 'POST',
        body: formData,
      });
      const book = await res.json();
      if (res.ok) {
        navigate(`/book/${book.id}`);
      } else {
        alert(book.error || 'Failed to import file');
      }
    } catch (err) {
      console.error('Import failed:', err);
      alert('Failed to import file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="library">
      <header className="library-header">
        <div className="library-header-content">
          <h1>My Library</h1>
          <p className="library-subtitle">Your book publishing platform</p>
        </div>
        <div className="header-buttons">
          <button
            className="btn-import"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Import .docx'}
          </button>
          <button className="btn-new-book" onClick={() => setShowModal(true)}>
            + New Book
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>
      </header>

      <div className="books-grid">
        {loading ? (
          <div className="loading-state">Loading your library...</div>
        ) : books.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <line x1="12" y1="6" x2="12" y2="14" />
                <line x1="8" y1="10" x2="16" y2="10" />
              </svg>
            </div>
            <h2>No books yet</h2>
            <p>Create your first book to get started writing</p>
            <button className="btn-new-book" onClick={() => setShowModal(true)}>
              + Create Your First Book
            </button>
          </div>
        ) : (
          books.map(book => (
            <div
              key={book.id}
              className="book-card"
              onClick={() => navigate(`/book/${book.id}`)}
            >
              <div className="book-cover" style={{ backgroundColor: book.coverColor || '#1a1a2e' }}>
                <span className="book-cover-title">{book.title}</span>
                {book.author && <span className="book-cover-author">{book.author}</span>}
              </div>
              <div className="book-info">
                <h3 className="book-title">{book.title}</h3>
                <div className="book-meta">
                  <span>{book.chapterCount || 0} chapters</span>
                  <span className="meta-dot">&middot;</span>
                  <span>{(book.wordCount || 0).toLocaleString()} words</span>
                </div>
                <div className="book-date">Updated {formatDate(book.updatedAt)}</div>
              </div>
              <button
                className="book-delete"
                onClick={(e) => deleteBook(e, book.id)}
                title="Delete book"
              >
                &times;
              </button>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Book</h2>
            <form onSubmit={createBook}>
              <div className="modal-field">
                <label>Title *</label>
                <input
                  type="text"
                  value={newBook.title}
                  onChange={e => setNewBook({ ...newBook, title: e.target.value })}
                  placeholder="Enter book title"
                  autoFocus
                />
              </div>
              <div className="modal-field">
                <label>Author</label>
                <input
                  type="text"
                  value={newBook.author}
                  onChange={e => setNewBook({ ...newBook, author: e.target.value })}
                  placeholder="Author name"
                />
              </div>
              <div className="modal-field">
                <label>Description</label>
                <textarea
                  value={newBook.description}
                  onChange={e => setNewBook({ ...newBook, description: e.target.value })}
                  placeholder="Brief description of your book"
                  rows="3"
                />
              </div>
              <div className="modal-field">
                <label>Cover Color</label>
                <div className="color-picker">
                  {COVER_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-swatch ${newBook.coverColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewBook({ ...newBook, coverColor: color })}
                    />
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-create" disabled={!newBook.title.trim()}>
                  Create Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
