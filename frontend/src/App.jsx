import { useCallback, useEffect, useState } from 'react'
import { loadAll } from './api'
import Overview from './pages/Overview'
import Workload from './pages/Workload'
import CalendarPage from './pages/CalendarPage'
import Projects from './pages/Projects'
import Defects from './pages/Defects'
import Team from './pages/Team'

const TABS = [
  ['overview', 'Overview'],
  ['workload', 'Workload'],
  ['calendar', 'Calendar'],
  ['projects', 'Projects'],
  ['defects', 'Defects'],
  ['team', 'Team'],
]

export default function App() {
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const refresh = useCallback(() => {
    loadAll().then(setData).catch((e) => setError(String(e.message || e)))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <>
      <header className="app-header">
        <div className="app-title">
          Team <span className="accent">Pulse</span> Dashboard
        </div>
        <nav className="app-nav">
          {TABS.map(([id, label]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-main">
        {error && (
          <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
            <strong>Could not reach the API.</strong>
            <p className="muted small">{error} — is the backend running on port 8000?</p>
          </div>
        )}
        {!data && !error && <p className="muted">Loading…</p>}
        {data && tab === 'overview' && <Overview data={data} refresh={refresh} goTo={setTab} />}
        {data && tab === 'workload' && <Workload data={data} refresh={refresh} />}
        {data && tab === 'calendar' && <CalendarPage data={data} refresh={refresh} />}
        {data && tab === 'projects' && <Projects data={data} refresh={refresh} />}
        {data && tab === 'defects' && <Defects data={data} refresh={refresh} />}
        {data && tab === 'team' && <Team data={data} refresh={refresh} />}
      </main>
    </>
  )
}
