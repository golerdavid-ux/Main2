import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './BookEditor.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function BookEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [activeChapter, setActiveChapter] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingTitle, setEditingTitle] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load book data
  useEffect(() => {
    fetchBook();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set active chapter when chapters load
  useEffect(() => {
    if (chapters.length > 0 && !activeChapterId) {
      setActiveChapterId(chapters[0].id);
    }
  }, [chapters, activeChapterId]);

  // Load chapter content when active chapter changes
  useEffect(() => {
    if (activeChapterId) {
      const chapter = chapters.find(c => c.id === activeChapterId);
      if (chapter) {
        setActiveChapter(chapter);
        setWordCount(chapter.wordCount || 0);
        // Set editor content
        if (editorRef.current) {
          editorRef.current.innerHTML = chapter.content || '';
        }
      }
    }
  }, [activeChapterId, chapters]);

  const fetchBook = async () => {
    try {
      const res = await fetch(`${API}/api/books/${id}`);
      if (!res.ok) {
        navigate('/');
        return;
      }
      const data = await res.json();
      setBook(data);
      setChapters(data.chapters || []);
    } catch (err) {
      console.error('Failed to load book:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const countWords = (html) => {
    const text = html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text ? text.split(' ').length : 0;
  };

  const saveChapter = useCallback(async (chapterId, content) => {
    if (!chapterId) return;
    setSaveStatus('saving');
    try {
      const res = await fetch(`${API}/api/books/${id}/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const updated = await res.json();
      setChapters(prev =>
        prev.map(c => (c.id === chapterId ? { ...c, ...updated } : c))
      );
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveStatus('error');
    }
  }, [id]);

  const handleEditorInput = () => {
    if (!editorRef.current || !activeChapterId) return;
    const content = editorRef.current.innerHTML;
    setWordCount(countWords(content));
    setSaveStatus('unsaved');

    // Debounce auto-save (2 seconds)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveChapter(activeChapterId, content);
    }, 2000);
  };

  const handleKeyDown = (e) => {
    // Manual save: Ctrl+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (editorRef.current && activeChapterId) {
        saveChapter(activeChapterId, editorRef.current.innerHTML);
      }
    }
    // Tab key: insert spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '    ');
    }
  };

  const execFormat = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const addChapter = async () => {
    try {
      const res = await fetch(`${API}/api/books/${id}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const newChapter = await res.json();
      setChapters(prev => [...prev, newChapter]);
      setActiveChapterId(newChapter.id);
    } catch (err) {
      console.error('Failed to add chapter:', err);
    }
  };

  const deleteChapter = async (chapterId) => {
    if (chapters.length <= 1) return;
    if (!window.confirm('Delete this chapter?')) return;
    try {
      await fetch(`${API}/api/books/${id}/chapters/${chapterId}`, {
        method: 'DELETE',
      });
      const remaining = chapters.filter(c => c.id !== chapterId);
      setChapters(remaining);
      if (activeChapterId === chapterId) {
        setActiveChapterId(remaining[0]?.id || null);
      }
    } catch (err) {
      console.error('Failed to delete chapter:', err);
    }
  };

  const renameChapter = async (chapterId, title) => {
    setEditingTitle(null);
    if (!title.trim()) return;
    try {
      const res = await fetch(`${API}/api/books/${id}/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const updated = await res.json();
      setChapters(prev =>
        prev.map(c => (c.id === chapterId ? { ...c, ...updated } : c))
      );
    } catch (err) {
      console.error('Failed to rename chapter:', err);
    }
  };

  const switchChapter = (chapterId) => {
    // Save current chapter first
    if (editorRef.current && activeChapterId) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveChapter(activeChapterId, editorRef.current.innerHTML);
    }
    setActiveChapterId(chapterId);
  };

  const moveChapter = async (chapterId, direction) => {
    const sorted = [...chapters].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(c => c.id === chapterId);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= sorted.length) return;

    // Swap
    [sorted[idx], sorted[newIdx]] = [sorted[newIdx], sorted[idx]];
    const chapterIds = sorted.map(c => c.id);

    try {
      await fetch(`${API}/api/books/${id}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterIds }),
      });
      // Update local state
      const reordered = sorted.map((c, i) => ({ ...c, sortOrder: i }));
      setChapters(reordered);
    } catch (err) {
      console.error('Failed to reorder:', err);
    }
  };

  const exportPDF = () => {
    // Save current work first
    if (editorRef.current && activeChapterId) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveChapter(activeChapterId, editorRef.current.innerHTML);
    }
    // Trigger download after brief delay for save
    setTimeout(() => {
      window.open(`${API}/api/books/${id}/export`, '_blank');
    }, 500);
  };

  const totalWordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

  if (loading) {
    return <div className="editor-loading">Loading...</div>;
  }

  if (!book) return null;

  return (
    <div className="book-editor">
      {/* Top Bar */}
      <div className="editor-topbar">
        <div className="topbar-left">
          <button className="btn-back" onClick={() => navigate('/')} title="Back to Library">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="btn-toggle-sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
          <span className="topbar-title">{book.title}</span>
        </div>
        <div className="topbar-center">
          <div className={`save-status ${saveStatus}`}>
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'unsaved' && 'Unsaved changes'}
            {saveStatus === 'error' && 'Save failed'}
          </div>
        </div>
        <div className="topbar-right">
          <span className="word-count-topbar">{totalWordCount.toLocaleString()} words total</span>
          <button className="btn-export" onClick={exportPDF} title="Export as PDF">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      <div className="editor-body">
        {/* Sidebar */}
        <div className={`editor-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <h3>Chapters</h3>
            <button className="btn-add-chapter" onClick={addChapter} title="Add chapter">
              +
            </button>
          </div>
          <div className="chapter-list">
            {chapters
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((chapter) => (
                <div
                  key={chapter.id}
                  className={`chapter-item ${activeChapterId === chapter.id ? 'active' : ''}`}
                  onClick={() => switchChapter(chapter.id)}
                >
                  {editingTitle === chapter.id ? (
                    <input
                      type="text"
                      className="chapter-rename-input"
                      defaultValue={chapter.title}
                      autoFocus
                      onBlur={(e) => renameChapter(chapter.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renameChapter(chapter.id, e.target.value);
                        if (e.key === 'Escape') setEditingTitle(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className="chapter-title" onDoubleClick={() => setEditingTitle(chapter.id)}>
                        {chapter.title}
                      </span>
                      <span className="chapter-words">{(chapter.wordCount || 0).toLocaleString()}</span>
                    </>
                  )}
                  <div className="chapter-actions">
                    <button
                      className="ch-btn"
                      onClick={(e) => { e.stopPropagation(); moveChapter(chapter.id, -1); }}
                      title="Move up"
                      disabled={chapter.sortOrder === 0}
                    >
                      &uarr;
                    </button>
                    <button
                      className="ch-btn"
                      onClick={(e) => { e.stopPropagation(); moveChapter(chapter.id, 1); }}
                      title="Move down"
                      disabled={chapter.sortOrder === chapters.length - 1}
                    >
                      &darr;
                    </button>
                    <button
                      className="ch-btn ch-delete"
                      onClick={(e) => { e.stopPropagation(); deleteChapter(chapter.id); }}
                      title="Delete chapter"
                      disabled={chapters.length <= 1}
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="editor-main">
          {/* Formatting Toolbar */}
          <div className="formatting-toolbar">
            <button className="fmt-btn" onClick={() => execFormat('bold')} title="Bold (Ctrl+B)"><b>B</b></button>
            <button className="fmt-btn" onClick={() => execFormat('italic')} title="Italic (Ctrl+I)"><i>I</i></button>
            <button className="fmt-btn" onClick={() => execFormat('underline')} title="Underline (Ctrl+U)"><u>U</u></button>
            <button className="fmt-btn" onClick={() => execFormat('strikeThrough')} title="Strikethrough"><s>S</s></button>
            <span className="fmt-divider" />
            <button className="fmt-btn" onClick={() => execFormat('formatBlock', '<h1>')} title="Heading 1">H1</button>
            <button className="fmt-btn" onClick={() => execFormat('formatBlock', '<h2>')} title="Heading 2">H2</button>
            <button className="fmt-btn" onClick={() => execFormat('formatBlock', '<h3>')} title="Heading 3">H3</button>
            <button className="fmt-btn" onClick={() => execFormat('formatBlock', '<p>')} title="Paragraph">P</button>
            <span className="fmt-divider" />
            <button className="fmt-btn" onClick={() => execFormat('formatBlock', '<blockquote>')} title="Block Quote">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
              </svg>
            </button>
            <button className="fmt-btn" onClick={() => execFormat('insertUnorderedList')} title="Bullet List">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" />
              </svg>
            </button>
            <button className="fmt-btn" onClick={() => execFormat('insertOrderedList')} title="Numbered List">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
                <text x="2" y="8" fill="currentColor" fontSize="8" fontFamily="sans-serif">1</text>
                <text x="2" y="14" fill="currentColor" fontSize="8" fontFamily="sans-serif">2</text>
                <text x="2" y="20" fill="currentColor" fontSize="8" fontFamily="sans-serif">3</text>
              </svg>
            </button>
            <span className="fmt-divider" />
            <button className="fmt-btn" onClick={() => execFormat('insertHorizontalRule')} title="Horizontal Rule">&mdash;</button>
          </div>

          {/* Editor Content */}
          <div className="editor-scroll">
            {activeChapter && (
              <div className="editor-page">
                <h2 className="editor-chapter-title">{activeChapter.title}</h2>
                <div
                  ref={editorRef}
                  className="editor-content"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  onKeyDown={handleKeyDown}
                  data-placeholder="Start writing..."
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="editor-footer">
            <span className="footer-chapter">{activeChapter?.title}</span>
            <span className="footer-words">{wordCount.toLocaleString()} words in chapter</span>
          </div>
        </div>
      </div>
    </div>
  );
}
