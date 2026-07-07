import { useMemo, useState } from 'react'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { DefectForm } from '../components/EntityForm'
import { api } from '../api'
import { SEVERITY_META, DEFECT_STATUS_META, fmtDayMonth, daysUntil } from '../constants'

export default function Defects({ data, refresh }) {
  const { defects, projects, members } = data
  const projectById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])

  const [statusFilter, setStatusFilter] = useState('active') // active | all | <status>
  const [severityFilter, setSeverityFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [modal, setModal] = useState(null)
  const done = () => { setModal(null); refresh() }

  const visible = defects
    .filter((d) => {
      if (statusFilter === 'active') return !['resolved', 'closed'].includes(d.status)
      if (statusFilter !== 'all') return d.status === statusFilter
      return true
    })
    .filter((d) => !severityFilter || d.severity === severityFilter)
    .filter((d) => {
      if (assigneeFilter === 'none') return !d.assignee_id
      if (assigneeFilter) return String(d.assignee_id) === assigneeFilter
      return true
    })
    .sort((a, b) =>
      (SEVERITY_META[a.severity].rank - SEVERITY_META[b.severity].rank) ||
      String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')))

  // quick inline edits (no modal) — assign/reassign and move status
  const reassign = async (d, assigneeId) => {
    await api.update('defects', d.id, { ...d, assignee_id: assigneeId })
    refresh()
  }
  const changeStatus = async (d, status) => {
    await api.update('defects', d.id, { ...d, status })
    refresh()
  }

  const selStyle = { padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', font: 'inherit' }

  return (
    <>
      <div className="page-head">
        <h1>Defects &amp; critical items</h1>
        <div className="row">
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} style={selStyle}>
            <option value="">All assignees</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            <option value="none">Unassigned</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selStyle}>
            <option value="active">Open (not resolved/closed)</option>
            <option value="all">All statuses</option>
            {Object.entries(DEFECT_STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </select>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={selStyle}>
            <option value="">All severities</option>
            {Object.entries(SEVERITY_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </select>
          <button className="btn" onClick={() => setModal({ initial: null })}>+ Defect</button>
        </div>
      </div>

      <p className="muted small" style={{ margin: '0 0 10px' }}>
        Assign or reassign a defect to a resource, or move its status, right from the table — no need to open it.
      </p>

      <div className="card">
        <table className="data">
          <thead>
            <tr>
              <th>Ref</th><th>Title</th><th>Project</th><th>Severity</th>
              <th>Status</th><th>Assigned to</th><th>Raised</th><th>Due</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={8} className="muted">Nothing matches the filters.</td></tr>
            )}
            {visible.map((d) => {
              const sev = SEVERITY_META[d.severity]
              const st = DEFECT_STATUS_META[d.status]
              const overdue = d.due_date && daysUntil(d.due_date) < 0 && !['resolved', 'closed'].includes(d.status)
              return (
                <tr key={d.id} className="clickable" onClick={() => setModal({ initial: d })}>
                  <td>{d.ticket_ref || `#${d.id}`}</td>
                  <td>{d.title}</td>
                  <td className="muted">{d.project_id ? projectById[d.project_id]?.name : '—'}</td>
                  <td><Badge color={sev.color}>{sev.label}</Badge></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <span className="row" style={{ gap: 5 }}>
                      <span className="dot" style={{ background: st.color }} />
                      <select className="inline-select" value={d.status} onChange={(e) => changeStatus(d, e.target.value)}>
                        {Object.entries(DEFECT_STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                      </select>
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select className="inline-select" value={d.assignee_id ?? ''}
                      onChange={(e) => reassign(d, e.target.value ? Number(e.target.value) : null)}>
                      <option value="">Unassigned</option>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </td>
                  <td className="muted">{fmtDayMonth(d.raised_date)}</td>
                  <td className={overdue ? 'overdue' : ''}>
                    {fmtDayMonth(d.due_date)}{overdue ? ' ⚠' : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.initial?.id ? 'Edit defect' : 'New defect'} onClose={() => setModal(null)}>
          <DefectForm initial={modal.initial} projects={projects} members={members} onDone={done} />
        </Modal>
      )}
    </>
  )
}
