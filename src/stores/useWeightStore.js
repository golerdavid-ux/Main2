import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { seedWeightData } from '../data/seedWeight'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

const SEED_KEY = 'fasttrack-weight-seeded'

export const useWeightStore = create(
  persist(
    (set, get) => ({
      entries: [],

      _hydrated: false,
      seedIfEmpty: () => {
        if (get().entries.length > 0 || localStorage.getItem(SEED_KEY)) return
        const entries = seedWeightData.map((e) => ({
          id: generateId() + Math.random().toString(36).slice(2, 4),
          date: e.date,
          weightLbs: e.weightLbs,
          bodyFatPct: e.bodyFatPct || null,
          notes: null,
        }))
        localStorage.setItem(SEED_KEY, '1')
        set({ entries })
      },

      addEntry: (entry) => {
        const newEntry = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          date: entry.date,
          weightLbs: parseFloat(entry.weightLbs),
          bodyFatPct: entry.bodyFatPct ? parseFloat(entry.bodyFatPct) : null,
          notes: entry.notes || null,
          reason: entry.reason || null,
        }
        const entries = [...get().entries, newEntry].sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        )
        set({ entries })
      },

      deleteEntry: (id) => {
        set({ entries: get().entries.filter((e) => e.id !== id) })
      },

      importEntries: (data) => {
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data
          if (!Array.isArray(parsed)) return false

          const newEntries = parsed
            .filter((e) => e.date && e.weightLbs)
            .map((e) => ({
              id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + Math.random().toString(36).slice(2, 4),
              date: e.date,
              weightLbs: parseFloat(e.weightLbs),
              bodyFatPct: e.bodyFatPct ? parseFloat(e.bodyFatPct) : null,
              notes: e.notes || null,
            }))

          const entries = [...get().entries, ...newEntries].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          )
          set({ entries })
          return true
        } catch {
          return false
        }
      },
    }),
    {
      name: 'fasttrack-weight',
    }
  )
)
