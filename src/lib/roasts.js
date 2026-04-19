// Playful roasts for when a fast is ended before the target duration.
// Messages escalate by how far short the fast fell from its goal.

const MILD = [
  "Close, but no cigar. Your stomach won the negotiation this time.",
  "So close! Your future self just rolled its eyes at you.",
  "You were RIGHT there. The finish line was whispering your name.",
  "Almost. The fridge outsmarted you in the final round.",
]

const MEDIUM = [
  "Really? You were halfway in and still bailed. Commit to the bit.",
  "That wasn't a fast — that was a snack break with extra steps.",
  "Your hunger is not an emergency. But your discipline apparently is.",
  "You can't speed-run weight loss. Put the fork down next time.",
]

const HARSH = [
  "Was that even a fast? I've seen commercial breaks longer than that.",
  "You tapped out faster than a first-round UFC fight. Embarrassing.",
  "You had ONE job. Literally. All you had to do was… not eat.",
  "That wasn't a fast. That was an intermission. Do better.",
]

const BRUTAL = [
  "You barely started. The toaster wasn't even plugged in yet. Pathetic.",
  "I've held my breath longer than that fast. C'mon.",
  "You call that a fast? That's just 'skipping a snack.' Get serious.",
  "That was barely a fast. Be honest with yourself and try again tomorrow.",
]

/**
 * Returns a roast message based on how much of the target fast was completed.
 * @param {number} elapsedMs - actual fast duration
 * @param {number} targetMs - target fast duration
 * @returns {{ title: string, message: string, completedPct: number, completedHours: number, targetHours: number }}
 */
export function getRoast(elapsedMs, targetMs) {
  const completedPct = Math.max(0, Math.min(1, elapsedMs / targetMs))
  const completedHours = elapsedMs / 3600000
  const targetHours = targetMs / 3600000

  let pool
  let title
  if (completedPct >= 0.85) {
    pool = MILD
    title = "Oof, so close."
  } else if (completedPct >= 0.5) {
    pool = MEDIUM
    title = "You bailed."
  } else if (completedPct >= 0.25) {
    pool = HARSH
    title = "That was weak."
  } else {
    pool = BRUTAL
    title = "Are you serious?"
  }

  const message = pool[Math.floor(Math.random() * pool.length)]
  return { title, message, completedPct, completedHours, targetHours }
}
