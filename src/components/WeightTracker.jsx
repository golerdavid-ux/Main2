import { useState, useRef, useMemo } from 'react'
import { useWeightStore } from '../stores/useWeightStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { WEIGHT_GAIN_REASONS, getReasonLabel } from '../lib/weightReasons'

const RANGES = [
  { key: '1W', label: '1W', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: '6M', label: '6M', days: 180 },
  { key: '1Y', label: '1Y', days: 365 },
  { key: 'ALL', label: 'All', days: Infinity },
]

export default function WeightTracker() {
  const { entries, addEntry, deleteEntry, importEntries } = useWeightStore()
  const { goalWeight, setGoalWeight } = useSettingsStore()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [notes, setNotes] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [range, setRange] = useState('3M')
  const [pendingEntry, setPendingEntry] = useState(null) // entry awaiting reason confirmation
  const fileRef = useRef()

  // Previous weight on-or-before a given date — used to detect gains.
  const getPreviousWeight = (targetDate) => {
    const prior = entries
      .filter((e) => e.date <= targetDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
    return prior.length > 0 ? prior[prior.length - 1] : null
  }

  const commitEntry = (entry) => {
    addEntry(entry)
    setWeight('')
    setBodyFat('')
    setNotes('')
    setPendingEntry(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!weight) return
    const newWeight = parseFloat(weight)
    const prev = getPreviousWeight(date)
    const entry = {
      date,
      weightLbs: weight,
      bodyFatPct: bodyFat || null,
      notes: notes || null,
      reason: null,
    }
    // If this is a weight gain vs. the most recent prior entry, prompt for a reason.
    if (prev && newWeight > prev.weightLbs) {
      setPendingEntry({ ...entry, prevWeight: prev.weightLbs, delta: newWeight - prev.weightLbs })
    } else {
      commitEntry(entry)
    }
  }

  const handleReasonSelect = (reasonKey) => {
    if (!pendingEntry) return
    const { prevWeight, delta, ...entry } = pendingEntry
    commitEntry({ ...entry, reason: reasonKey })
  }

  const handleSkipReason = () => {
    if (!pendingEntry) return
    const { prevWeight, delta, ...entry } = pendingEntry
    commitEntry(entry)
  }

  const handleImportText = () => {
    const ok = importEntries(importText)
    setImportMsg(ok ? 'Imported successfully!' : 'Invalid JSON format')
    if (ok) setImportText('')
    setTimeout(() => setImportMsg(''), 3000)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const ok = importEntries(ev.target.result)
      setImportMsg(ok ? 'File imported!' : 'Invalid file format')
      setTimeout(() => setImportMsg(''), 3000)
    }
    reader.readAsText(file)
  }

  const rangeDays = RANGES.find((r) => r.key === range)?.days ?? Infinity
  const cutoffDate = rangeDays === Infinity
    ? null
    : new Date(Date.now() - rangeDays * 86400000).toISOString().split('T')[0]

  const chartData = useMemo(() => {
    const filtered = cutoffDate
      ? entries.filter((e) => e.date >= cutoffDate)
      : entries
    return filtered.map((e) => ({
      date: e.date,
      weight: e.weightLbs,
      bodyFat: e.bodyFatPct,
    }))
  }, [entries, cutoffDate])

  // Summary for selected range
  const rangeSummary = useMemo(() => {
    if (chartData.length < 2) return null
    const first = chartData[0]
    const last = chartData[chartData.length - 1]
    const change = last.weight - first.weight
    const high = Math.max(...chartData.map((d) => d.weight))
    const low = Math.min(...chartData.map((d) => d.weight))
    return { change, high, low }
  }, [chartData])

  const daysSinceLastEntry = useMemo(() => {
    if (entries.length === 0) return null
    const last = entries[entries.length - 1]
    return Math.floor((Date.now() - new Date(last.date).getTime()) / 86400000)
  }, [entries])

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">Weight Tracker</h2>

      {daysSinceLastEntry !== null && daysSinceLastEntry >= 2 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
          <span className="text-lg mt-0.5">⚖️</span>
          <div>
            <p className="text-sm font-semibold text-amber-400">
              {daysSinceLastEntry} days since last weigh-in
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Consistent tracking makes your projections more accurate. Hop on the scale!
            </p>
          </div>
        </div>
      )}

      {entries.length > 1 && (
        <div className="bg-navy-light rounded-2xl p-4 mb-6">
          {/* Range toggle */}
          <div className="flex gap-1 mb-3">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  range === r.key
                    ? 'bg-accent text-white'
                    : 'bg-navy-lighter text-gray-400 active:bg-navy'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Range summary */}
          {rangeSummary && (
            <div className="flex justify-between mb-3 text-xs">
              <span className={rangeSummary.change <= 0 ? 'text-success font-semibold' : 'text-red-400 font-semibold'}>
                {rangeSummary.change <= 0 ? '' : '+'}{rangeSummary.change.toFixed(1)} lbs
              </span>
              <span className="text-gray-500">
                H: {rangeSummary.high} · L: {rangeSummary.low}
              </span>
            </div>
          )}

          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis
                  yAxisId="left"
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  width={40}
                />
                {chartData.some((d) => d.bodyFat) && (
                  <YAxis yAxisId="right" orientation="right" domain={['dataMin - 1', 'dataMax + 1']} hide />
                )}
                <Tooltip
                  contentStyle={{ background: '#131A2E', border: 'none', borderRadius: 8, color: '#fff' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                {goalWeight && (
                  <ReferenceLine yAxisId="left" y={goalWeight} stroke="#10B981" strokeDasharray="4 4" label="" />
                )}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="weight"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={chartData.length <= 60}
                  name="Weight (lbs)"
                />
                {chartData.some((d) => d.bodyFat) && (
                  <Line
                    type="monotone"
                    dataKey="bodyFat"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    name="Body Fat %"
                    yAxisId="right"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-500 text-center py-8">No data in this range</p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <label className="text-xs text-gray-400">Goal:</label>
            <input
              type="number"
              placeholder="lbs"
              value={goalWeight || ''}
              onChange={(e) => setGoalWeight(e.target.value)}
              className="w-20 bg-navy-lighter rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {goalWeight && <span className="text-xs text-success">{goalWeight} lbs</span>}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-navy-light rounded-2xl p-4 mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-navy-lighter rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Weight (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="185.0"
              required
              className="w-full bg-navy-lighter rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Body Fat % (opt)</label>
            <input
              type="number"
              step="0.1"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              placeholder="20.0"
              className="w-full bg-navy-lighter rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Notes (opt)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. post-workout"
              className="w-full bg-navy-lighter rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-2.5 rounded-xl font-semibold bg-accent text-white active:bg-accent/80 transition-colors"
        >
          Log Weight
        </button>
      </form>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowImport(!showImport)}
          className="text-xs text-accent underline"
        >
          {showImport ? 'Hide Import' : 'Import JSON'}
        </button>
      </div>

      {showImport && (
        <div className="bg-navy-light rounded-2xl p-4 mb-4 space-y-3">
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='[{"date":"2024-01-01","weightLbs":185,"bodyFatPct":20}]'
            rows={4}
            className="w-full bg-navy-lighter rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleImportText}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-accent/20 text-accent active:bg-accent/30"
            >
              Import Text
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-accent/20 text-accent active:bg-accent/30"
            >
              Upload File
            </button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </div>
          {importMsg && (
            <div className={`text-xs ${importMsg.includes('success') || importMsg.includes('imported') ? 'text-success' : 'text-red-400'}`}>
              {importMsg}
            </div>
          )}
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-400">Recent Entries</h3>
          {[...entries].reverse().slice(0, 20).map((e) => {
            const reasonLabel = e.reason ? getReasonLabel(e.reason) : null
            return (
              <div key={e.id} className="flex items-center justify-between bg-navy-light rounded-xl px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{e.weightLbs} lbs</div>
                  <div className="text-xs text-gray-400 truncate">
                    {e.date}
                    {e.bodyFatPct && ` · ${e.bodyFatPct}% BF`}
                    {e.notes && ` · ${e.notes}`}
                  </div>
                  {reasonLabel && (
                    <div className="text-xs text-amber-400 mt-0.5">{reasonLabel}</div>
                  )}
                </div>
                <button
                  onClick={() => deleteEntry(e.id)}
                  className="text-gray-600 hover:text-red-400 text-lg ml-2"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      {pendingEntry && (
        <ReasonPickerModal
          delta={pendingEntry.delta}
          prevWeight={pendingEntry.prevWeight}
          newWeight={parseFloat(pendingEntry.weightLbs)}
          onPick={handleReasonSelect}
          onSkip={handleSkipReason}
        />
      )}
    </div>
  )
}

function ReasonPickerModal({ delta, prevWeight, newWeight, onPick, onSkip }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-6"
      onClick={onSkip}
    >
      <div
        className="w-full max-w-sm bg-navy-light rounded-3xl p-5 border border-amber-500/30 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="text-3xl mb-1">📈</div>
          <h3 className="text-lg font-bold text-white">Weight went up</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {prevWeight.toFixed(1)} → {newWeight.toFixed(1)} lbs
            <span className="text-amber-400 font-semibold"> (+{delta.toFixed(1)})</span>
          </p>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            What's the likely reason? This helps spot patterns over time.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {WEIGHT_GAIN_REASONS.map((r) => (
            <button
              key={r.key}
              onClick={() => onPick(r.key)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-navy-lighter text-left text-xs text-gray-200 active:bg-accent/20 active:text-accent transition-colors"
            >
              <span className="text-base">{r.icon}</span>
              <span className="truncate">{r.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onSkip}
          className="w-full py-2.5 rounded-xl text-xs font-semibold text-gray-400 active:text-white"
        >
          Skip — no reason
        </button>
      </div>
    </div>
  )
}
