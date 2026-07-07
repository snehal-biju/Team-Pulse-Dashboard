import { useMemo } from 'react'
import Chat from '../components/Chat'
import Badge from '../components/Badge'
import {
  EVENT_TYPE_META, ABSENCE_TYPE_META, SEVERITY_META, DEFECT_STATUS_META,
  HEALTH_META, PROJECT_STATUS_META, covers, daysUntil, fmtDayMonth, fmtDate, todayISO,
} from '../constants'

export default function Overview({ data, refresh, goTo }) {
  const { members, projects, events, absences, defects, tasks = [] } = data
  const today = todayISO()
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members])
  const projectById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])

  const activeByMember = useMemo(() => {
    const counts = {}
    for (const t of tasks) {
      if (t.status !== 'done' && t.assignee_id) counts[t.assignee_id] = (counts[t.assignee_id] || 0) + 1
    }
    return counts
  }, [tasks])
  const totalActive = Object.values(activeByMember).reduce((a, b) => a + b, 0)

  const outToday = absences.filter((a) => covers(a.start_date, a.end_date, today))

  const birthdaysSoon = members
    .filter((m) => m.birthday)
    .map((m) => {
      const [, mm, dd] = m.birthday.split('-')
      const year = new Date().getFullYear()
      let next = `${year}-${mm}-${dd}`
      if (daysUntil(next) < 0) next = `${year + 1}-${mm}-${dd}`
      return { ...m, next, inDays: daysUntil(next) }
    })
    .filter((m) => m.inDays <= 30)
    .sort((a, b) => a.inDays - b.inDays)

  const activeToday = events.filter((e) => covers(e.start_date, e.end_date, today))

  const upcoming = events
    .filter((e) => daysUntil(e.start_date) > 0 && daysUntil(e.start_date) <= 14)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 8)

  const hotDefects = defects
    .filter((d) => !['resolved', 'closed'].includes(d.status))
    .sort((a, b) =>
      (SEVERITY_META[a.severity].rank - SEVERITY_META[b.severity].rank) ||
      String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')))
    .slice(0, 8)

  const activeProjects = projects.filter((p) => p.status !== 'completed')

  return (
    <>
      <div className="page-head"><h1>Overview</h1><span className="muted small">{fmtDate(today)}</span></div>

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <div className="card">
          <h2>Out today <span className="count">{outToday.length}</span></h2>
          {outToday.length === 0 && <p className="muted small">Everyone is in 🎉</p>}
          {outToday.map((a) => {
            const meta = ABSENCE_TYPE_META[a.type] || ABSENCE_TYPE_META.other
            return (
              <div key={a.id} className="spread" style={{ marginBottom: 6 }}>
                <span>{memberById[a.member_id]?.name || '?'}</span>
                <Badge color={meta.color}>{meta.label}{a.half_day ? ' ½' : ''}</Badge>
              </div>
            )
          })}
        </div>

        <div className="card">
          <h2>Birthdays — next 30 days <span className="count">{birthdaysSoon.length}</span></h2>
          {birthdaysSoon.length === 0 && <p className="muted small">None coming up.</p>}
          {birthdaysSoon.map((m) => (
            <div key={m.id} className="spread" style={{ marginBottom: 6 }}>
              <span>🎂 {m.name}</span>
              <span className="muted small">
                {fmtDayMonth(m.next)}{m.inDays === 0 ? ' — today!' : ` (in ${m.inDays}d)`}
              </span>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Happening today <span className="count">{activeToday.length}</span></h2>
          {activeToday.length === 0 && <p className="muted small">No active windows today.</p>}
          {activeToday.map((e) => {
            const meta = EVENT_TYPE_META[e.type] || EVENT_TYPE_META.other
            return (
              <div key={e.id} className="spread" style={{ marginBottom: 6 }}>
                <span className="small">{e.title}</span>
                <span className="badge" style={{ background: meta.color }}>{meta.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="spread">
          <h2>Team workload <span className="count">{totalActive} active tasks</span></h2>
          <button className="btn small secondary" onClick={() => goTo('workload')}>Open board</button>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {members.map((m) => (
            <span key={m.id} className="chip" style={{ cursor: 'default' }}>
              <span className="dot" style={{ background: m.color }} /> {m.name}
              <strong style={{ marginLeft: 4 }}>{activeByMember[m.id] || 0}</strong>
            </span>
          ))}
        </div>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="spread">
            <h2>Active projects <span className="count">{activeProjects.length}</span></h2>
            <button className="btn small secondary" onClick={() => goTo('projects')}>View all</button>
          </div>
          {activeProjects.map((p) => {
            const health = HEALTH_META[p.health]
            const status = PROJECT_STATUS_META[p.status]
            const open = defects.filter((d) => d.project_id === p.id && !['resolved', 'closed'].includes(d.status))
            const pct = progressPct(p)
            return (
              <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="spread">
                  <span className="row">
                    <span className="dot" style={{ background: health.color }} title={health.label} />
                    <strong>{p.name}</strong>
                  </span>
                  <span className="row small">
                    {open.length > 0 && (
                      <span className="badge" style={{ background: 'var(--danger)' }}>{open.length} open</span>
                    )}
                    <span className="badge" style={{ background: status.color }}>{status.label}</span>
                  </span>
                </div>
                <div className="row small muted" style={{ margin: '4px 0', flexWrap: 'wrap' }}>
                  <span>{fmtDayMonth(p.start_date)} → {fmtDayMonth(p.end_date)}</span>
                  {teamLabel(p, memberById) && <span>· {teamLabel(p, memberById)}</span>}
                  {pct != null && <span>· {pct}% elapsed</span>}
                </div>
                {pct != null && (
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                )}
              </div>
            )
          })}
        </div>

        <div className="card">
          <div className="spread">
            <h2>Critical &amp; open defects <span className="count">{hotDefects.length}</span></h2>
            <button className="btn small secondary" onClick={() => goTo('defects')}>View all</button>
          </div>
          {hotDefects.length === 0 && <p className="muted small">No open defects. 🎉</p>}
          {hotDefects.map((d) => {
            const sev = SEVERITY_META[d.severity]
            const overdue = d.due_date && daysUntil(d.due_date) < 0
            return (
              <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="spread">
                  <span className="small"><strong>{d.ticket_ref || `#${d.id}`}</strong> {d.title}</span>
                  <span className="badge" style={{ background: sev.color }}>{sev.label}</span>
                </div>
                <div className="small muted row">
                  <span>{d.project_id ? projectById[d.project_id]?.name : '—'}</span>
                  <span>· {memberById[d.assignee_id]?.name || 'Unassigned'}</span>
                  {d.due_date && (
                    <span className={overdue ? 'overdue' : ''}>
                      · due {fmtDayMonth(d.due_date)}{overdue ? ' (overdue)' : ''}
                    </span>
                  )}
                  <span className="badge" style={{ background: DEFECT_STATUS_META[d.status].color, marginLeft: 'auto' }}>
                    {DEFECT_STATUS_META[d.status].label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Coming up — next 14 days <span className="count">{upcoming.length}</span></h2>
        {upcoming.length === 0 && <p className="muted small">Nothing scheduled.</p>}
        <table className="data">
          <tbody>
            {upcoming.map((e) => {
              const meta = EVENT_TYPE_META[e.type] || EVENT_TYPE_META.other
              return (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDayMonth(e.start_date)}
                    {e.end_date && ` – ${fmtDayMonth(e.end_date)}`}</td>
                  <td><span className="badge" style={{ background: meta.color }}>{meta.label}</span></td>
                  <td>{e.title}</td>
                  <td className="muted">{e.project_id ? projectById[e.project_id]?.name : ''}</td>
                  <td className="muted">in {daysUntil(e.start_date)}d</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Chat members={members} />
    </>
  )
}

function progressPct(p) {
  if (!p.start_date || !p.end_date) return null
  const total = daysUntil(p.end_date) - daysUntil(p.start_date)
  if (total <= 0) return null
  const elapsed = -daysUntil(p.start_date)
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

function teamLabel(p, memberById) {
  const ids = [...(p.member_ids || [])]
  if (p.lead_id && !ids.includes(p.lead_id)) ids.unshift(p.lead_id)
  const names = ids.map((id) => memberById[id]?.name).filter(Boolean)
  if (!names.length) return ''
  return `Team: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`
}
