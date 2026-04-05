import { useMemo } from 'react'
import { useFastStore, FAST_TYPES } from '../stores/useFastStore'
import { useWeightStore } from '../stores/useWeightStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { buildCorrelationModel, confidenceLabel } from '../lib/correlationEngine'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, ComposedChart, Bar, ScatterChart, Scatter, ZAxis,
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
    const dateMap = {}
    entries.forEach((e) => {
      if (!dateMap[e.date]) dateMap[e.date] = {}
      dateMap[e.date].weight = e.weightLbs
      dateMap[e.date].bodyFat = e.bodyFatPct
    })
    completed.forEach((f) => {
      const date = new Date(f.startTime).toISOString().split('T')[0]
      if (!dateMap[date]) dateMap[date] = {}
      dateMap[date].fastHours = (f.endTime - f.startTime) / 3600000
      dateMap[date].fasted = true
    })
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }))
  }, [entries, completed])

  // Correlation engine
  const model = useMemo(
    () => buildCorrelationModel(history, entries),
    [history, entries]
  )

  const recentWeight = entries.length > 0 ? entries[entries.length - 1] : null
  const firstWeight = entries.length > 0 ? entries[0] : null
  const weightChange =
    recentWeight && firstWeight
      ? (recentWeight.weightLbs - firstWeight.weightLbs).toFixed(1)
      : null

  const totalFastingHours =
    completed.reduce((sum, f) => sum + (f.endTime - f.startTime), 0) / 3600000
  const avgFastDuration =
    completed.length > 0
      ? completed.reduce((sum, f) => sum + (f.endTime - f.startTime), 0) / completed.length
      : 0
  const avgFastHours = avgFastDuration / 3600000

  const last7 = completed.filter((f) => f.startTime > Date.now() - 7 * 86400000)
  const last30 = completed.filter((f) => f.startTime > Date.now() - 30 * 86400000)

  // Goal projection using correlation model
  const goalProjection = useMemo(() => {
    if (!goalWeight || !recentWeight || recentWeight.weightLbs <= goalWeight) return null
    const daysToGoal = model.predictDaysToGoal(recentWeight.weightLbs, goalWeight, avgFastHours || 16)
    const lbsPerFast = model.predictLoss(avgFastHours || 16)
    return { daysToGoal, lbsPerFast }
  }, [goalWeight, recentWeight, model, avgFastHours])

  const conf = confidenceLabel(model.confidence)

  // Scatter data for correlation chart
  const scatterData = model.pairs.map((p) => ({
    hours: p.fastHours,
    lbs: p.weightDelta,
  }))

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
            <div
              className={`text-xs font-medium ${
                parseFloat(weightChange) <= 0 ? 'text-success' : 'text-red-400'
              }`}
            >
              {parseFloat(weightChange) <= 0 ? '' : '+'}
              {weightChange} lbs total
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
            Avg{' '}
            {formatDuration(
              last30.length > 0
                ? last30.reduce((s, f) => s + (f.endTime - f.startTime), 0) / last30.length
                : 0
            )}
          </div>
        </div>
      </div>

      {/* Correlation Model Card */}
      <div className="bg-navy-light rounded-2xl p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">
          Fasting → Weight Loss Model
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Per hour fasted</span>
            <span className="text-sm font-bold text-accent">
              {model.lbsPerFastHour > 0
                ? `−${(model.lbsPerFastHour).toFixed(3)} lbs`
                : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Per {avgFastHours ? Math.round(avgFastHours) : 16}h fast
            </span>
            <span className="text-sm font-bold text-success">
              {model.predictLoss(avgFastHours || 16) > 0
                ? `−${model.predictLoss(avgFastHours || 16).toFixed(2)} lbs`
                : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Model accuracy (R²)</span>
            <span className="text-sm font-medium">
              {model.r2 > 0 ? `${(model.r2 * 100).toFixed(0)}%` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Data points</span>
            <span className="text-sm font-medium">{model.dataPoints} paired observations</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Confidence</span>
            <span className={`text-sm font-semibold ${conf.color}`}>{conf.text}</span>
          </div>

          {model.dataPoints < 7 && (
            <p className="text-xs text-gray-500 pt-2 border-t border-navy-lighter">
              Log more fasts with weight readings before and after to improve accuracy.
              Need {7 - model.dataPoints} more paired observations.
            </p>
          )}
        </div>
      </div>

      {/* Scatter: Fast Duration vs Weight Lost */}
      {scatterData.length >= 3 && (
        <div className="bg-navy-light rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            Hours Fasted vs Lbs Lost
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <XAxis
                dataKey="hours"
                name="Hours"
                tick={{ fill: '#6B7280', fontSize: 10 }}
                label={{ value: 'hours', position: 'bottom', fill: '#6B7280', fontSize: 10, offset: -5 }}
              />
              <YAxis
                dataKey="lbs"
                name="Lbs Lost"
                tick={{ fill: '#6B7280', fontSize: 10 }}
                width={35}
                label={{ value: 'lbs', angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 10 }}
              />
              <ZAxis range={[40, 40]} />
              <Tooltip
                contentStyle={{ background: '#131A2E', border: 'none', borderRadius: 8, color: '#fff' }}
                formatter={(val, name) => {
                  if (name === 'Hours') return [`${val}h`, 'Duration']
                  return [`${val > 0 ? '−' : '+'}${Math.abs(val).toFixed(2)} lbs`, 'Weight Change']
                }}
              />
              <Scatter data={scatterData} fill="#3B82F6" />
            </ScatterChart>
          </ResponsiveContainer>
          {model.method === 'regression' && (
            <p className="text-xs text-gray-500 mt-2">
              Trend: {model.baseLoss > 0 ? `−${model.baseLoss.toFixed(2)}` : model.baseLoss.toFixed(2)} lbs base +{' '}
              {model.lbsPerFastHour.toFixed(3)} lbs per hour fasted
            </p>
          )}
        </div>
      )}

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
              <span
                className={`text-sm font-bold ${
                  recentWeight.weightLbs <= goalWeight ? 'text-success' : 'text-accent'
                }`}
              >
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
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          ((firstWeight.weightLbs - recentWeight.weightLbs) /
                            (firstWeight.weightLbs - goalWeight)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {Math.round(
                    Math.max(
                      0,
                      ((firstWeight.weightLbs - recentWeight.weightLbs) /
                        (firstWeight.weightLbs - goalWeight)) *
                        100
                    )
                  )}
                  % there
                </div>
              </div>
            )}

            {/* Model-based projection */}
            {goalProjection && (
              <div className="mt-2 pt-3 border-t border-navy-lighter">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-400">Fasting days to goal</span>
                  <span className="text-lg font-bold text-accent">
                    {goalProjection.daysToGoal}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    ~{goalProjection.lbsPerFast.toFixed(2)} lbs per fast
                  </span>
                  <span className={`text-xs font-semibold ${conf.color}`}>{conf.text}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">At 5 fasts/week</span>
                  <span className="text-xs text-gray-400">
                    ~{Math.ceil(goalProjection.daysToGoal / 5)} weeks
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Target date (5x/wk): ~
                  {new Date(
                    Date.now() + Math.ceil(goalProjection.daysToGoal / 5) * 7 * 86400000
                  ).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                {model.confidence !== 'none' && model.dataPoints >= 3 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Based on {model.dataPoints} observed fast↔weight pairs from your data
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!goalWeight && (
          <p className="text-xs text-gray-500">
            Set a goal weight to see your projection and estimated timeline.
          </p>
        )}
      </div>

      {/* Combined chart */}
      {chartData.length > 1 && (
        <div className="bg-navy-light rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            Weight + Fasting Correlation
          </h3>
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
                contentStyle={{
                  background: '#131A2E',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                }}
                labelStyle={{ color: '#9CA3AF' }}
                formatter={(val, name) => {
                  if (name === 'weight') return [`${val} lbs`, 'Weight']
                  if (name === 'fastHours') return [`${val.toFixed(1)}h`, 'Fast Duration']
                  return [val, name]
                }}
              />
              {goalWeight && (
                <ReferenceLine
                  yAxisId="weight"
                  y={goalWeight}
                  stroke="#10B981"
                  strokeDasharray="4 4"
                />
              )}
              <Line
                yAxisId="weight"
                type="monotone"
                dataKey="weight"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
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
