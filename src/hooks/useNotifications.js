import { useEffect, useRef } from 'react'

export function requestNotificationPermission() {
  if (!('Notification' in window)) return Promise.resolve('denied')
  if (Notification.permission === 'granted') return Promise.resolve('granted')
  if (Notification.permission === 'denied') return Promise.resolve('denied')
  return Notification.requestPermission()
}

export function sendNotification(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  // Always prefer service worker notifications — they survive backgrounding
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.showNotification(title, {
          body,
          tag,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
        })
      })
      .catch(() => {
        // Fallback to regular notification
        try { new Notification(title, { body, tag, icon: '/icon-192.png' }) } catch {}
      })
  } else {
    try { new Notification(title, { body, tag, icon: '/icon-192.png' }) } catch {}
  }
}

/**
 * Hook: pre-schedules notifications when a fast starts.
 *
 * Uses setTimeout to schedule notifications at the exact future times.
 * These fire even if the user switches to another app, as long as the
 * browser process is alive. On iOS PWA, the service worker can keep
 * these alive for a while after backgrounding.
 *
 * Also fires catch-up notifications when the app is reopened.
 */
export function useFastNotifications(activeFast, now) {
  const scheduledRef = useRef(null) // tracks which fast we've scheduled for
  const cleanupRef = useRef([])
  const sentRef = useRef(new Set())

  // Pre-schedule notifications when a fast starts or app opens with active fast
  useEffect(() => {
    if (!activeFast) {
      // Clean up any pending timers
      cleanupRef.current.forEach((fn) => fn())
      cleanupRef.current = []
      scheduledRef.current = null
      sentRef.current.clear()
      return
    }

    // Only schedule once per fast
    if (scheduledRef.current === activeFast.id) return
    scheduledRef.current = activeFast.id

    // Clear old timers
    cleanupRef.current.forEach((fn) => fn())
    cleanupRef.current = []

    const endTime = activeFast.startTime + activeFast.targetDurationMs
    const fifteenBefore = endTime - 15 * 60 * 1000
    const fastId = activeFast.id

    // Schedule 15-min warning
    const delay15 = fifteenBefore - Date.now()
    if (delay15 > 0) {
      const id = setTimeout(() => {
        if (!sentRef.current.has(`${fastId}-15m`)) {
          sentRef.current.add(`${fastId}-15m`)
          sendNotification(
            'Almost there!',
            '15 minutes left on your fast. You\'re crushing it!',
            `fast-15m-${fastId}`
          )
        }
      }, delay15)
      cleanupRef.current.push(() => clearTimeout(id))
    }

    // Schedule completion notification
    const delayDone = endTime - Date.now()
    if (delayDone > 0) {
      const id = setTimeout(() => {
        if (!sentRef.current.has(`${fastId}-done`)) {
          sentRef.current.add(`${fastId}-done`)
          sendNotification(
            'Fast Complete!',
            'You did it! Your fasting window is over. Time to eat.',
            `fast-done-${fastId}`
          )
        }
      }, delayDone)
      cleanupRef.current.push(() => clearTimeout(id))
    }

    return () => {
      cleanupRef.current.forEach((fn) => fn())
      cleanupRef.current = []
    }
  }, [activeFast?.id]) // only re-run when the fast ID changes

  // Catch-up: fire notifications on app reopen if the moment was missed
  useEffect(() => {
    if (!activeFast) return

    const elapsed = now - activeFast.startTime
    const remaining = activeFast.targetDurationMs - elapsed
    const fastId = activeFast.id

    // 15-min mark passed while app was closed
    if (remaining <= 15 * 60 * 1000 && remaining > 0 && !sentRef.current.has(`${fastId}-15m`)) {
      sentRef.current.add(`${fastId}-15m`)
      sendNotification(
        'Almost there!',
        '15 minutes left on your fast. You\'re crushing it!',
        `fast-15m-${fastId}`
      )
    }

    // Fast completed while app was closed
    if (remaining <= 0 && !sentRef.current.has(`${fastId}-done`)) {
      sentRef.current.add(`${fastId}-done`)
      sendNotification(
        'Fast Complete!',
        'You did it! Your fasting window is over. Time to eat.',
        `fast-done-${fastId}`
      )
    }
  }, [activeFast, now])
}

