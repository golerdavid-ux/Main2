import { useState, useEffect } from 'react'
import FastingTimer from './components/FastingTimer'
import WeightTracker from './components/WeightTracker'
import History from './components/History'
import Dashboard from './components/Dashboard'
import Navigation from './components/Navigation'
import { useWeightStore } from './stores/useWeightStore'
import { useWeightReminder } from './hooks/useNotifications'

const TABS = ['timer', 'weight', 'history', 'dashboard']

export default function App() {
  const [tab, setTab] = useState('timer')
  const seedIfEmpty = useWeightStore((s) => s.seedIfEmpty)
  const entries = useWeightStore((s) => s.entries)

  useEffect(() => {
    const t = setTimeout(() => seedIfEmpty(), 100)
    return () => clearTimeout(t)
  }, [seedIfEmpty])

  // Remind to log weight if 2+ days since last entry
  useWeightReminder(entries)

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <main className="flex-1 overflow-y-auto pb-20">
        {tab === 'timer' && <FastingTimer />}
        {tab === 'weight' && <WeightTracker />}
        {tab === 'history' && <History />}
        {tab === 'dashboard' && <Dashboard />}
      </main>
      <Navigation tab={tab} setTab={setTab} tabs={TABS} />
    </div>
  )
}
