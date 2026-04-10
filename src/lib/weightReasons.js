// Curated list of reasons for a weight gain. Using a fixed set lets us
// aggregate this in the Dashboard later to spot patterns.

export const WEIGHT_GAIN_REASONS = [
  { key: 'cheat_meal', label: 'Cheat meal', icon: '🍔' },
  { key: 'alcohol', label: 'Alcohol', icon: '🍺' },
  { key: 'high_sodium', label: 'High sodium', icon: '🧂' },
  { key: 'carbs', label: 'Too many carbs', icon: '🍞' },
  { key: 'dessert', label: 'Dessert / sugar', icon: '🍰' },
  { key: 'eating_out', label: 'Ate out / restaurant', icon: '🍽️' },
  { key: 'travel', label: 'Travel', icon: '✈️' },
  { key: 'stress', label: 'Stress', icon: '😰' },
  { key: 'poor_sleep', label: 'Poor sleep', icon: '😴' },
  { key: 'dehydrated', label: 'Not enough water', icon: '💧' },
  { key: 'skipped_workout', label: 'Skipped workout', icon: '🏋️' },
  { key: 'hormonal', label: 'Hormonal / water', icon: '🌊' },
  { key: 'broke_fast', label: 'Broke a fast early', icon: '🥪' },
  { key: 'unknown', label: 'No idea', icon: '🤷' },
  { key: 'other', label: 'Other', icon: '•' },
]

export function getReasonLabel(key) {
  const r = WEIGHT_GAIN_REASONS.find((r) => r.key === key)
  return r ? `${r.icon} ${r.label}` : null
}
