import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const DENOMINATIONS = ['1', '2', '5', '10', '20', '50', '100'];

const ERROR_TYPES = [
  'Miscut', 'Inverted Overprint', 'Gutter Fold', 'Ink Smear',
  'Misalignment', 'Double Print', 'Missing Print', 'Cutting Error',
  'Fold Over', 'Obstruction', 'Offset Printing', 'Board Break',
];

const GRADERS = ['PMG', 'PCGS', 'CGC', 'Ungraded'];

function App() {
  const [notes, setNotes] = useState([]);
  const [view, setView] = useState('collection'); // 'collection' | 'add' | 'detail'
  const [selectedNote, setSelectedNote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [formData, setFormData] = useState({
    denomination: '',
    seriesYear: '',
    serialNumber: '',
    treasurerSignature: '',
    secretarySignature: '',
    friedbergNumber: '',
    errors: [],
    grade: '',
    grader: '',
    certNumber: '',
    gradingComments: '',
    estimatedValue: '',
    costPaid: '',
    notes: '',
  });

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const fetchNotes = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes`);
      const data = await response.json();
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      showMessage('Failed to load collection', 'error');
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const resetForm = () => {
    setFormData({
      denomination: '', seriesYear: '', serialNumber: '',
      treasurerSignature: '', secretarySignature: '', friedbergNumber: '',
      errors: [], grade: '', grader: '', certNumber: '',
      gradingComments: '', estimatedValue: '', costPaid: '', notes: '',
    });
    setPhoto(null);
    setPhotoPreview(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleErrorToggle = (errorType) => {
    setFormData(prev => ({
      ...prev,
      errors: prev.errors.includes(errorType)
        ? prev.errors.filter(e => e !== errorType)
        : [...prev.errors, errorType],
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const analysis = await response.json();

      if (analysis.friedbergNumber) {
        setFormData(prev => ({ ...prev, friedbergNumber: analysis.friedbergNumber }));
      }

      const parts = [];
      if (analysis.isStarNote) parts.push('Star Note detected!');
      if (analysis.fancySerials && analysis.fancySerials.length > 0) {
        parts.push(`Fancy serial: ${analysis.fancySerials.join(', ')}`);
      }
      if (analysis.friedbergNumber) {
        parts.push(`Friedberg: ${analysis.friedbergNumber}`);
      }

      if (parts.length > 0) {
        showMessage(parts.join(' | '), 'success');
      } else {
        showMessage('Analysis complete - no special features detected', 'info');
      }
    } catch (error) {
      showMessage('Failed to analyze note', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.denomination || !formData.seriesYear) {
      showMessage('Please enter at least the denomination and series year', 'error');
      return;
    }

    setLoading(true);
    try {
      const body = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'errors') {
          body.append(key, JSON.stringify(value));
        } else {
          body.append(key, value);
        }
      });
      if (photo) body.append('photo', photo);

      const response = await fetch(`${API_BASE_URL}/api/notes`, {
        method: 'POST',
        body,
      });
      const data = await response.json();

      if (response.ok && data.success) {
        showMessage(data.message, 'success');
        resetForm();
        setView('collection');
        fetchNotes();
      } else {
        showMessage(data.error || 'Failed to add note', 'error');
      }
    } catch (error) {
      showMessage('Failed to connect to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this note from your Money Book?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/notes/${id}`, { method: 'DELETE' });
      showMessage('Note removed from collection', 'success');
      setView('collection');
      fetchNotes();
    } catch (error) {
      showMessage('Failed to delete note', 'error');
    }
  };

  const handleExportCSV = () => {
    window.open(`${API_BASE_URL}/api/notes/export/csv`, '_blank');
  };

  const filteredNotes = notes.filter(note => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (note.denomination && note.denomination.includes(term)) ||
      (note.seriesYear && note.seriesYear.toLowerCase().includes(term)) ||
      (note.serialNumber && note.serialNumber.toLowerCase().includes(term)) ||
      (note.friedbergNumber && note.friedbergNumber.toLowerCase().includes(term)) ||
      (note.flags && note.flags.some(f => f.toLowerCase().includes(term)))
    );
  });

  const collectionStats = {
    total: notes.length,
    totalValue: notes.reduce((sum, n) => sum + (parseFloat(n.estimatedValue) || 0), 0),
    totalCost: notes.reduce((sum, n) => sum + (parseFloat(n.costPaid) || 0), 0),
    starNotes: notes.filter(n => n.isStarNote).length,
    graded: notes.filter(n => n.grade).length,
  };

  // ─── Detail View ──────────────────────────────────
  const renderDetail = () => {
    if (!selectedNote) return null;
    const n = selectedNote;
    return (
      <div className="detail-view">
        <button className="btn-back" onClick={() => setView('collection')}>
          Back to Collection
        </button>
        <div className="detail-header">
          <h2>${n.denomination} - Series {n.seriesYear}</h2>
          {n.isStarNote && <span className="star-badge">Star Note</span>}
        </div>

        <div className="detail-grid">
          {n.photoFilename && (
            <div className="detail-photo">
              <img
                src={`${API_BASE_URL}/uploads/${n.photoFilename}`}
                alt={`$${n.denomination} Series ${n.seriesYear}`}
              />
            </div>
          )}

          <div className="detail-info">
            <div className="info-section">
              <h3>Identification</h3>
              <div className="info-row"><span>Serial Number:</span><span>{n.serialNumber || 'N/A'}</span></div>
              <div className="info-row"><span>Friedberg #:</span><span>{n.friedbergNumber || 'N/A'}</span></div>
              <div className="info-row"><span>Treasurer:</span><span>{n.treasurerSignature || 'N/A'}</span></div>
              <div className="info-row"><span>Secretary:</span><span>{n.secretarySignature || 'N/A'}</span></div>
            </div>

            {(n.grade || n.grader) && (
              <div className="info-section">
                <h3>Grading</h3>
                <div className="info-row"><span>Grader:</span><span>{n.grader}</span></div>
                <div className="info-row"><span>Grade:</span><span>{n.grade}</span></div>
                {n.certNumber && <div className="info-row"><span>Cert #:</span><span>{n.certNumber}</span></div>}
                {n.gradingComments && <div className="info-row"><span>Comments:</span><span>{n.gradingComments}</span></div>}
              </div>
            )}

            <div className="info-section">
              <h3>Value</h3>
              <div className="info-row"><span>Estimated Value:</span><span>{n.estimatedValue ? `$${n.estimatedValue}` : 'N/A'}</span></div>
              <div className="info-row"><span>Cost Paid:</span><span>{n.costPaid ? `$${n.costPaid}` : 'N/A'}</span></div>
            </div>

            {n.flags && n.flags.length > 0 && (
              <div className="info-section">
                <h3>Special Features</h3>
                <div className="flags-list">
                  {n.flags.map((flag, i) => (
                    <span key={i} className="flag-tag">{flag}</span>
                  ))}
                </div>
              </div>
            )}

            {n.notes && (
              <div className="info-section">
                <h3>Notes</h3>
                <p>{n.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="detail-footer">
          <span className="date-added">Added: {new Date(n.dateAdded).toLocaleDateString()}</span>
          <button className="btn-danger" onClick={() => handleDelete(n.id)}>
            Remove from Collection
          </button>
        </div>
      </div>
    );
  };

  // ─── Add Note Form ────────────────────────────────
  const renderAddForm = () => (
    <div className="add-form">
      <button className="btn-back" onClick={() => { setView('collection'); resetForm(); }}>
        Back to Collection
      </button>
      <h2>Add a New Note</h2>
      <p className="form-subtitle">Enter the details of your banknote below. I'll check for star notes, fancy serials, and look up the Friedberg number for you!</p>

      <form onSubmit={handleSubmit}>
        {/* Photo Upload */}
        <div className="section">
          <h3>Photo</h3>
          <div className="photo-upload-area">
            {photoPreview ? (
              <div className="photo-preview">
                <img src={photoPreview} alt="Note preview" />
                <button type="button" className="btn-remove-photo" onClick={() => { setPhoto(null); setPhotoPreview(null); }}>
                  Remove Photo
                </button>
              </div>
            ) : (
              <label className="upload-label">
                <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
                <div className="upload-placeholder">
                  <span className="upload-icon">+</span>
                  <span>Upload a photo of your note</span>
                  <span className="upload-hint">JPG, PNG, or WEBP up to 10MB</span>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Note Identification */}
        <div className="section">
          <h3>Note Identification</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Denomination *</label>
              <select name="denomination" value={formData.denomination} onChange={handleInputChange} required>
                <option value="">Select...</option>
                {DENOMINATIONS.map(d => (
                  <option key={d} value={d}>${d}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Series Year *</label>
              <input
                type="text" name="seriesYear" value={formData.seriesYear}
                onChange={handleInputChange} placeholder="e.g., 2013 or 2017A" required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Serial Number</label>
              <input
                type="text" name="serialNumber" value={formData.serialNumber}
                onChange={handleInputChange} placeholder="e.g., B12345678*"
              />
            </div>
            <div className="form-group">
              <label>Friedberg # (auto-detected)</label>
              <input
                type="text" name="friedbergNumber" value={formData.friedbergNumber}
                onChange={handleInputChange} placeholder="Auto-fills on Analyze"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Treasurer Signature</label>
              <input
                type="text" name="treasurerSignature" value={formData.treasurerSignature}
                onChange={handleInputChange} placeholder="e.g., Rosa Gumataotao Rios"
              />
            </div>
            <div className="form-group">
              <label>Secretary Signature</label>
              <input
                type="text" name="secretarySignature" value={formData.secretarySignature}
                onChange={handleInputChange} placeholder="e.g., Jacob Lew"
              />
            </div>
          </div>
          <button type="button" className="btn-analyze" onClick={handleAnalyze}>
            Analyze Note
          </button>
        </div>

        {/* Errors */}
        <div className="section">
          <h3>Error Types (if any)</h3>
          <div className="error-grid">
            {ERROR_TYPES.map(err => (
              <label key={err} className={`error-checkbox ${formData.errors.includes(err) ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={formData.errors.includes(err)}
                  onChange={() => handleErrorToggle(err)}
                />
                {err}
              </label>
            ))}
          </div>
        </div>

        {/* Grading */}
        <div className="section">
          <h3>Grading Info</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Grader</label>
              <select name="grader" value={formData.grader} onChange={handleInputChange}>
                {GRADERS.map(g => (
                  <option key={g} value={g === 'Ungraded' ? '' : g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Grade</label>
              <input
                type="text" name="grade" value={formData.grade}
                onChange={handleInputChange} placeholder="e.g., 66 EPQ"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Cert / Label #</label>
              <input
                type="text" name="certNumber" value={formData.certNumber}
                onChange={handleInputChange} placeholder="Certificate number"
              />
            </div>
            <div className="form-group">
              <label>Grading Comments</label>
              <input
                type="text" name="gradingComments" value={formData.gradingComments}
                onChange={handleInputChange} placeholder="Label comments"
              />
            </div>
          </div>
        </div>

        {/* Value */}
        <div className="section">
          <h3>Value</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Estimated Market Value ($)</label>
              <input
                type="number" name="estimatedValue" value={formData.estimatedValue}
                onChange={handleInputChange} placeholder="0.00" step="0.01" min="0"
              />
            </div>
            <div className="form-group">
              <label>Cost Paid ($)</label>
              <input
                type="number" name="costPaid" value={formData.costPaid}
                onChange={handleInputChange} placeholder="0.00 (or leave blank)" step="0.01" min="0"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="section">
          <div className="form-group">
            <label>Notes / Comments</label>
            <textarea
              name="notes" value={formData.notes} onChange={handleInputChange}
              rows="3" placeholder="Any additional details about this note..."
            />
          </div>
        </div>

        <div className="actions">
          <button type="button" className="btn-secondary" onClick={() => { setView('collection'); resetForm(); }}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Add to Money Book'}
          </button>
        </div>
      </form>
    </div>
  );

  // ─── Collection View ──────────────────────────────
  const renderCollection = () => (
    <div className="collection-view">
      <div className="collection-header">
        <div>
          <h2>Your Collection</h2>
          <p className="collection-count">{notes.length} note{notes.length !== 1 ? 's' : ''} cataloged</p>
        </div>
        <div className="header-actions">
          {notes.length > 0 && (
            <button className="btn-export" onClick={handleExportCSV}>
              Export CSV
            </button>
          )}
          <button className="btn-primary" onClick={() => { resetForm(); setView('add'); }}>
            + Add Note
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {notes.length > 0 && (
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-value">{collectionStats.total}</span>
            <span className="stat-label">Total Notes</span>
          </div>
          <div className="stat">
            <span className="stat-value">${collectionStats.totalValue.toLocaleString()}</span>
            <span className="stat-label">Est. Value</span>
          </div>
          <div className="stat">
            <span className="stat-value">${collectionStats.totalCost.toLocaleString()}</span>
            <span className="stat-label">Total Cost</span>
          </div>
          <div className="stat">
            <span className="stat-value">{collectionStats.starNotes}</span>
            <span className="stat-label">Star Notes</span>
          </div>
          <div className="stat">
            <span className="stat-value">{collectionStats.graded}</span>
            <span className="stat-label">Graded</span>
          </div>
        </div>
      )}

      {/* Search */}
      {notes.length > 0 && (
        <div className="search-bar">
          <input
            type="text" placeholder="Search by denomination, series, serial, Friedberg #, or flags..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <div className="notes-grid">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              className="note-card"
              onClick={() => { setSelectedNote(note); setView('detail'); }}
            >
              {note.photoFilename ? (
                <div className="card-photo">
                  <img
                    src={`${API_BASE_URL}/uploads/${note.photoFilename}`}
                    alt={`$${note.denomination}`}
                  />
                </div>
              ) : (
                <div className="card-photo placeholder">
                  <span>${note.denomination}</span>
                </div>
              )}
              <div className="card-info">
                <div className="card-title">
                  ${note.denomination} - Series {note.seriesYear}
                  {note.isStarNote && <span className="star-badge-sm">Star</span>}
                </div>
                {note.serialNumber && (
                  <div className="card-serial">{note.serialNumber}</div>
                )}
                {note.friedbergNumber && (
                  <div className="card-friedberg">{note.friedbergNumber}</div>
                )}
                {note.grade && (
                  <div className="card-grade">{note.grader} {note.grade}</div>
                )}
                {note.flags && note.flags.length > 0 && (
                  <div className="card-flags">
                    {note.flags.slice(0, 3).map((flag, i) => (
                      <span key={i} className="flag-tag-sm">{flag}</span>
                    ))}
                    {note.flags.length > 3 && <span className="flag-tag-sm">+{note.flags.length - 3}</span>}
                  </div>
                )}
                {note.estimatedValue && (
                  <div className="card-value">${parseFloat(note.estimatedValue).toLocaleString()}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">$</div>
          <h3>Your Money Book is empty!</h3>
          <p>Start cataloging your currency collection by adding your first note.</p>
          <button className="btn-primary" onClick={() => { resetForm(); setView('add'); }}>
            Add Your First Note
          </button>
        </div>
      ) : (
        <div className="empty-state">
          <p>No notes match your search.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="App">
      <div className="container">
        <h1>Money Book</h1>
        <p className="subtitle">U.S. Currency Cataloger</p>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {view === 'collection' && renderCollection()}
        {view === 'add' && renderAddForm()}
        {view === 'detail' && renderDetail()}
      </div>
    </div>
  );
}

export default App;
