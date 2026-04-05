/**
 * Fasting ↔ Weight Loss Correlation Engine
 *
 * Pairs each fast with before/after weight readings to build a model:
 *   lbs_lost = baseRate + (hoursCoeff × fastHours)
 *
 * As data accumulates, predictions improve. With <3 data points,
 * falls back to conservative estimates.
 *
 * Key insight: longer fasts should correlate with more weight loss.
 * The algorithm captures this per-user relationship over time.
 */

/**
 * For each fast, find the closest weight reading before and after,
 * then compute the weight delta attributed to that fast.
 */
export function buildFastWeightPairs(fasts, weightEntries) {
  if (!fasts.length || !weightEntries.length) return []

  // Index weight entries by date for fast lookup
  const weightByDate = {}
  weightEntries.forEach((e) => {
    weightByDate[e.date] = e.weightLbs
  })

  // Sort weight entries by date
  const sortedWeights = [...weightEntries].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  )

  const pairs = []

  for (const fast of fasts) {
    const fastEndDate = new Date(fast.endTime).toISOString().split('T')[0]
    const fastStartDate = new Date(fast.startTime).toISOString().split('T')[0]
    const fastHours = (fast.endTime - fast.startTime) / 3600000

    // Find closest weight BEFORE this fast (same day or up to 1 day before)
    let weightBefore = null
    for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
      const checkDate = new Date(fast.startTime - dayOffset * 86400000)
        .toISOString()
        .split('T')[0]
      if (weightByDate[checkDate] !== undefined) {
        weightBefore = weightByDate[checkDate]
        break
      }
    }

    // Find closest weight AFTER this fast (same day fast ended, or up to 2 days after)
    let weightAfter = null
    for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
      const checkDate = new Date(fast.endTime + dayOffset * 86400000)
        .toISOString()
        .split('T')[0]
      if (weightByDate[checkDate] !== undefined) {
        weightAfter = weightByDate[checkDate]
        break
      }
    }

    if (weightBefore !== null && weightAfter !== null) {
      pairs.push({
        fastId: fast.id,
        fastHours: Math.round(fastHours * 10) / 10,
        weightBefore,
        weightAfter,
        weightDelta: Math.round((weightBefore - weightAfter) * 100) / 100,
        date: fastStartDate,
      })
    }
  }

  return pairs
}

/**
 * Simple linear regression: y = a + b*x
 * Returns { slope, intercept, r2 }
 */
