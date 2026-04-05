import { useEffect, useRef } from 'react'

const NOTIF_PERMISSION_KEY = 'fasttrack-notif-asked'

export function requestNotificationPermission() {
  if (!('Notification' in window)) return Promise.resolve('denied')
  if (Notification.permission === 'granted') return Promise.resolve('granted')
  if (Notification.permission === 'denied') return Promise.resolve('denied')
  return Notification.requestPermission()
}

export function sendNotification(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      tag, // prevents duplicate notifications with same tag
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
    })
  } catch {
    // Fallback for mobile: use service worker registration
    navigator.serviceWorker?.ready?.then((reg) => {
      reg.showNotification(title, {
        body,
        tag,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
      })
    }).catch(() => {})
  }
}

/**
 * Schedules a notification at a future time using setTimeout.
 * Returns a cleanup function to cancel.
 */
export function scheduleNotification(title, body, tag, delayMs) {
  if (delayMs <= 0) return () => {}
  const id = setTimeout(() => sendNotification(title, body, tag), delayMs)
  return () => clearTimeout(id)
}

/**
 * Hook: fires notifications for an active fast.
 * - 15 min before fast completes
 * - When fast completes
 */
export function useFastNotifications(activeFast, now) {
  const sentRef = useRef(new Set())

  useEffect(() => {
    if (!activeFast) {
      sentRef.current.clear()
      return
    }

    const elapsed = now - activeFast.startTime
    const remaining = activeFast.targetDurationMs - elapsed
    const fastId = activeFast.id

    // 15 minutes warning
    if (remaining <= 15 * 60 * 1000 && remaining > 0 && !sentRef.current.has(`${fastId}-15m`)) {
      sentRef.current.add(`${fastId}-15m`)
      sendNotification(
        'Almost there!',
        '15 minutes left on your fast. You\'re crushing it!',
        `fast-15m-${fastId}`
      )
    }

    // Fast complete
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
 * Hook: fires a notification when it's time to start fasting (schedule).
 */
export function useScheduleNotifications(scheduleEnabled, scheduledStartTime, activeFast, now) {
  const sentRef = useRef(new Set())

  useEffect(() => {
    if (!scheduleEnabled || !scheduledStartTime || activeFast) return

    const [h, m] = scheduledStartTime.split(':').map(Number)
    const target = new Date(now)
    target.setHours(h, m, 0, 0)

    const today = new Date(now).toISOString().split('T')[0]
    const diff = target.getTime() - now

    // 15 min before scheduled start
    if (diff <= 15 * 60 * 1000 && diff > 0 && !sentRef.current.has(`sched-15m-${today}`)) {
      sentRef.current.add(`sched-15m-${today}`)
      sendNotification(
        'Fasting starts soon',
        `Your fasting window begins in ${Math.ceil(diff / 60000)} minutes. Wrap up eating!`,
        `sched-15m-${today}`
      )
    }

    // At scheduled start time (within 60s window)
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
