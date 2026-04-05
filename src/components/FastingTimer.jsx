import { useState, useEffect, useCallback } from 'react'
import { useFastStore, FAST_TYPES } from '../stores/useFastStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import ProgressRing from './ProgressRing'

function formatTime(ms) {
  if (ms < 0) ms = 0
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FastingTimer() {
  const { activeFast, startFast, completeFast, cancelFast } = useFastStore()
  const { preferredFastType, setPreferredFastType } = useSettingsStore()
  const [now, setNow] = useState(Date.now())
  const [selectedType, setSelectedType] = useState(preferredFastType)
  const [customHours, setCustomHours] = useState(16)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const handleStart = useCallback(() => {
    setPreferredFastType(selectedType)
    startFast(selectedType, selectedType === 'custom' ? customHours : null)
  }, [selectedType, customHours, startFast, setPreferredFastType])

  if (activeFast) {
    const elapsed = now - activeFast.startTime
    const remaining = activeFast.targetDurationMs - elapsed
    const progress = Math.min(elapsed / activeFast.targetDurationMs, 1)
    const isComplete = elapsed >= activeFast.targetDurationMs
    const isFasting = !isComplete
    const color = isComplete ? '#10B981' : '#3B82F6'
    const typeInfo = FAST_TYPES[activeFast.type] || FAST_TYPES['16:8']

    return (
      <div className="flex flex-col items-center px-4 pt-8">
        <div className="text-sm font-medium text-gray-400 mb-1">
          {activeFast.type === 'custom' ? 'Custom Fast' : typeInfo.label} Fast
        </div>
        <div
          className={`text-xs font-semibold uppercase tracking-wider mb-6 ${
            isComplete ? 'text-success' : 'text-accent'
          }`}
        >
          {isComplete ? '✓ Fasting Complete — Eating Window' : 'Fasting'}
        </div>

        <ProgressRing progress={progress} color={color}>
          <div className="text-3xl font-mono font-bold tracking-tight">
            {formatTime(elapsed)}
          </div>
          <div className="text-xs text-gray-400 mt-1">elapsed</div>
          {isFasting && (
            <>
              <div className="text-lg font-mono text-gray-300 mt-2">
                {formatTime(remaining)}
              </div>
              <div className="text-xs text-gray-500">remaining</div>
            </>
          )}
          {isComplete && (
            <div className="text-sm text-success mt-2 font-medium">Goal reached!</div>
          )}
        </ProgressRing>

        <div className="flex gap-3 mt-8 w-full max-w-xs">
          <button
            onClick={completeFast}
            className="flex-1 py-3 rounded-xl font-semibold bg-success/20 text-success active:bg-success/30 transition-colors"
          >
            End Fast
          </button>
          <button
            onClick={cancelFast}
            className="flex-1 py-3 rounded-xl font-semibold bg-red-500/20 text-red-400 active:bg-red-500/30 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Started {new Date(activeFast.startTime).toLocaleString()}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center px-4 pt-8">
      <h1 className="text-2xl font-bold mb-1">FastTrack</h1>
      <p className="text-gray-400 text-sm mb-8">Choose your fasting window</p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6">
        {Object.entries(FAST_TYPES).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setSelectedType(key)}
            className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
              selectedType === key
                ? 'bg-accent text-white ring-2 ring-accent/50'
                : 'bg-navy-lighter text-gray-300 active:bg-navy-light'
            }`}
          >
            {val.label}
          </button>
        ))}
      </div>

      {selectedType === 'custom' && (
        <div className="flex items-center gap-3 mb-6">
          <label className="text-sm text-gray-400">Hours:</label>
          <input
            type="number"
            min="1"
            max="72"
            value={customHours}
            onChange={(e) => setCustomHours(Math.max(1, Math.min(72, parseInt(e.target.value) || 1)))}
            className="w-20 bg-navy-lighter border border-navy-lighter rounded-lg px-3 py-2 text-center text-white focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      )}

      <ProgressRing progress={0} color="#1C2541">
        <div className="text-3xl font-mono font-bold text-gray-500">00:00:00</div>
        <div className="text-sm text-gray-500 mt-2">Ready to start</div>
      </ProgressRing>

      <button
        onClick={handleStart}
        className="mt-8 w-full max-w-xs py-4 rounded-xl font-bold text-lg bg-accent text-white active:bg-accent/80 transition-colors"
      >
        Start Fast
      </button>
    </div>
  )
}