function linearRegression(points) {
  const n = points.length
  if (n < 2) return null

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0
  for (const { x, y } of points) {
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
    sumY2 += y * y
  }

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  // R² (coefficient of determination)
  const yMean = sumY / n
  let ssTot = 0, ssRes = 0
  for (const { x, y } of points) {
    ssTot += (y - yMean) ** 2
    ssRes += (y - (intercept + slope * x)) ** 2
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot

  return { slope, intercept, r2 }
}

/**
 * Build the correlation model from fast/weight pairs.
 *
 * Returns:
 *  - lbsPerFastHour: how much weight lost per hour of fasting
 *  - lbsPerTypicalFast: expected loss for a typical fast (user's avg duration)
 *  - r2: model fit (0-1, higher = more predictable)
 *  - dataPoints: number of paired observations
 *  - confidence: 'low' | 'medium' | 'high' based on data points and R²
 *  - predictLoss(hours): function to estimate weight loss for given fast duration
 */
export function buildCorrelationModel(fasts, weightEntries) {
  const allEnded = fasts.filter(
    (f) => f.status === 'completed' || f.status === 'cancelled'
  )
  const pairs = buildFastWeightPairs(allEnded, weightEntries)

  const result = {
    pairs,
    dataPoints: pairs.length,
    lbsPerFastHour: 0,
    lbsPerTypicalFast: 0,
    baseLoss: 0,
    r2: 0,
    confidence: 'none',
    method: 'none',
    predictLoss: () => 0,
    predictDaysToGoal: () => null,
  }

  if (pairs.length === 0) {
    // No paired data yet — use conservative fallback
    result.method = 'fallback'
    result.confidence = 'none'
    result.lbsPerFastHour = 0.03 // ~0.5 lbs per 16h fast
    result.lbsPerTypicalFast = 0.5
    result.predictLoss = (hours) => hours * 0.03
    result.predictDaysToGoal = (currentWeight, goalWeight, avgFastHours) => {
      if (currentWeight <= goalWeight) return null
      const lbsToLose = currentWeight - goalWeight
      const lbsPerFast = (avgFastHours || 16) * 0.03
      return Math.ceil(lbsToLose / lbsPerFast)
    }
    return result
  }

  if (pairs.length < 3) {
    // Too few points for regression — use simple average
    const avgDelta = pairs.reduce((s, p) => s + p.weightDelta, 0) / pairs.length
    const avgHours = pairs.reduce((s, p) => s + p.fastHours, 0) / pairs.length
    const lbsPerHour = avgHours > 0 ? Math.max(0, avgDelta / avgHours) : 0.03

    result.method = 'average'
    result.confidence = 'low'
    result.lbsPerFastHour = Math.round(lbsPerHour * 1000) / 1000
    result.lbsPerTypicalFast = Math.round(avgDelta * 100) / 100
    result.predictLoss = (hours) => Math.max(0, hours * lbsPerHour)
    result.predictDaysToGoal = (currentWeight, goalWeight, avgFastHours) => {
      if (currentWeight <= goalWeight) return null
      const lbsToLose = currentWeight - goalWeight
      const lbsPerFast = Math.max(0.1, (avgFastHours || avgHours) * lbsPerHour)
      return Math.ceil(lbsToLose / lbsPerFast)
    }
    return result
  }

  // Enough data — run linear regression: fastHours → weightDelta
  const regressionPoints = pairs.map((p) => ({ x: p.fastHours, y: p.weightDelta }))
  const reg = linearRegression(regressionPoints)

  if (!reg || (reg.slope <= 0 && reg.intercept <= 0)) {
    // Model says fasting doesn't help (likely noisy data or weight trending up)
    // Fall back to positive-only average of pairs where weight actually dropped
    const positivePairs = pairs.filter((p) => p.weightDelta > 0)
    if (positivePairs.length === 0) {
      result.method = 'insufficient'
      result.confidence = 'low'
      result.lbsPerFastHour = 0.03
      result.lbsPerTypicalFast = 0.5
      result.predictLoss = (hours) => hours * 0.03
      result.predictDaysToGoal = (currentWeight, goalWeight, avgFastHours) => {
        if (currentWeight <= goalWeight) return null
        return Math.ceil((currentWeight - goalWeight) / Math.max(0.1, (avgFastHours || 16) * 0.03))
      }
      return result
    }
    const avgDelta = positivePairs.reduce((s, p) => s + p.weightDelta, 0) / positivePairs.length
    const avgHours = positivePairs.reduce((s, p) => s + p.fastHours, 0) / positivePairs.length
    result.method = 'positive-average'
    result.confidence = 'low'
    result.lbsPerFastHour = Math.round((avgDelta / avgHours) * 1000) / 1000
    result.lbsPerTypicalFast = Math.round(avgDelta * 100) / 100
    result.predictLoss = (hours) => Math.max(0, hours * (avgDelta / avgHours))
    result.predictDaysToGoal = (currentWeight, goalWeight, avgFastHours) => {
      if (currentWeight <= goalWeight) return null
      const lbsPerFast = Math.max(0.1, (avgFastHours || avgHours) * (avgDelta / avgHours))
      return Math.ceil((currentWeight - goalWeight) / lbsPerFast)
    }
    return result
  }

  // Good regression model
  result.method = 'regression'
  result.baseLoss = Math.round(reg.intercept * 1000) / 1000
  result.lbsPerFastHour = Math.round(reg.slope * 1000) / 1000
  result.r2 = Math.round(reg.r2 * 1000) / 1000

  const avgHours = pairs.reduce((s, p) => s + p.fastHours, 0) / pairs.length
  result.lbsPerTypicalFast = Math.round((reg.intercept + reg.slope * avgHours) * 100) / 100

  // Confidence based on data points + R²
  if (pairs.length >= 15 && reg.r2 >= 0.3) result.confidence = 'high'
  else if (pairs.length >= 7 && reg.r2 >= 0.15) result.confidence = 'medium'
  else result.confidence = 'low'

  result.predictLoss = (hours) => Math.max(0, reg.intercept + reg.slope * hours)

  result.predictDaysToGoal = (currentWeight, goalWeight, avgFastHours) => {
    if (currentWeight <= goalWeight) return null
    const lbsToLose = currentWeight - goalWeight
    const lbsPerFast = Math.max(0.1, reg.intercept + reg.slope * (avgFastHours || avgHours))
    return Math.ceil(lbsToLose / lbsPerFast)
  }

  return result
}

/**
 * Format confidence level for display
 */
export function confidenceLabel(confidence) {
  switch (confidence) {
    case 'high': return { text: 'High confidence', color: 'text-success' }
    case 'medium': return { text: 'Growing confidence', color: 'text-accent' }
    case 'low': return { text: 'Early estimate', color: 'text-amber-400' }
    default: return { text: 'No data yet', color: 'text-gray-500' }
  }
}