/**
 * Hook: reminds user to log weight if no entry in the last 2 days.
 */
export function useWeightReminder(weightEntries) {
  const checkedRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true

    if (!weightEntries || weightEntries.length === 0) return
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const lastEntry = weightEntries[weightEntries.length - 1]
    const lastDate = new Date(lastEntry.date)
    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000)

    if (daysSince >= 2) {
      const reminderKey = `fasttrack-weight-reminder-${new Date().toISOString().split('T')[0]}`
      if (localStorage.getItem(reminderKey)) return
      localStorage.setItem(reminderKey, '1')

      sendNotification(
        'Log your weight!',
        `It's been ${daysSince} days since your last weigh-in. Hop on the scale to keep your data accurate.`,
        'weight-reminder'
      )
    }
  }, [weightEntries])
}

/**
 * Hook: pre-schedules notifications for fasting schedule.
 */
export function useScheduleNotifications(scheduleEnabled, scheduledStartTime, activeFast, now) {
  const scheduledRef = useRef(null)
  const cleanupRef = useRef([])
  const sentRef = useRef(new Set())

  useEffect(() => {
    if (!scheduleEnabled || !scheduledStartTime || activeFast) {
      cleanupRef.current.forEach((fn) => fn())
      cleanupRef.current = []
      return
    }

    const [h, m] = scheduledStartTime.split(':').map(Number)
    const target = new Date()
    target.setHours(h, m, 0, 0)
    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 1)
    }

    const today = target.toISOString().split('T')[0]
    const schedKey = `${scheduledStartTime}-${today}`

    // Only schedule once per day/time combo
    if (scheduledRef.current === schedKey) return
    scheduledRef.current = schedKey

    cleanupRef.current.forEach((fn) => fn())
    cleanupRef.current = []

    const fifteenBefore = target.getTime() - 15 * 60 * 1000

    // Schedule 15-min warning
    const delay15 = fifteenBefore - Date.now()
    if (delay15 > 0) {
      const id = setTimeout(() => {
        if (!sentRef.current.has(`sched-15m-${today}`)) {
          sentRef.current.add(`sched-15m-${today}`)
          sendNotification(
            'Fasting starts soon',
            `Your fasting window begins in 15 minutes. Wrap up eating!`,
            `sched-15m-${today}`
          )
        }
      }, delay15)
      cleanupRef.current.push(() => clearTimeout(id))
    }

    // Schedule at-time notification
    const delayNow = target.getTime() - Date.now()
    if (delayNow > 0) {
      const id = setTimeout(() => {
        if (!sentRef.current.has(`sched-now-${today}`)) {
          sentRef.current.add(`sched-now-${today}`)
          sendNotification(
            'Time to start fasting!',
            'Your scheduled fasting window is starting now. Open FastTrack to begin.',
            `sched-now-${today}`
          )
        }
      }, delayNow)
      cleanupRef.current.push(() => clearTimeout(id))
    }

    return () => {
      cleanupRef.current.forEach((fn) => fn())
      cleanupRef.current = []
    }
  }, [scheduleEnabled, scheduledStartTime, activeFast])

  // Catch-up on app reopen
  useEffect(() => {
    if (!scheduleEnabled || !scheduledStartTime || activeFast) return

    const [h, m] = scheduledStartTime.split(':').map(Number)
    const target = new Date(now)
    target.setHours(h, m, 0, 0)

    const today = new Date(now).toISOString().split('T')[0]
    const diff = target.getTime() - now

    if (diff <= 15 * 60 * 1000 && diff > 0 && !sentRef.current.has(`sched-15m-${today}`)) {
      sentRef.current.add(`sched-15m-${today}`)
      sendNotification(
        'Fasting starts soon',
        `Your fasting window begins in ${Math.ceil(diff / 60000)} minutes. Wrap up eating!`,
        `sched-15m-${today}`
      )
    }

    if (diff <= 0 && diff > -60000 && !sentRef.current.has(`sched-now-${today}`)) {
      sentRef.current.add(`sched-now-${today}`)
      sendNotification(
        'Time to start fasting!',
        'Your scheduled fasting window is starting now. Open FastTrack to begin.',
        `sched-now-${today}`
      )
    }
  }, [scheduleEnabled, scheduledStartTime, activeFast, now])
}
