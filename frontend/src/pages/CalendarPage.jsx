import { useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import Modal from '../components/Modal'
import { EventForm, AbsenceForm } from '../components/EntityForm'
import {
  EVENT_TYPE_META, ABSENCE_TYPE_META, BIRTHDAY_COLOR, addDaysISO, textOn,
} from '../constants'

/** FullCalendar end dates are exclusive; ours are inclusive. */
const fcEnd = (start, end) => addDaysISO(end || start, 1)

/** Compact one-line pill so busy days stay readable; full detail in the tooltip. */
function renderEventContent(arg) {
  const { tooltip } = arg.event.extendedProps
  return (
    <div className="fc-pill" title={tooltip || arg.event.title} style={{ color: textOn(arg.event.backgroundColor) }}>
      {arg.event.title}
    </div>
  )
}

export default function CalendarPage({ data, refresh }) {
  const { events, absences, members, projects } = data
  const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]))
  const memberById = useMemo(() => byId(members), [members])
  const projectById = useMemo(() => byId(projects), [projects])

  // ---- filters ---- //
  const [showTypes, setShowTypes] = useState(() => new Set(Object.keys(EVENT_TYPE_META)))
  const [showAbsences, setShowAbsences] = useState(true)
  const [showBirthdays, setShowBirthdays] = useState(true)
  const [projectFilter, setProjectFilter] = useState('')

  const toggleType = (t) =>
    setShowTypes((prev) => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })

  // ---- modal state ---- //
  const [modal, setModal] = useState(null) // {kind: 'event'|'absence', initial}

  const done = () => { setModal(null); refresh() }

  // ---- build calendar events ---- //
  const calendarEvents = useMemo(() => {
    const out = []

    for (const ev of events) {
      if (!showTypes.has(ev.type)) continue
      if (projectFilter && String(ev.project_id) !== projectFilter) continue
      const meta = EVENT_TYPE_META[ev.type] || EVENT_TYPE_META.other
      const project = ev.project_id ? projectById[ev.project_id] : null
      const tooltip = [
        project?.name, meta.label, ev.title,
        ev.object_name || null, ev.environment ? `(${ev.environment})` : null,
      ].filter(Boolean).join(' · ')
      out.push({
        id: `event-${ev.id}`,
        title: ev.title,
        start: ev.start_date,
        end: fcEnd(ev.start_date, ev.end_date),
        allDay: true,
        backgroundColor: meta.color,
        borderColor: meta.color,
        extendedProps: { kind: 'event', record: ev, tooltip, projectName: project?.name || '' },
      })
    }

    if (showAbsences && !projectFilter) {
      for (const ab of absences) {
        const meta = ABSENCE_TYPE_META[ab.type] || ABSENCE_TYPE_META.other
        const who = memberById[ab.member_id]?.name || '?'
        out.push({
          id: `absence-${ab.id}`,
          title: `${who} — ${meta.label}${ab.half_day ? ' (½)' : ''}`,
          start: ab.start_date,
          end: fcEnd(ab.start_date, ab.end_date),
          allDay: true,
          backgroundColor: meta.color,
          borderColor: meta.color,
          extendedProps: { kind: 'absence', record: ab },
        })
      }
    }

    if (showBirthdays && !projectFilter) {
      const year = new Date().getFullYear()
      for (const m of members) {
        if (!m.birthday) continue
        const [, mm, dd] = m.birthday.split('-')
        for (const y of [year - 1, year, year + 1]) {
          out.push({
            id: `bday-${m.id}-${y}`,
            title: `🎂 ${m.name}`,
            start: `${y}-${mm}-${dd}`,
            allDay: true,
            backgroundColor: BIRTHDAY_COLOR,
            borderColor: BIRTHDAY_COLOR,
            extendedProps: { kind: 'birthday' },
          })
        }
      }
    }

    return out
  }, [events, absences, members, projectById, memberById, showTypes, showAbsences, showBirthdays, projectFilter])

  const onEventClick = (info) => {
    const { kind, record } = info.event.extendedProps
    if (kind === 'event') setModal({ kind: 'event', initial: record })
    if (kind === 'absence') setModal({ kind: 'absence', initial: record })
    // birthdays are edited via the Team page
  }

  const onSelect = (sel) => {
    // drag across days -> prefill a new project event
    const endInclusive = addDaysISO(sel.endStr, -1)
    setModal({
      kind: 'event',
      initial: { start_date: sel.startStr, end_date: endInclusive !== sel.startStr ? endInclusive : null },
    })
  }

  return (
    <>
      <div className="page-head">
        <h1>Calendar</h1>
        <div className="row">
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', font: 'inherit' }}>
            <option value="">All projects + team</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name} only</option>)}
          </select>
          <button className="btn secondary" onClick={() => setModal({ kind: 'absence', initial: null })}>
            + Absence
          </button>
          <button className="btn" onClick={() => setModal({ kind: 'event', initial: null })}>
            + Event
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(EVENT_TYPE_META).map(([t, meta]) => (
            <span key={t} className={`chip${showTypes.has(t) ? '' : ' off'}`} onClick={() => toggleType(t)}>
              <span className="dot" style={{ background: meta.color }} /> {meta.label}
            </span>
          ))}
          <span className={`chip${showAbsences ? '' : ' off'}`} onClick={() => setShowAbsences(!showAbsences)}>
            <span className="dot" style={{ background: ABSENCE_TYPE_META.pto.color }} /> Absences
          </span>
          <span className={`chip${showBirthdays ? '' : ' off'}`} onClick={() => setShowBirthdays(!showBirthdays)}>
            <span className="dot" style={{ background: BIRTHDAY_COLOR }} /> Birthdays
          </span>
        </div>
      </div>

      <div className="card">
        <FullCalendar
          plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek,listMonth' }}
          events={calendarEvents}
          eventClick={onEventClick}
          eventContent={renderEventContent}
          selectable
          select={onSelect}
          firstDay={1}
          weekNumbers
          fixedWeekCount={false}
          dayMaxEvents={3}
          moreLinkClick="popover"
          moreLinkContent={(arg) => `+${arg.num} more`}
          height="auto"
        />
      </div>

      {modal?.kind === 'event' && (
        <Modal title={modal.initial?.id ? 'Edit event' : 'New event'} onClose={() => setModal(null)}>
          <EventForm initial={modal.initial} projects={projects} onDone={done} />
        </Modal>
      )}
      {modal?.kind === 'absence' && (
        <Modal title={modal.initial?.id ? 'Edit absence' : 'New absence'} onClose={() => setModal(null)}>
          <AbsenceForm initial={modal.initial} members={members} onDone={done} />
        </Modal>
      )}
    </>
  )
}
