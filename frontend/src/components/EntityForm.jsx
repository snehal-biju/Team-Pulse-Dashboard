import { useState } from 'react'
import { api } from '../api'
import { Field, Select } from './Field'
import {
  EVENT_TYPE_META, ABSENCE_TYPE_META, SEVERITY_META, DEFECT_STATUS_META,
  HEALTH_META, PROJECT_STATUS_META, TASK_STATUS_META, PRIORITY_META, todayISO,
} from '../constants'

/**
 * One form component per entity, driven by a field spec. `initial` with an id
 * means edit (PUT + delete button); otherwise create (POST).
 */
function useEntityForm({ resource, initial, defaults, onDone }) {
  const [form, setForm] = useState({ ...defaults, ...initial })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    // empty strings -> null for optional ids/dates
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === '' && k !== 'notes' && k !== 'description' ? nullable(k, v) : v]),
    )
    try {
      if (initial?.id) await api.update(resource, initial.id, payload)
      else await api.create(resource, payload)
      onDone()
    } catch (err) {
      setError(String(err.message || err))
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('Delete this entry?')) return
    setBusy(true)
    try {
      await api.remove(resource, initial.id)
      onDone()
    } catch (err) {
      setError(String(err.message || err))
      setBusy(false)
    }
  }

  return { form, set, setField, submit, remove, busy, error, isEdit: Boolean(initial?.id) }
}

function MemberMultiSelect({ label, members, selected, onToggle }) {
  return (
    <label className="field full">
      {label}
      <div className="member-multi">
        {members.map((m) => {
          const on = selected.includes(m.id)
          return (
            <span key={m.id} className={`chip${on ? ' sel' : ' off'}`} onClick={() => onToggle(m.id)}>
              <span className="dot" style={{ background: m.color }} /> {m.name}
            </span>
          )
        })}
      </div>
    </label>
  )
}

function nullable(key, value) {
  // ids, dates and numeric estimate must be null (not '') for the API
  if (key.endsWith('_id') || key.endsWith('_date') || key.endsWith('_at') ||
      key === 'birthday' || key === 'joined' || key === 'estimate') return null
  return value
}

function Actions({ f }) {
  return (
    <>
      {f.error && <p className="small" style={{ color: 'var(--danger)' }}>{f.error}</p>}
      <div className="spread" style={{ marginTop: 8 }}>
        <button className="btn" type="submit" disabled={f.busy}>{f.isEdit ? 'Save' : 'Add'}</button>
        {f.isEdit && (
          <button className="btn danger" type="button" disabled={f.busy} onClick={f.remove}>Delete</button>
        )}
      </div>
    </>
  )
}

const metaOptions = (meta) => Object.entries(meta).map(([v, m]) => [v, m.label])
const idOptions = (items, blank) => [[null, blank], ...items.map((i) => [i.id, i.name])]

export function EventForm({ initial, projects, onDone }) {
  const f = useEntityForm({
    resource: 'events',
    initial,
    defaults: {
      title: '', type: 'milestone', project_id: null, object_name: '',
      start_date: todayISO(), end_date: null, environment: '', notes: '',
    },
    onDone,
  })
  return (
    <form onSubmit={f.submit} className="form-grid">
      <Field label="Title" value={f.form.title} onChange={f.set('title')} required full />
      <Select label="Type" value={f.form.type} onChange={f.set('type')} options={metaOptions(EVENT_TYPE_META)} />
      <Select label="Project" value={f.form.project_id ?? ''} onChange={f.set('project_id')}
        options={idOptions(projects, '— none / team-wide —')} />
      <Field label="Start date" type="date" value={f.form.start_date ?? ''} onChange={f.set('start_date')} required />
      <Field label="End date (optional)" type="date" value={f.form.end_date ?? ''} onChange={f.set('end_date')} />
      <Field label="Object / feature (optional)" value={f.form.object_name} onChange={f.set('object_name')}
        placeholder="e.g. RICEF-101 Invoice" />
      <Field label="Environment (optional)" value={f.form.environment} onChange={f.set('environment')}
        placeholder="DEV / QA / UAT / PROD" />
      <Field label="Notes" type="textarea" value={f.form.notes} onChange={f.set('notes')} full />
      <div className="full"><Actions f={f} /></div>
    </form>
  )
}

