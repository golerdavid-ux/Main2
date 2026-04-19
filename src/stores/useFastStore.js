import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const FAST_TYPES = {
  '16:8': { label: '16:8', fastHours: 16, eatHours: 8 },
  '18:6': { label: '18:6', fastHours: 18, eatHours: 6 },
  '20:4': { label: '20:4', fastHours: 20, eatHours: 4 },
  '23:1': { label: 'OMAD (23:1)', fastHours: 23, eatHours: 1 },
  custom: { label: 'Custom', fastHours: 16, eatHours: 8 },
}

export { FAST_TYPES }

export const useFastStore = create(
  persist(
    (set, get) => ({
      activeFast: null,
      history: [],

      startFast: (type, customHours, startTimeOverride) => {
        const { activeFast } = get()
        if (activeFast) return false

        const fastType = FAST_TYPES[type] || FAST_TYPES['16:8']
        const fastHours = type === 'custom' && customHours ? customHours : fastType.fastHours
        const targetDurationMs = fastHours * 60 * 60 * 1000

        set({
          activeFast: {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            type,
            startTime: startTimeOverride || Date.now(),
            endTime: null,
            targetDurationMs,
            status: 'active',
          },
        })
        return true
      },

      completeFast: () => {
        const { activeFast, history } = get()
        if (!activeFast) return

        const completed = {
          ...activeFast,
          endTime: Date.now(),
          status: 'completed',
        }
        set({
          activeFast: null,
          history: [completed, ...history],
        })
      },

      cancelFast: () => {
        const { activeFast, history } = get()
        if (!activeFast) return

        const cancelled = {
          ...activeFast,
          endTime: Date.now(),
          status: 'cancelled',
        }
        set({
          activeFast: null,
          history: [cancelled, ...history],
        })
      },

      deleteFast: (id) => {
        set({ history: get().history.filter((f) => f.id !== id) })
      },
    }),
    {
      name: 'fasttrack-fasts',
    }
  )
)
