import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      preferredFastType: '16:8',
      goalWeight: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      scheduledStartTime: null, // e.g. "20:00" for 8pm daily
      scheduleEnabled: false,

      setPreferredFastType: (type) => set({ preferredFastType: type }),
      setGoalWeight: (weight) => set({ goalWeight: weight ? parseFloat(weight) : null }),
      setTimezone: (tz) => set({ timezone: tz }),
      setScheduledStartTime: (time) => set({ scheduledStartTime: time }),
      setScheduleEnabled: (enabled) => set({ scheduleEnabled: enabled }),
    }),
    {
      name: 'fasttrack-settings',
    }
  )
)