export function AbsenceForm({ initial, members, onDone }) {
  const f = useEntityForm({
    resource: 'absences',
    initial,
    defaults: {
      member_id: members[0]?.id ?? null, type: 'pto',
      start_date: todayISO(), end_date: null, half_day: false, notes: '',
    },
    onDone,
  })
  return (
    <form onSubmit={f.submit} className="form-grid">
      <Select label="Team member" value={f.form.member_id ?? ''} onChange={f.set('member_id')}
        options={members.map((m) => [m.id, m.name])} required />
      <Select label="Type" value={f.form.type} onChange={f.set('type')} options={metaOptions(ABSENCE_TYPE_META)} />
      <Field label="Start date" type="date" value={f.form.start_date ?? ''} onChange={f.set('start_date')} required />
      <Field label="End date (optional)" type="date" value={f.form.end_date ?? ''} onChange={f.set('end_date')} />
      <label className="field">
        Half day / partial
        <input type="checkbox" checked={f.form.half_day} onChange={f.set('half_day')}
          style={{ width: 'auto', display: 'inline-block', marginLeft: 8 }} />
      </label>
      <Field label="Notes" type="textarea" value={f.form.notes} onChange={f.set('notes')} full />
      <div className="full"><Actions f={f} /></div>
    </form>
  )
}

export function DefectForm({ initial, projects, members, onDone }) {
  const f = useEntityForm({
    resource: 'defects',
    initial,
    defaults: {
      title: '', ticket_ref: '', project_id: null, severity: 'medium', status: 'open',
      assignee_id: null, raised_date: todayISO(), due_date: null, notes: '',
    },
    onDone,
  })
  return (
    <form onSubmit={f.submit} className="form-grid">
      <Field label="Title" value={f.form.title} onChange={f.set('title')} required full />
      <Field label="Ticket ref" value={f.form.ticket_ref} onChange={f.set('ticket_ref')} placeholder="INC-1234" />
      <Select label="Project" value={f.form.project_id ?? ''} onChange={f.set('project_id')}
        options={idOptions(projects, '— none —')} />
      <Select label="Severity" value={f.form.severity} onChange={f.set('severity')} options={metaOptions(SEVERITY_META)} />
      <Select label="Status" value={f.form.status} onChange={f.set('status')} options={metaOptions(DEFECT_STATUS_META)} />
      <Select label="Assignee" value={f.form.assignee_id ?? ''} onChange={f.set('assignee_id')}
        options={idOptions(members, '— unassigned —')} />
      <Field label="Raised" type="date" value={f.form.raised_date ?? ''} onChange={f.set('raised_date')} />
      <Field label="Due" type="date" value={f.form.due_date ?? ''} onChange={f.set('due_date')} />
      <Field label="Notes" type="textarea" value={f.form.notes} onChange={f.set('notes')} full />
      <div className="full"><Actions f={f} /></div>
    </form>
  )
}

