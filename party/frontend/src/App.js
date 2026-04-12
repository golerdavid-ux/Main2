import React, { useCallback, useEffect, useState } from 'react';
import './App.css';

// ---------- API helper ----------
async function api(path, { method = 'GET', body, form } = {}) {
  const opts = {
    method,
    credentials: 'include',
    headers: {},
  };
  if (form) {
    opts.body = form;
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
  }
  return { ok: res.ok, status: res.status, data };
}

const COURSES = ['appetizer', 'main', 'side', 'dessert', 'drink'];
const BUDGET_CATEGORIES = ['venue', 'food', 'decor', 'music', 'other'];
const VENDOR_CATEGORIES = ['venue', 'caterer', 'dj', 'florist', 'bakery', 'photographer', 'rentals', 'other'];
const ASSIGNEES = ['David', 'Arielle', 'vendor'];

function formatMoney(n) {
  const v = Number(n) || 0;
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// ========================================================================
// App
// ========================================================================
export default function App() {
  const [authed, setAuthed] = useState(null); // null = unknown, true/false after check
  const [view, setView] = useState('dashboard');
  const [settings, setSettings] = useState({});

  const checkAuth = useCallback(async () => {
    const { status } = await api('/api/settings');
    setAuthed(status !== 401);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (!authed) return;
    api('/api/settings').then(({ ok, data }) => { if (ok) setSettings(data || {}); });
  }, [authed]);

  const onLogin = async () => {
    setAuthed(true);
  };

  const onLogout = async () => {
    await api('/api/logout', { method: 'POST' });
    setAuthed(false);
  };

  if (authed === null) {
    return <div className="app"><p style={{ padding: 40, textAlign: 'center' }}>Loading…</p></div>;
  }
  if (authed === false) {
    return <LoginGate onLogin={onLogin} />;
  }

  return (
    <div className="app">
      <Header settings={settings} onLogout={onLogout} setView={setView} />
      <Nav view={view} setView={setView} />
      {view === 'dashboard' && <DashboardView />}
      {view === 'tasks' && <TasksView />}
      {view === 'budget' && <BudgetView />}
      {view === 'vendors' && <VendorsView />}
      {view === 'shopping' && <ShoppingView />}
      {view === 'menu' && <MenuView />}
      {view === 'inspiration' && <InspirationView />}
      {view === 'settings' && (
        <SettingsView
          settings={settings}
          onSaved={(newFields) => setSettings((s) => ({ ...s, ...newFields }))}
        />
      )}
    </div>
  );
}

// ========================================================================
// LoginGate
// ========================================================================
function LoginGate({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { ok, data } = await api('/api/login', { method: 'POST', body: { password } });
    setLoading(false);
    if (ok) {
      onLogin();
    } else {
      setError(data?.error || 'Login failed');
    }
  };

  return (
    <div className="app">
      <div className="login">
        <h1>Party Planning</h1>
        <p>Enter the shared password to continue.</p>
        <form onSubmit={submit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
          />
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="primary" disabled={loading || !password}>
              {loading ? 'Checking…' : 'Unlock'}
            </button>
          </div>
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  );
}

// ========================================================================
// Header + Nav
// ========================================================================
function Header({ settings, onLogout, setView }) {
  const days = daysUntil(settings.party_date);
  const name = settings.party_name || "Arielle's 40th Birthday Party";
  return (
    <div className="header">
      <div>
        <h1>{name}</h1>
        <div className="subtitle">
          {settings.party_date ? formatDate(settings.party_date) : 'Set the party date in Settings'}
          {settings.venue_headline ? ' • ' + settings.venue_headline : ''}
        </div>
      </div>
      <div className="countdown">
        {days !== null ? (
          <>
            <div className="days">{days >= 0 ? days : 0}</div>
            <div className="label">{days >= 0 ? 'days to go' : 'it happened!'}</div>
          </>
        ) : (
          <button className="ghost" onClick={() => setView('settings')}>Set date →</button>
        )}
        <button className="ghost" onClick={onLogout} style={{ marginTop: 8 }}>Log out</button>
      </div>
    </div>
  );
}

function Nav({ view, setView }) {
  const tabs = [
    ['dashboard', 'Dashboard'],
    ['tasks', 'Tasks'],
    ['budget', 'Budget'],
    ['vendors', 'Vendors'],
    ['shopping', 'Shopping'],
    ['menu', 'Menu'],
    ['inspiration', 'Inspiration'],
    ['settings', 'Settings'],
  ];
  return (
    <div className="nav">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          className={view === key ? 'active' : ''}
          onClick={() => setView(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function daysUntil(isoDate) {
  if (!isoDate) return null;
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

// ========================================================================
// Dashboard
// ========================================================================
function DashboardView() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api('/api/dashboard').then(({ ok, data }) => { if (ok) setData(data); });
  }, []);

  if (!data) return <div className="card"><p>Loading dashboard…</p></div>;

  const { countdown, budget, tasks, deadlines } = data;

  return (
    <div className="dashboard-grid">
      <div className="card">
        <h3>Countdown</h3>
        <div className="stat">{countdown.daysUntil !== null ? Math.max(0, countdown.daysUntil) : '—'}</div>
        <div className="stat-label">days to {countdown.partyName || 'the party'}</div>
        {countdown.partyDate && <div className="sub" style={{ marginTop: 8, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{formatDate(countdown.partyDate)}</div>}
      </div>

      <div className="card">
        <h3>Budget</h3>
        <div className="stat">{formatMoney(budget.actual)}</div>
        <div className="stat-label">spent of {formatMoney(budget.estimated)} budgeted</div>
        <div className="progress">
          <div
            className="progress-fill"
            style={{ width: budget.estimated > 0 ? Math.min(100, (budget.actual / budget.estimated) * 100) + '%' : '0%' }}
          />
        </div>
        {budget.byCategory.length > 0 && (
          <div className="badges">
            {budget.byCategory.slice(0, 5).map((c) => (
              <span key={c.category} className="badge">{c.category}: {formatMoney(c.actual)}</span>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Tasks</h3>
        <div className="stat">{tasks.openCount}</div>
        <div className="stat-label">open • {tasks.doneCount} done</div>
        {tasks.upcoming.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {tasks.upcoming.map((t) => (
              <div key={t.id} className="sub" style={{ padding: '4px 0', fontSize: '0.85rem' }}>
                • {t.title} {t.dueDate && <span style={{ color: 'rgba(255,255,255,0.5)' }}>— {formatDate(t.dueDate)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Next deadlines</h3>
        {deadlines.length === 0 ? (
          <p className="empty">Nothing urgent 🎉</p>
        ) : (
          deadlines.slice(0, 8).map((d, i) => (
            <div key={i} className="sub" style={{ padding: '6px 0', fontSize: '0.85rem' }}>
              <span className={'badge ' + (d.overdue ? 'danger' : d.kind === 'vendor_balance' || d.kind === 'vendor_deposit' ? 'warn' : '')}>
                {d.kind === 'task' ? (d.overdue ? 'overdue' : 'task') : d.kind === 'vendor_deposit' ? 'deposit' : 'balance'}
              </span>
              {' '}{d.label}
              {d.date && <span style={{ color: 'rgba(255,255,255,0.5)' }}> — {formatDate(d.date)}</span>}
              {d.amount && <span style={{ color: 'rgba(255,255,255,0.5)' }}> — {formatMoney(d.amount)}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ========================================================================
// Tasks view
// ========================================================================
function TasksView() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', dueDate: '', assignee: '', notes: '' });
  const load = () => api('/api/tasks').then(({ ok, data }) => { if (ok) setItems(data.tasks); });
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const { ok } = await api('/api/tasks', { method: 'POST', body: form });
    if (ok) { setForm({ title: '', dueDate: '', assignee: '', notes: '' }); load(); }
  };
  const toggle = async (t) => {
    await api(`/api/tasks/${t.id}`, { method: 'PUT', body: { status: t.status === 'done' ? 'open' : 'done' } });
    load();
  };
  const del = async (t) => {
    if (!window.confirm('Delete this task?')) return;
    await api(`/api/tasks/${t.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <div className="card">
        <h2>Add task</h2>
        <form onSubmit={add}>
          <div className="form-grid">
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Book the venue" />
            </div>
            <div className="field">
              <label>Due date</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="field">
              <label>Assignee</label>
              <select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
                <option value="">—</option>
                {ASSIGNEES.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="primary">Add task</button>
        </form>
      </div>

      <div className="card">
        <h2>Tasks ({items.length})</h2>
        {items.length === 0 ? <p className="empty">No tasks yet.</p> : (
          <div className="list">
            {items.map((t) => (
              <div key={t.id} className={'list-item' + (t.status === 'done' ? ' done' : '')}>
                <input
                  type="checkbox"
                  checked={t.status === 'done'}
                  onChange={() => toggle(t)}
                  style={{ width: 'auto', marginTop: 4 }}
                />
                <div className="main">
                  <div className={'title' + (t.status === 'done' ? ' strike' : '')}>{t.title}</div>
                  {t.notes && <div className="sub">{t.notes}</div>}
                  <div className="meta">
                    {t.dueDate ? formatDate(t.dueDate) : 'no date'}
                    {t.assignee && ' • ' + t.assignee}
                  </div>
                </div>
                <div className="actions">
                  <button className="danger" onClick={() => del(t)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ========================================================================
// Budget view
// ========================================================================
function BudgetView() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ category: '', description: '', estimatedCost: '', actualCost: '' });
  const load = () => api('/api/budget').then(({ ok, data }) => { if (ok) setItems(data.items); });
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    const { ok } = await api('/api/budget', { method: 'POST', body: form });
    if (ok) { setForm({ category: '', description: '', estimatedCost: '', actualCost: '' }); load(); }
  };
  const togglePaid = async (b) => {
    await api(`/api/budget/${b.id}`, { method: 'PUT', body: { paid: !b.paid } });
    load();
  };
  const del = async (b) => {
    if (!window.confirm('Delete this line item?')) return;
    await api(`/api/budget/${b.id}`, { method: 'DELETE' });
    load();
  };

  const totalEst = items.reduce((s, i) => s + (Number(i.estimatedCost) || 0), 0);
  const totalAct = items.reduce((s, i) => s + (Number(i.actualCost) || 0), 0);

  return (
    <>
      <div className="card">
        <h2>Add line item</h2>
        <form onSubmit={add}>
          <div className="form-grid">
            <div className="field">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">—</option>
                {BUDGET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Venue deposit" />
            </div>
            <div className="field">
              <label>Estimated $</label>
              <input type="number" step="0.01" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} />
            </div>
            <div className="field">
              <label>Actual $</label>
              <input type="number" step="0.01" value={form.actualCost} onChange={(e) => setForm({ ...form, actualCost: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="primary">Add</button>
        </form>
      </div>

      <div className="card">
        <h2>
          Budget ({items.length})
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
            {formatMoney(totalAct)} actual / {formatMoney(totalEst)} estimated
          </span>
        </h2>
        {items.length === 0 ? <p className="empty">Nothing yet.</p> : (
          <div className="list">
            {items.map((b) => (
              <div key={b.id} className="list-item">
                <div className="main">
                  <div className="title">{b.description}</div>
                  <div className="sub">
                    <span className="badge">{b.category || 'uncategorized'}</span>
                    {' '}
                    {formatMoney(b.actualCost)} / {formatMoney(b.estimatedCost)}
                    {b.paid && ' '}{b.paid && <span className="badge ok">paid</span>}
                  </div>
                </div>
                <div className="actions">
                  <button className="ghost" onClick={() => togglePaid(b)}>{b.paid ? 'Unpay' : 'Mark paid'}</button>
                  <button className="danger" onClick={() => del(b)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ========================================================================
// Vendors view
// ========================================================================
function VendorsView() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    name: '', category: '', contactName: '', phone: '', email: '',
    website: '', depositAmount: '', balanceAmount: '', notes: '',
  });
  const load = () => api('/api/vendors').then(({ ok, data }) => { if (ok) setItems(data.vendors); });
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const { ok } = await api('/api/vendors', { method: 'POST', body: form });
    if (ok) {
      setForm({ name: '', category: '', contactName: '', phone: '', email: '', website: '', depositAmount: '', balanceAmount: '', notes: '' });
      load();
    }
  };
  const toggleDeposit = async (v) => {
    await api(`/api/vendors/${v.id}`, { method: 'PUT', body: { depositPaid: !v.depositPaid } });
    load();
  };
  const del = async (v) => {
    if (!window.confirm(`Delete ${v.name}?`)) return;
    await api(`/api/vendors/${v.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <div className="card">
        <h2>Add vendor</h2>
        <form onSubmit={add}>
          <div className="form-grid">
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Catering" />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">—</option>
                {VENDOR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Contact name</label>
              <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Website</label>
              <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="field">
              <label>Deposit $</label>
              <input type="number" step="0.01" value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} />
            </div>
            <div className="field">
              <label>Balance $</label>
              <input type="number" step="0.01" value={form.balanceAmount} onChange={(e) => setForm({ ...form, balanceAmount: e.target.value })} />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="primary">Add vendor</button>
        </form>
      </div>

      <div className="card">
        <h2>Vendors ({items.length})</h2>
        {items.length === 0 ? <p className="empty">No vendors yet.</p> : (
          <div className="list">
            {items.map((v) => (
              <div key={v.id} className="list-item">
                <div className="main">
                  <div className="title">
                    {v.name} {v.category && <span className="badge">{v.category}</span>}
                  </div>
                  {v.contactName && <div className="sub">Contact: {v.contactName}</div>}
                  <div className="sub">
                    {v.phone && '📞 ' + v.phone}
                    {v.phone && v.email && ' • '}
                    {v.email && '✉️ ' + v.email}
                  </div>
                  {v.website && (
                    <div className="sub">
                      <a href={v.website} target="_blank" rel="noreferrer" style={{ color: '#ffd1e1' }}>{v.website}</a>
                    </div>
                  )}
                  <div className="badges">
                    {v.depositAmount > 0 && (
                      <span className={'badge ' + (v.depositPaid ? 'ok' : 'warn')}>
                        deposit {formatMoney(v.depositAmount)} {v.depositPaid ? '✓ paid' : 'unpaid'}
                      </span>
                    )}
                    {v.balanceAmount > 0 && (
                      <span className="badge warn">balance {formatMoney(v.balanceAmount)}</span>
                    )}
                  </div>
                  {v.notes && <div className="meta">{v.notes}</div>}
                </div>
                <div className="actions">
                  {v.depositAmount > 0 && (
                    <button className="ghost" onClick={() => toggleDeposit(v)}>
                      {v.depositPaid ? 'Mark unpaid' : 'Mark paid'}
                    </button>
                  )}
                  <button className="danger" onClick={() => del(v)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ========================================================================
// Shopping view
// ========================================================================
function ShoppingView() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', store: '', quantity: '' });
  const load = () => api('/api/shopping').then(({ ok, data }) => { if (ok) setItems(data.items); });
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const { ok } = await api('/api/shopping', { method: 'POST', body: form });
    if (ok) { setForm({ name: '', store: '', quantity: '' }); load(); }
  };
  const toggle = async (s) => {
    await api(`/api/shopping/${s.id}`, { method: 'PUT', body: { purchased: !s.purchased } });
    load();
  };
  const del = async (s) => {
    await api(`/api/shopping/${s.id}`, { method: 'DELETE' });
    load();
  };

  // Group by store
  const groups = {};
  for (const it of items) {
    const k = it.store || 'anywhere';
    if (!groups[k]) groups[k] = [];
    groups[k].push(it);
  }

  return (
    <>
      <div className="card">
        <h2>Add item</h2>
        <form onSubmit={add}>
          <div className="form-grid">
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Item</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Balloons" />
            </div>
            <div className="field">
              <label>Store</label>
              <input value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })} placeholder="Party City" />
            </div>
            <div className="field">
              <label>Quantity</label>
              <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="40" />
            </div>
          </div>
          <button type="submit" className="primary">Add</button>
        </form>
      </div>

      {Object.keys(groups).length === 0 ? (
        <div className="card"><p className="empty">No items yet.</p></div>
      ) : (
        Object.entries(groups).map(([store, group]) => (
          <div key={store} className="card">
            <h2>{store} ({group.length})</h2>
            <div className="list">
              {group.map((s) => (
                <div key={s.id} className={'list-item' + (s.purchased ? ' done' : '')}>
                  <input
                    type="checkbox"
                    checked={s.purchased}
                    onChange={() => toggle(s)}
                    style={{ width: 'auto', marginTop: 4 }}
                  />
                  <div className="main">
                    <div className={'title' + (s.purchased ? ' strike' : '')}>
                      {s.name}{s.quantity ? ' × ' + s.quantity : ''}
                    </div>
                  </div>
                  <div className="actions">
                    <button className="danger" onClick={() => del(s)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  );
}

// ========================================================================
// Menu view
// ========================================================================
function MenuView() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ course: 'main', name: '', servingCount: '', dietaryNotes: '' });
  const load = () => api('/api/menu').then(({ ok, data }) => { if (ok) setItems(data.items); });
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const { ok } = await api('/api/menu', { method: 'POST', body: form });
    if (ok) { setForm({ course: 'main', name: '', servingCount: '', dietaryNotes: '' }); load(); }
  };
  const del = async (m) => {
    await api(`/api/menu/${m.id}`, { method: 'DELETE' });
    load();
  };

  const groups = {};
  for (const c of COURSES) groups[c] = [];
  for (const it of items) {
    const k = it.course || 'main';
    if (!groups[k]) groups[k] = [];
    groups[k].push(it);
  }

  return (
    <>
      <div className="card">
        <h2>Add dish</h2>
        <form onSubmit={add}>
          <div className="form-grid">
            <div className="field">
              <label>Course</label>
              <select value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}>
                {COURSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Dish</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Beef tenderloin" />
            </div>
            <div className="field">
              <label>Servings</label>
              <input type="number" value={form.servingCount} onChange={(e) => setForm({ ...form, servingCount: e.target.value })} />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Dietary notes</label>
              <input value={form.dietaryNotes} onChange={(e) => setForm({ ...form, dietaryNotes: e.target.value })} placeholder="GF, contains nuts" />
            </div>
          </div>
          <button type="submit" className="primary">Add dish</button>
        </form>
      </div>

      {COURSES.map((course) => {
        const group = groups[course] || [];
        if (group.length === 0) return null;
        return (
          <div key={course} className="card">
            <h2 style={{ textTransform: 'capitalize' }}>{course} ({group.length})</h2>
            <div className="list">
              {group.map((m) => (
                <div key={m.id} className="list-item">
                  <div className="main">
                    <div className="title">{m.name}</div>
                    <div className="sub">
                      {m.servingCount > 0 && `${m.servingCount} servings`}
                      {m.servingCount > 0 && m.dietaryNotes && ' • '}
                      {m.dietaryNotes}
                    </div>
                    {m.notes && <div className="meta">{m.notes}</div>}
                  </div>
                  <div className="actions">
                    <button className="danger" onClick={() => del(m)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <div className="card"><p className="empty">No dishes yet.</p></div>
      )}
    </>
  );
}

// ========================================================================
// Inspiration view
// ========================================================================
function InspirationView() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState(null);

  const load = () => api('/api/inspiration').then(({ ok, data }) => { if (ok) setItems(data.items); });
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim() && !body.trim() && !photo) return;
    const form = new FormData();
    form.append('title', title);
    form.append('body', body);
    if (photo) form.append('photo', photo);
    const { ok, data } = await api('/api/inspiration', { method: 'POST', form });
    if (ok) {
      setTitle(''); setBody(''); setPhoto(null);
      const fileInput = document.getElementById('inspiration-photo-input');
      if (fileInput) fileInput.value = '';
      load();
    } else {
      alert(data?.error || 'Upload failed');
    }
  };

  const del = async (n) => {
    if (!window.confirm('Delete this note?')) return;
    await api(`/api/inspiration/${n.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <div className="card">
        <h2>Add inspiration</h2>
        <form onSubmit={add}>
          <div className="form-grid wide">
            <div className="field">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dress idea" />
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
            </div>
            <div className="field">
              <label>Photo (optional)</label>
              <input
                id="inspiration-photo-input"
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <button type="submit" className="primary">Save</button>
        </form>
      </div>

      <div className="card">
        <h2>Inspiration ({items.length})</h2>
        {items.length === 0 ? <p className="empty">Nothing yet.</p> : (
          <div className="list">
            {items.map((n) => (
              <div key={n.id} className="list-item">
                <div className="main">
                  {n.title && <div className="title">{n.title}</div>}
                  {n.body && <div className="sub" style={{ whiteSpace: 'pre-wrap' }}>{n.body}</div>}
                  {n.photoKey && (
                    <img
                      src={'/api/photos/' + n.photoKey.replace(/^inspiration\//, '')}
                      alt={n.title || 'inspiration'}
                      className="thumb"
                    />
                  )}
                  <div className="meta">{formatDate(n.createdAt)}</div>
                </div>
                <div className="actions">
                  <button className="danger" onClick={() => del(n)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ========================================================================
// Settings view
// ========================================================================
function SettingsView({ settings, onSaved }) {
  const [form, setForm] = useState({
    party_name: settings.party_name || '',
    party_date: settings.party_date || '',
    venue_headline: settings.venue_headline || '',
    guest_count_goal: settings.guest_count_goal || '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setForm({
      party_name: settings.party_name || '',
      party_date: settings.party_date || '',
      venue_headline: settings.venue_headline || '',
      guest_count_goal: settings.guest_count_goal || '',
    });
  }, [settings]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const { ok } = await api('/api/settings', { method: 'PUT', body: form });
    setSaving(false);
    if (ok) {
      setMsg('Saved.');
      onSaved(form);
      setTimeout(() => setMsg(''), 2000);
    } else {
      setMsg('Save failed.');
    }
  };

  return (
    <div className="card">
      <h2>Party settings</h2>
      <form onSubmit={save}>
        <div className="form-grid">
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Party name</label>
            <input value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} placeholder="40th Birthday Party" />
          </div>
          <div className="field">
            <label>Party date</label>
            <input type="date" value={form.party_date} onChange={(e) => setForm({ ...form, party_date: e.target.value })} />
          </div>
          <div className="field">
            <label>Guest count goal</label>
            <input type="number" value={form.guest_count_goal} onChange={(e) => setForm({ ...form, guest_count_goal: e.target.value })} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Venue headline</label>
            <input value={form.venue_headline} onChange={(e) => setForm({ ...form, venue_headline: e.target.value })} placeholder="The Rose Garden, 7pm" />
          </div>
        </div>
        <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
        {msg && <span style={{ marginLeft: 12, color: 'rgba(255,255,255,0.7)' }}>{msg}</span>}
      </form>
    </div>
  );
}
