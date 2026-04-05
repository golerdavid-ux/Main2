const icons = {
  timer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M9 2h6" />
      <path d="M12 2v2" />
    </svg>
  ),
  weight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
      <path d="M12 3a4 4 0 0 0-4 4h8a4 4 0 0 0-4-4z" />
      <path d="M6 7h12l1 14H5L6 7z" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 4 5-6" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
}

const labels = {
  timer: 'Timer',
  weight: 'Weight',
  history: 'History',
  dashboard: 'Dashboard',
}

export default function Navigation({ tab, setTab, tabs }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-navy-light border-t border-navy-lighter safe-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
              tab === t ? 'text-accent' : 'text-gray-500'
            }`}
          >
            {icons[t]}
            <span className="text-[10px] font-medium">{labels[t]}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