export function ProjectForm({ initial, members, onDone }) {
  const f = useEntityForm({
    resource: 'projects',
    initial,
    defaults: {
      name: '', description: '', status: 'ongoing', health: 'green', priority: 'medium',
      start_date: null, end_date: null, lead_id: null, member_ids: [], color: '#0D9488',
    },
    onDone,
  })
  const selected = f.form.member_ids || []
  const toggle = (id) =>
    f.setField('member_ids', selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  return (
    <form onSubmit={f.submit} className="form-grid">
      <Field label="Name" value={f.form.name} onChange={f.set('name')} required full />
      <Field label="Description" type="textarea" value={f.form.description} onChange={f.set('description')} full />
      <Select label="Status" value={f.form.status} onChange={f.set('status')} options={metaOptions(PROJECT_STATUS_META)} />
      <Select label="Health" value={f.form.health} onChange={f.set('health')} options={metaOptions(HEALTH_META)} />
      <Select label="Priority" value={f.form.priority} onChange={f.set('priority')}
        options={[['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]} />
      <Select label="Lead" value={f.form.lead_id ?? ''} onChange={f.set('lead_id')}
        options={idOptions(members, '— none —')} />
      <MemberMultiSelect label="Resources (who works on this project)" members={members}
        selected={selected} onToggle={toggle} />
      <Field label="Start date" type="date" value={f.form.start_date ?? ''} onChange={f.set('start_date')} />
      <Field label="Target end" type="date" value={f.form.end_date ?? ''} onChange={f.set('end_date')} />
      <Field label="Calendar color" type="color" value={f.form.color} onChange={f.set('color')} />
      <div className="full"><Actions f={f} /></div>
    </form>
  )
}

export function TaskForm({ initial, projects, members, onDone }) {
  const f = useEntityForm({
    resource: 'tasks',
    initial,
    defaults: {
      title: '', description: '', assignee_id: members[0]?.id ?? null, project_id: null,
      status: 'to_do', priority: 'medium', estimate: '', start_date: null, due_date: null, completed_at: null,
    },
    onDone,
  })
  // stamp completion date when moved to done, clear it otherwise
  const onStatus = (e) => {
    f.set('status')(e)
    if (e.target.value === 'done' && !f.form.completed_at) f.setField('completed_at', todayISO())
    if (e.target.value !== 'done') f.setField('completed_at', null)
  }
  return (
    <form onSubmit={f.submit} className="form-grid">
      <Field label="Title" value={f.form.title} onChange={f.set('title')} required full />
      <Select label="Assign to" value={f.form.assignee_id ?? ''} onChange={f.set('assignee_id')}
        options={idOptions(members, '— unassigned —')} />
      <Select label="Project" value={f.form.project_id ?? ''} onChange={f.set('project_id')}
        options={idOptions(projects, '— none —')} />
      <Select label="Status" value={f.form.status} onChange={onStatus} options={metaOptions(TASK_STATUS_META)} />
      <Select label="Priority" value={f.form.priority} onChange={f.set('priority')} options={metaOptions(PRIORITY_META)} />
      <Field label="Estimate (days)" type="number" step="0.5" min="0" value={f.form.estimate ?? ''} onChange={f.set('estimate')} />
      <Field label="Start date" type="date" value={f.form.start_date ?? ''} onChange={f.set('start_date')} />
      <Field label="Due date" type="date" value={f.form.due_date ?? ''} onChange={f.set('due_date')} />
      <Field label="Description" type="textarea" value={f.form.description} onChange={f.set('description')} full />
      <div className="full"><Actions f={f} /></div>
    </form>
  )
}

export function MemberForm({ initial, onDone }) {
  const f = useEntityForm({
    resource: 'members',
    initial,
    defaults: { name: '', role: '', email: '', birthday: null, joined: null, color: '#0EA5E9' },
    onDone,
  })
  return (
    <form onSubmit={f.submit} className="form-grid">
      <Field label="Name" value={f.form.name} onChange={f.set('name')} required />
      <Field label="Role" value={f.form.role} onChange={f.set('role')} placeholder="Developer" />
      <Field label="Email" type="email" value={f.form.email} onChange={f.set('email')} full />
      <Field label="Birthday" type="date" value={f.form.birthday ?? ''} onChange={f.set('birthday')} />
      <Field label="Joined" type="date" value={f.form.joined ?? ''} onChange={f.set('joined')} />
      <Field label="Color" type="color" value={f.form.color} onChange={f.set('color')} />
      <div className="full"><Actions f={f} /></div>
    </form>
  )
}
