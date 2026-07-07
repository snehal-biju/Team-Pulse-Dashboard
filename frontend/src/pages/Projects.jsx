import { useMemo, useState } from 'react'
import Modal from '../components/Modal'
import { ProjectForm, EventForm } from '../components/EntityForm'
import {
  EVENT_TYPE_META, HEALTH_META, PROJECT_STATUS_META, fmtDate, todayISO, daysUntil,
} from '../constants'

export default function Projects({ data, refresh }) {
  const { projects, events, members, defects } = data
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members])
  const [modal, setModal] = useState(null) // {kind:'project'|'event', initial}
  const done = () => { setModal(null); refresh() }

  return (
    <>
      <div className="page-head">
        <h1>Projects</h1>
        <button className="btn" onClick={() => setModal({ kind: 'project', initial: null })}>+ Project</button>
      </div>

      {projects.map((p) => {
        const pEvents = events
          .filter((e) => e.project_id === p.id)
          .sort((a, b) => a.start_date.localeCompare(b.start_date))
        const open = defects.filter((d) => d.project_id === p.id && !['resolved', 'closed'].includes(d.status))
        const health = HEALTH_META[p.health]
        const status = PROJECT_STATUS_META[p.status]
        const resIds = [...(p.member_ids || [])]
        if (p.lead_id && !resIds.includes(p.lead_id)) resIds.unshift(p.lead_id)
        const resources = resIds.map((id) => memberById[id]).filter(Boolean)
        return (
          <div className="card" key={p.id} style={{ marginBottom: 16 }}>
            <div className="spread">
              <span className="row">
                <span className="dot" style={{ background: health.color }} title={health.label} />
                <strong style={{ fontSize: '1.05rem' }}>{p.name}</strong>
                <span className="badge" style={{ background: status.color }}>{status.label}</span>
                <span className="muted small">priority: {p.priority}</span>
              </span>
              <span className="row">
                <button className="btn small secondary"
                  onClick={() => setModal({ kind: 'event', initial: { project_id: p.id } })}>+ Event</button>
                <button className="btn small secondary"
                  onClick={() => setModal({ kind: 'project', initial: p })}>Edit</button>
              </span>
            </div>
            <p className="muted small" style={{ margin: '6px 0' }}>
              {p.description || 'No description.'}
              {' · '}{fmtDate(p.start_date)} → {fmtDate(p.end_date)}
              {open.length > 0 && <> · <span className="overdue">{open.length} open defect{open.length > 1 ? 's' : ''}</span></>}
            </p>
            <div className="row small" style={{ gap: 6, flexWrap: 'wrap', margin: '0 0 8px' }}>
              <span className="muted">Team:</span>
              {resources.length === 0 && <span className="muted">— none assigned —</span>}
              {resources.map((m) => (
                <span key={m.id} className="chip" style={{ cursor: 'default' }}>
                  <span className="dot" style={{ background: m.color }} />
                  {m.name}{m.id === p.lead_id ? ' ★' : ''}
                </span>
              ))}
            </div>
            {pEvents.length > 0
              ? <MiniGantt events={pEvents} onClickEvent={(e) => setModal({ kind: 'event', initial: e })} />
              : <p className="muted small">No timeline events yet — add dev windows, test cycles, deployments.</p>}
          </div>
        )
      })}

      {modal?.kind === 'project' && (
        <Modal title={modal.initial?.id ? 'Edit project' : 'New project'} onClose={() => setModal(null)}>
          <ProjectForm initial={modal.initial} members={members} onDone={done} />
        </Modal>
      )}
      {modal?.kind === 'event' && (
        <Modal title={modal.initial?.id ? 'Edit event' : 'New event'} onClose={() => setModal(null)}>
          <EventForm initial={modal.initial} projects={projects} onDone={done} />
        </Modal>
      )}
    </>
  )
}

function MiniGantt({ events, onClickEvent }) {
  // horizontal bar per event across the project's full date span
  const min = events[0].start_date
  const max = events.reduce((m, e) => {
    const end = e.end_date || e.start_date
    return end > m ? end : m
  }, min)
  const span = Math.max(1, daysUntil(max) - daysUntil(min))
  const pos = (iso) => ((daysUntil(iso) - daysUntil(min)) / span) * 100
  const today = todayISO()
  const todayPct = pos(today)

  return (
    <div className="gantt">
      {events.map((e) => {
        const meta = EVENT_TYPE_META[e.type] || EVENT_TYPE_META.other
        const left = pos(e.start_date)
        const width = Math.max(1.5, pos(e.end_date || e.start_date) - left + 100 / span)
        return (
          <FragmentRow key={e.id} e={e} meta={meta} left={left} width={width}
            todayPct={todayPct} showToday={todayPct >= 0 && todayPct <= 100}
            onClick={() => onClickEvent(e)} />
        )
      })}
    </div>
  )
}

function FragmentRow({ e, meta, left, width, todayPct, showToday, onClick }) {
  return (
    <>
      <div className="glabel" title={e.title}>
        <span className="dot" style={{ background: meta.color, marginRight: 6 }} />
        {e.title}{e.object_name ? ` · ${e.object_name}` : ''}
      </div>
      <div className="gtrack" onClick={onClick} style={{ cursor: 'pointer' }}
        title={`${e.title}: ${fmtDate(e.start_date)} → ${fmtDate(e.end_date || e.start_date)}`}>
        <div className="gbar" style={{ left: `${left}%`, width: `${width}%`, background: meta.color }} />
        {showToday && <div className="gtoday" style={{ left: `${todayPct}%` }} />}
      </div>
    </>
  )
}
