import { useState, useEffect, useCallback, useMemo } from 'react'
import { useFastStore, FAST_TYPES } from '../stores/useFastStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import {
  requestNotificationPermission,
  useFastNotifications,
  useScheduleNotifications,
} from '../hooks/useNotifications'
import { getRoast } from '../lib/roasts'
import ProgressRing from './ProgressRing'

function formatTime(ms) {
  if (ms < 0) ms = 0
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getMotivation(progress, elapsed, isComplete) {
  if (isComplete) {
    return {
      message: "You crushed it!",
      sub: "Your discipline is building something powerful.",
    }
  }
  if (progress < 0.1) {
    return {
      message: "You've got this.",
      sub: "The hardest part is starting — and you already did.",
    }
  }
  if (progress < 0.25) {
    return {
      message: "Stay strong.",
      sub: "Your body is beginning to shift into fat-burning mode.",
    }
  }
  if (progress < 0.5) {
    return {
      message: "Keep pushing.",
      sub: "Autophagy is kicking in. Your cells are cleaning house.",
    }
  }
  if (progress < 0.75) {
    return {
      message: "Past the halfway mark!",
      sub: "You're deeper into ketosis now. Mental clarity incoming.",
    }
  }
  if (progress < 0.9) {
    return {
      message: "Almost there.",
      sub: "The finish line is in sight. You're stronger than the hunger.",
    }
  }
  return {
    message: "Final stretch!",
    sub: "Minutes away. Every second counts. Don't quit now.",
  }
}

function getNextScheduledTime(scheduledTime, now) {
  if (!scheduledTime) return null
  const [h, m] = scheduledTime.split(':').map(Number)
  const next = new Date(now)
  next.setHours(h, m, 0, 0)
  if (next.getTime() <= now) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime()
}

function formatCountdown(ms) {
  if (ms <= 0) return 'now'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function FastingTimer() {
  const { activeFast, startFast, completeFast, cancelFast, history } = useFastStore()
  const {
    preferredFastType, setPreferredFastType,
    scheduledStartTime, setScheduledStartTime,
    scheduleEnabled, setScheduleEnabled,
  } = useSettingsStore()
  const [now, setNow] = useState(Date.now())
  const [selectedType, setSelectedType] = useState(preferredFastType)
  const [customHours, setCustomHours] = useState(16)
  const [showSchedule, setShowSchedule] = useState(false)
  const [notifStatus, setNotifStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [roast, setRoast] = useState(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Notification hooks
  useFastNotifications(activeFast, now)
  useScheduleNotifications(scheduleEnabled, scheduledStartTime, activeFast, now)

  const handleEnableNotifications = useCallback(async () => {
    const result = await requestNotificationPermission()
    setNotifStatus(result)
  }, [])

  const handleStart = useCallback(() => {
    setPreferredFastType(selectedType)
    startFast(selectedType, selectedType === 'custom' ? customHours : null)
    // Prompt for notifications on first fast start if not yet asked
    if (notifStatus === 'default') {
      handleEnableNotifications()
    }
  }, [selectedType, customHours, startFast, setPreferredFastType, notifStatus, handleEnableNotifications])

  // End a fast — if target wasn't hit, show a roast before committing.
  const handleEndFast = useCallback(
    (action) => {
      if (!activeFast) return
      const elapsed = Date.now() - activeFast.startTime
      const target = activeFast.targetDurationMs
      if (elapsed < target) {
        setRoast(getRoast(elapsed, target))
      }
      if (action === 'complete') completeFast()
      else cancelFast()
    },
    [activeFast, completeFast, cancelFast]
  )

  const streak = useMemo(() => {
    const fullFasts = history.filter(
      (f) => (f.status === 'completed' || f.status === 'cancelled') && (f.endTime - f.startTime) >= f.targetDurationMs
    )
    const daySet = new Set(fullFasts.map((f) => new Date(f.startTime).toISOString().split('T')[0]))
    const sortedDays = [...daySet].sort().reverse()
    const today = new Date(now).toISOString().split('T')[0]
    const yesterday = new Date(now - 86400000).toISOString().split('T')[0]
    let count = 0
    if (sortedDays[0] === today || sortedDays[0] === yesterday) {
      let checkDate = new Date(sortedDays[0])
      for (const day of sortedDays) {
        if (day === checkDate.toISOString().split('T')[0]) {
          count++
          checkDate.setDate(checkDate.getDate() - 1)
        } else break
      }
    }
    return count
  }, [history, now])

  const nextScheduled = scheduleEnabled ? getNextScheduledTime(scheduledStartTime, now) : null
  const timeUntilNext = nextScheduled ? nextScheduled - now : null

  // Active fast view
  if (activeFast) {
    const elapsed = now - activeFast.startTime
    const remaining = activeFast.targetDurationMs - elapsed
    const progress = Math.min(elapsed / activeFast.targetDurationMs, 1)
    const isComplete = elapsed >= activeFast.targetDurationMs
    const isFasting = !isComplete
    const color = isComplete ? '#10B981' : '#3B82F6'
    const typeInfo = FAST_TYPES[activeFast.type] || FAST_TYPES['16:8']
    const motivation = getMotivation(progress, elapsed, isComplete)

    return (
      <div className="flex flex-col items-center px-4 pt-8">
        <div className="text-sm font-medium text-gray-400 mb-1">
          {activeFast.type === 'custom' ? 'Custom Fast' : typeInfo.label} Fast
        </div>
        <div
          className={`text-xs font-semibold uppercase tracking-wider mb-4 ${
            isComplete ? 'text-success' : 'text-accent'
          }`}
        >
          {isComplete ? 'Eating Window' : 'Fasting'}
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
              <div className="text-xs text-gray-400 mt-1">
                Ends at {new Date(activeFast.startTime + activeFast.targetDurationMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
            </>
          )}
          {isComplete && (
            <div className="text-sm text-success mt-2 font-medium">Goal reached!</div>
          )}
        </ProgressRing>

        {/* Motivational message */}
        <div className="mt-6 text-center max-w-xs">
          <p className={`text-lg font-semibold ${isComplete ? 'text-success' : 'text-white'}`}>
            {motivation.message}
          </p>
          <p className="text-sm text-gray-400 mt-1 leading-relaxed">
            {motivation.sub}
          </p>
        </div>

        {/* Allowed during fast */}
        {isFasting && <FastingAllowed />}

        {streak > 1 && (
          <div className="mt-4 px-4 py-2 bg-accent/10 rounded-full">
            <span className="text-xs font-semibold text-accent">
              {streak} day streak — keep it alive!
            </span>
          </div>
        )}

        <div className="flex gap-3 mt-6 w-full max-w-xs">
          <button
            onClick={() => handleEndFast('complete')}
            className="flex-1 py-3 rounded-xl font-semibold bg-success/20 text-success active:bg-success/30 transition-colors"
          >
            End Fast
          </button>
          <button
            onClick={() => handleEndFast('cancel')}
            className="flex-1 py-3 rounded-xl font-semibold bg-red-500/20 text-red-400 active:bg-red-500/30 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Started {new Date(activeFast.startTime).toLocaleString()}
        </div>

        {roast && <RoastModal roast={roast} onClose={() => setRoast(null)} />}
      </div>
    )
  }

  // Idle view
  return (
    <div className="flex flex-col items-center px-4 pt-8">
      <h1 className="text-2xl font-bold mb-1">FastTrack</h1>
      <p className="text-gray-400 text-sm mb-6">Choose your fasting window</p>

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
        className="mt-6 w-full max-w-xs py-4 rounded-xl font-bold text-lg bg-accent text-white active:bg-accent/80 transition-colors"
      >
        Start Fast
      </button>

      {/* Schedule section */}
      <div className="w-full max-w-xs mt-6">
        <button
          onClick={() => setShowSchedule(!showSchedule)}
          className="flex items-center justify-between w-full px-4 py-3 bg-navy-light rounded-xl"
        >
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gray-400">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span className="text-sm font-medium text-gray-300">Daily Schedule</span>
          </div>
          <div className={`text-xs font-semibold ${scheduleEnabled ? 'text-success' : 'text-gray-500'}`}>
            {scheduleEnabled && scheduledStartTime ? scheduledStartTime : 'Off'}
          </div>
        </button>

        {showSchedule && (
          <div className="mt-2 bg-navy-light rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">Enable schedule</label>
              <button
                onClick={() => setScheduleEnabled(!scheduleEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  scheduleEnabled ? 'bg-accent' : 'bg-navy-lighter'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    scheduleEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {scheduleEnabled && (
              <>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Start fasting at</label>
                  <input
                    type="time"
                    value={scheduledStartTime || '20:00'}
                    onChange={(e) => setScheduledStartTime(e.target.value)}
                    className="w-full bg-navy-lighter rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  You'll get a notification 15 minutes before and when it's time to fast.
                  {scheduledStartTime && ` Eating window ends at ${scheduledStartTime} daily.`}
                </p>
              </>
            )}

            {/* Notification permission */}
            <div className="pt-2 border-t border-navy-lighter">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-300">Notifications</span>
                  <p className="text-xs text-gray-500">Fast ending + schedule reminders</p>
                </div>
                {notifStatus === 'granted' ? (
                  <span className="text-xs font-semibold text-success px-2 py-1 bg-success/10 rounded-lg">On</span>
                ) : notifStatus === 'denied' ? (
                  <span className="text-xs text-gray-500 px-2 py-1 bg-navy-lighter rounded-lg">Blocked</span>
                ) : (
                  <button
                    onClick={handleEnableNotifications}
                    className="text-xs font-semibold text-accent px-3 py-1.5 bg-accent/10 rounded-lg active:bg-accent/20"
                  >
                    Enable
                  </button>
                )}
              </div>
              {notifStatus === 'denied' && (
                <p className="text-xs text-gray-500 mt-1">
                  Notifications are blocked. Enable them in your browser settings for this site.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Next scheduled fast countdown */}
      {scheduleEnabled && timeUntilNext !== null && (
        <div className="w-full max-w-xs mt-3 px-4 py-3 bg-accent/10 rounded-xl text-center">
          <p className="text-xs text-gray-400">Next fast starts in</p>
          <p className="text-lg font-bold text-accent">{formatCountdown(timeUntilNext)}</p>
          <p className="text-xs text-gray-500">
            {new Date(nextScheduled).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}

      {/* Allowed during fast — also show on idle as reference */}
      <FastingAllowed />

      {/* Encouragement when idle */}
      {streak > 0 ? (
        <div className="mt-4 text-center max-w-xs">
          <p className="text-sm font-semibold text-accent">{streak} day streak!</p>
          <p className="text-xs text-gray-400 mt-0.5">Consistency is the key. Keep showing up.</p>
        </div>
      ) : (
        <div className="mt-4 text-center max-w-xs">
          <p className="text-sm text-gray-400">Every journey starts with a single step.</p>
          <p className="text-xs text-gray-500 mt-0.5">Start your first fast and build the habit.</p>
        </div>
      )}

      {roast && <RoastModal roast={roast} onClose={() => setRoast(null)} />}
    </div>
  )
}

function RoastModal({ roast, onClose }) {
  const pct = Math.round(roast.completedPct * 100)
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-navy-light rounded-3xl p-6 border border-red-500/30 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-4xl mb-2">🔥</div>
          <h3 className="text-xl font-bold text-red-400 mb-2">{roast.title}</h3>
          <p className="text-sm text-gray-200 leading-relaxed mb-4">{roast.message}</p>
          <div className="bg-navy-lighter rounded-xl px-4 py-3 mb-5">
            <div className="text-xs text-gray-500 uppercase tracking-wider">You made it</div>
            <div className="text-2xl font-bold text-white">
              {roast.completedHours.toFixed(1)}h
              <span className="text-gray-500 text-base font-normal"> / {roast.targetHours.toFixed(0)}h</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">({pct}% of goal)</div>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold bg-accent text-white active:bg-accent/80 transition-colors"
          >
            I'll do better next time
          </button>
        </div>
      </div>
    </div>
  )
}

const ALLOWED = [
  { icon: '💧', name: 'Water', note: 'Still or sparkling' },
  { icon: '☕', name: 'Black Coffee', note: 'No sugar, cream, or milk' },
  { icon: '🍵', name: 'Plain Tea', note: 'Green, black, herbal — no sweeteners' },
  { icon: '🧂', name: 'Electrolytes', note: 'Salt, potassium, magnesium' },
  { icon: '💊', name: 'Supplements', note: 'Most are fine — check labels' },
]

const AVOID = [
  { icon: '🥛', name: 'Milk / Cream' },
  { icon: '🍬', name: 'Sugar / Sweeteners' },
  { icon: '🧃', name: 'Juice / Soda' },
  { icon: '🍎', name: 'Any calories' },
]

function FastingAllowed() {
  const [open, setOpen] = useState(false)

  return (
    <div className="w-full max-w-xs mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 bg-navy-light rounded-xl"
      >
        <span className="text-sm font-medium text-gray-300">What's OK during your fast</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 bg-navy-light rounded-xl p-4 space-y-4">
          <div>
            <div className="text-xs font-semibold text-success uppercase tracking-wider mb-2">OK to have</div>
            <div className="space-y-2">
              {ALLOWED.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <div className="text-sm text-white">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-navy-lighter">
            <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Avoid</div>
            <div className="space-y-2">
              {AVOID.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm text-gray-400">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-600 pt-2 border-t border-navy-lighter">
            Rule of thumb: anything under ~5 calories won't break your fast.
          </p>
        </div>
      )}
    </div>
  )
}
