import { useMemo } from 'react'
import { useFastStore, FAST_TYPES } from '../stores/useFastStore'
import { useWeightStore } from '../stores/useWeightStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Scatter, ComposedChart, Bar,
} from 'recharts'

function formatDuration(ms) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function Dashboard() {
  const { history, activeFast } = useFastStore()
  const { entries } = useWeightStore()
  const { goalWeight, setGoalWeight } = useSettingsStore()
  const completed = history.filter((f) => f.status === 'completed')

  const chartData = useMemo(() => {
    // Build a map of dates to data
    const dateMap = {}

    entries.forEach((e) => {
      if (!dateMap[e.date]) dateMap[e.date] = {}
      dateMap[e.date].weight = e.weightLbs
      dateMap[e.date].bodyFat = e.bodyFatPct
    })

    completed.forEach((f) => {
      const date = new Date(f.startTime).toISOString().split('T')[0]
      if (!dateMap[date]) dateMap[date] = {}
      dateMap[date].fastHours = ((f.endTime - f.startTime) / 3600000)
      dateMap[date].fasted = true
    })

    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }))
  }, [entries, completed])

  const recentWeight = entries.length > 0 ? entries[entries.length - 1] : null
  const firstWeight = entries.length > 0 ? entries[0] : null
  const weightChange = recentWeight && firstWeight
    ? (recentWeight.weightLbs - firstWeight.weightLbs).toFixed(1)
    : null

  const totalFastingHours = completed.reduce((sum, f) => sum + (f.endTime - f.startTime), 0) / 3600000
  const avgFastDuration = completed.length > 0
    ? completed.reduce((sum, f) => sum + (f.endTime - f.startTime), 0) / completed.length
    : 0

  const last7 = completed.filter((f) => f.startTime > Date.now() - 7 * 86400000)
  const last30 = completed.filter((f) => f.startTime > Date.now() - 30 * 86400000)

  // Estimate days to goal based on recent weight trend
  const goalEstimate = useMemo(() => {
    if (!goalWeight || !recentWeight || recentWeight.weightLbs <= goalWeight) return null
    const lbsToLose = recentWeight.weightLbs - goalWeight

    // Calculate avg weight loss per fasting day from historical data
    // Use last 30 days of weight data to find the trend
    const recent30 = entries.filter((e) => {
      const d = new Date(e.date)
      return d >= new Date(Date.now() - 30 * 86400000)
    })

    if (recent30.length < 2) {
      // Fallback: assume ~0.5 lbs per fasting day (conservative estimate)
      const daysNeeded = Math.ceil(lbsToLose / 0.5)
      return { daysNeeded, lbsPerWeek: 3.5, method: 'estimate' }
    }

    // Linear regression on recent data
    const first = recent30[0]
    const last = recent30[recent30.length - 1]
    const daysBetween = (new Date(last.date) - new Date(first.date)) / 86400000
    if (daysBetween <= 0) return { daysNeeded: Math.ceil(lbsToLose / 0.5), lbsPerWeek: 3.5, method: 'estimate' }

    const lbsPerDay = (first.weightLbs - last.weightLbs) / daysBetween
    if (lbsPerDay <= 0) {
      // Weight is trending up, use conservative estimate
      return { daysNeeded: Math.ceil(lbsToLose / 0.3), lbsPerWeek: 2.1, method: 'estimate', trending: 'up' }
    }

    const daysNeeded = Math.ceil(lbsToLose / lbsPerDay)
    const lbsPerWeek = lbsPerDay * 7

    return { daysNeeded, lbsPerWeek: Math.round(lbsPerWeek * 10) / 10, method: 'trend' }
  }, [goalWeight, recentWeight, entries])

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">Dashboard</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-navy-light rounded-xl p-3">
          <div className="text-xs text-gray-400">Current Weight</div>
          <div className="text-lg font-bold text-white">
            {recentWeight ? `${recentWeight.weightLbs} lbs` : '—'}
          </div>
          {weightChange && (
            <div className={`text-xs font-medium ${parseFloat(weightChange) <= 0 ? 'text-success' : 'text-red-400'}`}>
              {parseFloat(weightChange) <= 0 ? '' : '+'}{weightChange} lbs total
            </div>
          )}
        </div>
        <div className="bg-navy-light rounded-xl p-3">
          <div className="text-xs text-gray-400">Status</div>
          <div className={`text-lg font-bold ${activeFast ? 'text-accent' : 'text-gray-500'}`}>
            {activeFast ? 'Fasting' : 'Not Fasting'}
          </div>
          {activeFast && (
            <div className="text-xs text-gray-400">
              {FAST_TYPES[activeFast.type]?.label || activeFast.type}
            </div>
          )}
        </div>
        <div className="bg-navy-light rounded-xl p-3">
          <div className="text-xs text-gray-400">This Week</div>
          <div className="text-lg font-bold text-accent">{last7.length} fasts</div>
          <div className="text-xs text-gray-400">
            {(last7.reduce((s, f) => s + (f.endTime - f.startTime), 0) / 3600000).toFixed(1)}h total
          </div>
        </div>
        <div className="bg-navy-light rounded-xl p-3">
          <div className="text-xs text-gray-400">This Month</div>
          <div className="text-lg font-bold text-accent">{last30.length} fasts</div>
          <div className="text-xs text-gray-400">
            Avg {formatDuration(last30.length > 0 ? last30.reduce((s, f) => s + (f.endTime - f.startTime), 0) / last30.length : 0)}
          </div>
        </div>
      </div>

      {/* Goal weight + projection */}
      <div className="bg-navy-light rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-400">Weight Goal</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              placeholder="Goal lbs"
              value={goalWeight || ''}
              onChange={(e) => setGoalWeight(e.target.value)}
              className="w-24 bg-navy-lighter rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <span className="text-xs text-gray-500">lbs</span>
          </div>
        </div>

        {goalWeight && recentWeight && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Current</span>
              <span className="text-sm font-medium">{recentWeight.weightLbs} lbs</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Goal</span>
              <span className="text-sm font-medium text-success">{goalWeight} lbs</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">To lose</span>
              <span className={`text-sm font-bold ${recentWeight.weightLbs <= goalWeight ? 'text-success' : 'text-accent'}`}>
                {recentWeight.weightLbs <= goalWeight
                  ? 'Goal reached!'
                  : `${(recentWeight.weightLbs - goalWeight).toFixed(1)} lbs`}
              </span>
            </div>

            {/* Progress bar */}
            {firstWeight && recentWeight.weightLbs > goalWeight && (
              <div>
                <div className="h-2 bg-navy-lighter rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((firstWeight.weightLbs - recentWeight.weightLbs) / (firstWeight.weightLbs - goalWeight)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {Math.round(Math.max(0, ((firstWeight.weightLbs - recentWeight.weightLbs) / (firstWeight.weightLbs - goalWeight)) * 100))}% there
                </div>
              </div>
            )}

            {/* Projection */}
            {goalEstimate && (
              <div className="mt-2 pt-3 border-t border-navy-lighter">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-400">Est. fasting days to goal</span>
                  <span className="text-lg font-bold text-accent">{goalEstimate.daysNeeded}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {goalEstimate.method === 'trend' ? 'Based on your trend' : 'Conservative estimate'}
                  </span>
                  <span className="text-xs text-gray-400">
                    ~{goalEstimate.lbsPerWeek} lbs/week
                  </span>
                </div>
                {goalEstimate.trending === 'up' && (
                  <p className="text-xs text-amber-400 mt-2">
                    Weight is trending up recently. Consistent fasting will turn this around.
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Target date: ~{new Date(Date.now() + goalEstimate.daysNeeded * 86400000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        )}

        {!goalWeight && (
          <p className="text-xs text-gray-500">Set a goal weight to see your projection and estimated timeline.</p>
        )}
      </div>

      {/* Combined chart */}
      {chartData.length > 1 && (
        <div className="bg-navy-light rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Weight + Fasting Correlation</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData}>
              <XAxis
                dataKey="date"
                tick={{ fill: '#6B7280', fontSize: 10 }}
                tickFormatter={(d) => d.slice(5)}
              />
              <YAxis
                yAxisId="weight"
                domain={['dataMin - 2', 'dataMax + 2']}
                tick={{ fill: '#6B7280', fontSize: 10 }}
                width={40}
              />
              <YAxis yAxisId="fast" orientation="right" hide />
              <Tooltip
                contentStyle={{ background: '#131A2E', border: 'none', borderRadius: 8, color: '#fff' }}
                labelStyle={{ color: '#9CA3AF' }}
                formatter={(val, name) => {
                  if (name === 'weight') return [`${val} lbs`, 'Weight']
                  if (name === 'fastHours') return [`${val.toFixed(1)}h`, 'Fast Duration']
                  return [val, name]
                }}
              />
              {goalWeight && (
                <ReferenceLine yAxisId="weight" y={goalWeight} stroke="#10B981" strokeDasharray="4 4" />
              )}
              <Line
                yAxisId="weight"
                type="monotone"
                dataKey="weight"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', r: 3 }}
                connectNulls
              />
              <Bar
                yAxisId="fast"
                dataKey="fastHours"
                fill="#10B981"
                opacity={0.3}
                radius={[2, 2, 0, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length <= 1 && (
        <div className="bg-navy-light rounded-2xl p-6 mb-6 text-center">
          <p className="text-gray-500 text-sm">
            Log some fasts and weight entries to see your correlation chart here.
          </p>
        </div>
      )}

      {/* Quick stats */}
      <div className="bg-navy-light rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">All Time</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Total Fasting Hours</span>
            <span className="font-medium">{totalFastingHours.toFixed(1)}h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Average Fast</span>
            <span className="font-medium">{formatDuration(avgFastDuration)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Fasts Completed</span>
            <span className="font-medium">{completed.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
