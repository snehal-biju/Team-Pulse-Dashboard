import { useState } from 'react'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { MemberForm, AbsenceForm } from '../components/EntityForm'
import { ABSENCE_TYPE_META, addDaysISO, covers, fmtDayMonth, todayISO } from '../constants'

export default function Team({ data, refresh }) {
  const { members, absences } = data
  const [modal, setModal] = useState(null) // {kind:'member'|'absence', initial}
  const done = () => { setModal(null); refresh() }

  const today = todayISO()
  const days = Array.from({ length: 14 }, (_, i) => addDaysISO(today, i))

  return (
    <>
      <div className="page-head">
        <h1>Team</h1>
        <div className="row">
          <button className="btn secondary" onClick={() => setModal({ kind: 'absence', initial: null })}>+ Absence</button>
          <button className="btn" onClick={() => setModal({ kind: 'member', initial: null })}>+ Member</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Availability — next 14 days</h2>
        <div className="week-strip">
          <span />
          {days.map((d) => {
            const dt = new Date(`${d}T00:00:00`)
            return (
              <span key={d} className="ws-head">
                {dt.toLocaleDateString(undefined, { weekday: 'narrow' })}<br />{dt.getDate()}
              </span>
            )
          })}
          {members.map((m) => (
            <MemberStrip key={m.id} member={m} days={days} absences={absences}
              onClickAbsence={(a) => setModal({ kind: 'absence', initial: a })} />
          ))}
        </div>
        <div className="row small muted" style={{ marginTop: 10, flexWrap: 'wrap' }}>
          {Object.entries(ABSENCE_TYPE_META).map(([t, meta]) => (
            <span key={t} className="row" style={{ gap: 4 }}>
              <span className="dot" style={{ background: meta.color }} />{meta.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid cols-3">
        {members.map((m) => {
          const upcoming = absences
            .filter((a) => a.member_id === m.id && (a.end_date || a.start_date) >= today)
            .sort((a, b) => a.start_date.localeCompare(b.start_date))
            .slice(0, 4)
          return (
            <div className="card" key={m.id}>
              <div className="spread">
                <span className="row">
                  <span className="dot" style={{ background: m.color, width: 14, height: 14 }} />
                  <strong>{m.name}</strong>
                </span>
                <button className="btn small secondary" onClick={() => setModal({ kind: 'member', initial: m })}>
                  Edit
                </button>
              </div>
              <p className="muted small" style={{ margin: '4px 0 10px' }}>
                {m.role || 'Team member'}
                {m.birthday && <> · 🎂 {fmtDayMonth(m.birthday)}</>}
                {m.joined && <> · joined {fmtDayMonth(m.joined)} {m.joined.slice(0, 4)}</>}
              </p>
              {upcoming.length === 0
                ? <p className="muted small">No upcoming absences.</p>
                : upcoming.map((a) => {
                  const meta = ABSENCE_TYPE_META[a.type] || ABSENCE_TYPE_META.other
                  return (
                    <div key={a.id} className="spread small" style={{ marginBottom: 4 }}>
                      <span>
                        {fmtDayMonth(a.start_date)}
                        {a.end_date && a.end_date !== a.start_date && ` – ${fmtDayMonth(a.end_date)}`}
                      </span>
                      <Badge color={meta.color}>{meta.label}{a.half_day ? ' ½' : ''}</Badge>
                    </div>
                  )
                })}
            </div>
          )
        })}
      </div>

      {modal?.kind === 'member' && (
        <Modal title={modal.initial?.id ? 'Edit member' : 'New member'} onClose={() => setModal(null)}>
          <MemberForm initial={modal.initial} onDone={done} />
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

function MemberStrip({ member, days, absences, onClickAbsence }) {
  const mine = absences.filter((a) => a.member_id === member.id)
  return (
    <>
      <span className="ws-name" title={member.name}>{member.name}</span>
      {days.map((d) => {
        const hit = mine.find((a) => covers(a.start_date, a.end_date, d))
        const dow = new Date(`${d}T00:00:00`).getDay()
        const weekend = dow === 0 || dow === 6
        const meta = hit ? (ABSENCE_TYPE_META[hit.type] || ABSENCE_TYPE_META.other) : null
        return (
          <span
            key={d}
            className={`ws-cell${weekend ? ' weekend' : ''}`}
            style={meta ? { background: meta.color, cursor: 'pointer' } : undefined}
            title={meta ? `${member.name}: ${meta.label}` : undefined}
            onClick={hit ? () => onClickAbsence(hit) : undefined}
          />
        )
      })}
    </>
  )
}
