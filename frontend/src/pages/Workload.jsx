import { useMemo, useState } from 'react'
import Modal from '../components/Modal'
import { TaskForm } from '../components/EntityForm'
import { api } from '../api'
import {
  TASK_STATUS_META, PRIORITY_META, fmtDayMonth, daysUntil, todayISO,
} from '../constants'

const ACTIVE = ['to_do', 'in_progress', 'blocked']
const STATUS_OPTS = Object.entries(TASK_STATUS_META)

const byPrioThenDue = (a, b) =>
  (PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank) ||
  String(a.due_date || '9999').localeCompare(String(b.due_date || '9999'))

export default function Workload({ data, refresh }) {
  const { tasks = [], members, projects } = data
  const projectById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])

  const [projectFilter, setProjectFilter] = useState('')
  const [modal, setModal] = useState(null) // { initial } | null
  const done = () => { setModal(null); refresh() }

  const scoped = tasks.filter((t) => !projectFilter || String(t.project_id) === projectFilter)

  const rows = members.map((m) => {
    const mine = scoped.filter((t) => t.assignee_id === m.id)
    const current = mine.filter((t) => ACTIVE.includes(t.status)).sort(byPrioThenDue)
    const completed = mine.filter((t) => t.status === 'done')
      .sort((a, b) => String(b.completed_at || '').localeCompare(String(a.completed_at || '')))
    return { member: m, current, completed, effort: current.reduce((s, t) => s + (t.estimate || 0), 0) }
  })
  const unassigned = scoped.filter((t) => !t.assignee_id && ACTIVE.includes(t.status)).sort(byPrioThenDue)
  const maxActive = Math.max(1, ...rows.map((r) => r.current.length), unassigned.length)

  const reassign = async (task, assigneeId) => {
    await api.update('tasks', task.id, { ...task, assignee_id: assigneeId })
    refresh()
  }
  const changeStatus = async (task, status) => {
    await api.update('tasks', task.id, {
      ...task, status, completed_at: status === 'done' ? (task.completed_at || todayISO()) : null,
    })
    refresh()
  }

  const selStyle = { padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', font: 'inherit' }

  return (
    <>
      <div className="page-head">
        <h1>Workload</h1>
        <div className="row">
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={selStyle}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn" onClick={() => setModal({ initial: null })}>+ Assign task</button>
        </div>
      </div>

      {/* comparative load — who's carrying the most active work */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Active tasks per resource
          <span className="count">{scoped.filter((t) => ACTIVE.includes(t.status)).length} active</span>
        </h2>
        <div className="load-grid">
          {unassigned.length > 0 && (
            <div className="load-row">
              <span className="load-name row muted"><span className="dot" style={{ background: '#B0B0B0' }} /> Unassigned</span>
              <div className="load-bar-track">
                <div className="load-bar-fill" style={{ width: `${(unassigned.length / maxActive) * 100}%`, background: '#B0B0B0' }} />
              </div>
              <span className="load-stats small muted"><strong>{unassigned.length}</strong> active</span>
            </div>
          )}
          {rows.map((r) => (
            <div key={r.member.id} className="load-row">
              <span className="load-name row">
                <span className="dot" style={{ background: r.member.color }} /> {r.member.name}
              </span>
              <div className="load-bar-track" title={`${r.current.length} active`}>
                <div className="load-bar-fill"
                  style={{ width: `${(r.current.length / maxActive) * 100}%`, background: r.member.color }} />
              </div>
              <span className="load-stats small muted">
                <strong style={{ color: 'var(--text-primary)' }}>{r.current.length}</strong> active
                {r.effort > 0 && <> · {r.effort}d</>} · {r.completed.length} done
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* one card per resource: their current + completed work */}
      <div className="resource-grid">
        {unassigned.length > 0 && (
          <ResourceCard
            title="Unassigned" color="#B0B0B0"
            current={unassigned} completed={[]} effort={unassigned.reduce((s, t) => s + (t.estimate || 0), 0)}
            members={members} projectById={projectById}
            onStatus={changeStatus} onReassign={reassign} onEdit={(t) => setModal({ initial: t })}
            emptyText="Nothing unassigned."
          />
        )}
        {rows.map((r) => (
          <ResourceCard
            key={r.member.id}
            title={r.member.name} role={r.member.role} color={r.member.color}
            current={r.current} completed={r.completed} effort={r.effort}
            members={members} projectById={projectById}
            onStatus={changeStatus} onReassign={reassign} onEdit={(t) => setModal({ initial: t })}
          />
        ))}
      </div>

      {modal && (
        <Modal title={modal.initial?.id ? 'Edit task' : 'Assign a task'} onClose={() => setModal(null)}>
          <TaskForm initial={modal.initial} projects={projects} members={members} onDone={done} />
        </Modal>
      )}
    </>
  )
}

function ResourceCard({ title, role, color, current, completed, effort, members, projectById, onStatus, onReassign, onEdit, emptyText }) {
  return (
    <div className="card">
      <div className="spread">
        <span className="row">
          <span className="dot" style={{ background: color, width: 14, height: 14 }} />
          <strong>{title}</strong>
          {role && <span className="muted small">· {role}</span>}
        </span>
        <span className="small muted">
          <strong style={{ color: 'var(--text-primary)' }}>{current.length}</strong> active
          {effort > 0 && <> · {effort}d</>}
        </span>
      </div>

      <div className="wl-section-label">Current tasks</div>
      {current.length === 0
        ? <p className="muted small">{emptyText || 'No active tasks. 🎉'}</p>
        : current.map((t) => (
          <TaskRow key={t.id} task={t} members={members} projectById={projectById}
            onStatus={onStatus} onReassign={onReassign} onEdit={onEdit} />
        ))}

      {completed.length > 0 && (
        <details className="wl-completed">
          <summary>{completed.length} completed</summary>
          {completed.map((t) => (
            <div key={t.id} className="wl-done-row">
              <span>✓ {t.title}</span>
              <span className="muted small">{t.completed_at ? fmtDayMonth(t.completed_at) : ''}</span>
            </div>
          ))}
        </details>
      )}
    </div>
  )
}

function TaskRow({ task, members, projectById, onStatus, onReassign, onEdit }) {
  const prio = PRIORITY_META[task.priority]
  const overdue = task.due_date && daysUntil(task.due_date) < 0 && task.status !== 'done'
  return (
    <div className={`wl-task${task.status === 'blocked' ? ' blocked' : ''}`}>
      <div className="wl-task-main" onClick={() => onEdit(task)}>
        <span className="dot" style={{ background: prio.color }} title={`${prio.label} priority`} />
        <span className="wl-task-title">{task.title}</span>
        {task.project_id && <span className="muted small">· {projectById[task.project_id]?.name}</span>}
        {task.due_date && <span className={`small ${overdue ? 'overdue' : 'muted'}`}>· {fmtDayMonth(task.due_date)}{overdue ? ' ⚠' : ''}</span>}
      </div>
      <div className="wl-task-controls">
        <select value={task.status} title="Change status"
          onClick={(e) => e.stopPropagation()} onChange={(e) => onStatus(task, e.target.value)}>
          {STATUS_OPTS.map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
        <select value={task.assignee_id ?? ''} title="Reassign to"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onReassign(task, e.target.value ? Number(e.target.value) : null)}>
          <option value="">Unassigned</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
    </div>
  )
}
