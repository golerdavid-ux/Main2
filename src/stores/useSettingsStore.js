import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      preferredFastType: '16:8',
      goalWeight: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

      setPreferredFastType: (type) => set({ preferredFastType: type }),
      setGoalWeight: (weight) => set({ goalWeight: weight ? parseFloat(weight) : null }),
      setTimezone: (tz) => set({ timezone: tz }),
    }),
    {
      name: 'fasttrack-settings',
    }
  )
)
