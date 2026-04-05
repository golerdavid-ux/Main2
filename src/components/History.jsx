import { useMemo } from 'react'
import { useFastStore, FAST_TYPES } from '../stores/useFastStore'

function formatDuration(ms) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function getDateKey(ts) {
  return new Date(ts).toISOString().split('T')[0]
}

export default function History() {
  const { history, deleteFast } = useFastStore()
  const completed = history.filter((f) => f.status === 'completed')

  const stats = useMemo(() => {
    if (completed.length === 0)
      return { streak: 0, longestStreak: 0, avgDuration: 0, totalHours: 0, completionRate: 0 }

    const totalMs = completed.reduce((sum, f) => sum + (f.endTime - f.startTime), 0)
    const avgDuration = totalMs / completed.length
    const totalHours = totalMs / 3600000

    // Streak calculation: count consecutive days with a completed fast
    const daySet = new Set(completed.map((f) => getDateKey(f.startTime)))
    const sortedDays = [...daySet].sort().reverse()

    let streak = 0
    let longestStreak = 0
    let tempStreak = 0
    const today = getDateKey(Date.now())
    const yesterday = getDateKey(Date.now() - 86400000)

    // Current streak
    if (sortedDays[0] === today || sortedDays[0] === yesterday) {
      let checkDate = new Date(sortedDays[0])
      for (const day of sortedDays) {
        if (day === checkDate.toISOString().split('T')[0]) {
          streak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else break
      }
    }

    // Longest streak
    const allDaysSorted = [...daySet].sort()
    for (let i = 0; i < allDaysSorted.length; i++) {
      if (i === 0) {
        tempStreak = 1
      } else {
        const prev = new Date(allDaysSorted[i - 1])
        const curr = new Date(allDaysSorted[i])
        const diff = (curr - prev) / 86400000
        tempStreak = diff === 1 ? tempStreak + 1 : 1
      }
      longestStreak = Math.max(longestStreak, tempStreak)
    }

    const completionRate = history.length > 0 ? (completed.length / history.length) * 100 : 0

    return { streak, longestStreak, avgDuration, totalHours, completionRate }
  }, [completed, history.length])

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">History & Stats</h2>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Current Streak" value={`${stats.streak} day${stats.streak !== 1 ? 's' : ''}`} color="text-accent" />
        <StatCard label="Longest Streak" value={`${stats.longestStreak} day${stats.longestStreak !== 1 ? 's' : ''}`} color="text-accent" />
        <StatCard label="Avg Duration" value={formatDuration(stats.avgDuration)} color="text-success" />
        <StatCard label="Total Hours" value={`${stats.totalHours.toFixed(1)}h`} color="text-success" />
        <StatCard label="Completed" value={completed.length.toString()} color="text-white" />
        <StatCard label="Completion Rate" value={`${stats.completionRate.toFixed(0)}%`} color="text-white" />
      </div>

      {/* Calendar heatmap - last 90 days */}
      <CalendarHeatmap completed={completed} />

      <h3 className="text-sm font-semibold text-gray-400 mb-3 mt-6">Recent Fasts</h3>
      {history.length === 0 ? (
        <p className="text-gray-500 text-sm">No fasts recorded yet. Start your first fast!</p>
      ) : (
        <div className="space-y-2">
          {history.slice(0, 50).map((fast) => {
            const duration = fast.endTime - fast.startTime
            const typeLabel = FAST_TYPES[fast.type]?.label || fast.type
            return (
              <div key={fast.id} className="flex items-center justify-between bg-navy-light rounded-xl px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        fast.status === 'completed' ? 'bg-success' : 'bg-red-400'
                      }`}
                    />
                    <span className="text-sm font-medium">{typeLabel}</span>
                    <span className="text-xs text-gray-400">{formatDuration(duration)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(fast.startTime).toLocaleDateString()} {new Date(fast.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  onClick={() => deleteFast(fast.id)}
                  className="text-gray-600 hover:text-red-400 text-lg"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-navy-light rounded-xl p-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  )
}

function CalendarHeatmap({ completed }) {
  const days = useMemo(() => {
    const map = {}
    completed.forEach((f) => {
      const key = getDateKey(f.startTime)
      map[key] = (map[key] || 0) + 1
    })

    const result = []
    const now = new Date()
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      result.push({ date: key, count: map[key] || 0 })
    }
    return result
  }, [completed])

  return (
    <div className="bg-navy-light rounded-2xl p-4">
      <div className="text-xs text-gray-400 mb-2">Last 90 Days</div>
      <div className="flex flex-wrap gap-[3px]">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.count} fast${d.count !== 1 ? 's' : ''}`}
            className="w-[10px] h-[10px] rounded-sm"
            style={{
              backgroundColor:
                d.count === 0
                  ? '#1C2541'
                  : d.count === 1
                  ? '#3B82F6'
                  : '#10B981',
            }}
          />
        ))}
      </div>
    </div>
  )
}
