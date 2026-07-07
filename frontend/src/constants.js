// Labels + colors for every category. Standard Teal & Slate palette; green /
// amber / red are reserved for on-track / at-risk / off-track status meaning.

export const EVENT_TYPE_META = {
  dev_window: { label: 'Dev window', color: '#0D9488' },
  testing: { label: 'Testing cycle', color: '#0EA5E9' },
  uat: { label: 'UAT', color: '#2563EB' },
  code_freeze: { label: 'Code freeze', color: '#475569' },
  deployment: { label: 'Deployment', color: '#D97706' },
  go_live: { label: 'Go-live', color: '#DC2626' },
  hypercare: { label: 'Hypercare', color: '#EA580C' },
  milestone: { label: 'Milestone', color: '#0F172A' },
  release: { label: 'Release cut', color: '#059669' },
  env_booking: { label: 'Env booking', color: '#0891B2' },
  demo: { label: 'Demo', color: '#7C3AED' },
  retro: { label: 'Retro', color: '#C026D3' },
  meeting: { label: 'Meeting', color: '#64748B' },
  on_call: { label: 'On-call', color: '#4F46E5' },
  other: { label: 'Other', color: '#94A3B8' },
}

export const ABSENCE_TYPE_META = {
  pto: { label: 'PTO', color: '#EA580C' },
  sick: { label: 'Sick', color: '#DC2626' },
  early_logoff: { label: 'Early log-off', color: '#EAB308' },
  wfh: { label: 'WFH', color: '#0EA5E9' },
  training: { label: 'Training', color: '#2563EB' },
  public_holiday: { label: 'Public holiday', color: '#64748B' },
  other: { label: 'Other', color: '#94A3B8' },
}

export const BIRTHDAY_COLOR = '#DB2777'

export const TASK_STATUS_META = {
  to_do: { label: 'To do', color: '#64748B', rank: 0 },
  in_progress: { label: 'In progress', color: '#0EA5E9', rank: 1 },
  blocked: { label: 'Blocked', color: '#DC2626', rank: 2 },
  done: { label: 'Done', color: '#16A34A', rank: 3 },
}

export const PRIORITY_META = {
  high: { label: 'High', color: '#DC2626', rank: 0 },
  medium: { label: 'Medium', color: '#D97706', rank: 1 },
  low: { label: 'Low', color: '#64748B', rank: 2 },
}

export const SEVERITY_META = {
  critical: { label: 'Critical', color: '#DC2626', rank: 0 },
  high: { label: 'High', color: '#EA580C', rank: 1 },
  medium: { label: 'Medium', color: '#D97706', rank: 2 },
  low: { label: 'Low', color: '#64748B', rank: 3 },
}

export const DEFECT_STATUS_META = {
  open: { label: 'Open', color: '#DC2626' },
  in_progress: { label: 'In progress', color: '#0EA5E9' },
  blocked: { label: 'Blocked', color: '#D97706' },
  resolved: { label: 'Resolved', color: '#16A34A' },
  closed: { label: 'Closed', color: '#64748B' },
}

export const HEALTH_META = {
  green: { label: 'On track', color: '#16A34A' },
  amber: { label: 'At risk', color: '#D97706' },
  red: { label: 'Off track', color: '#DC2626' },
}

export const PROJECT_STATUS_META = {
  planning: { label: 'Planning', color: '#0EA5E9' },
  ongoing: { label: 'Ongoing', color: '#0D9488' },
  on_hold: { label: 'On hold', color: '#D97706' },
  completed: { label: 'Completed', color: '#64748B' },
}

// ---- date helpers (all dates are 'YYYY-MM-DD' strings) -------------------- //

/** Pick readable text (dark or white) for a given background hex — so light
 *  colors like the early-log-off yellow stay legible on badges/pills. */
export function textOn(bg) {
  if (!bg || bg[0] !== '#') return '#fff'
  const hex = bg.slice(1)
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.62 ? '#0F172A' : '#fff'
}

export const todayISO = () => {
  const d = new Date() // local date, not UTC — toISOString would shift near midnight
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDaysISO(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`) // noon UTC — immune to DST/offset day-shifts
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function fmtDayMonth(iso) {
  if (!iso) return '—'
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** True when the (inclusive) range covers the given day. */
export function covers(startISO, endISO, dayISO) {
  return startISO <= dayISO && dayISO <= (endISO || startISO)
}

/** Days from today until iso (negative = past). */
export function daysUntil(iso) {
  const ms = new Date(`${iso}T00:00:00`) - new Date(`${todayISO()}T00:00:00`)
  return Math.round(ms / 86_400_000)
}

/** Short relative time for chat, e.g. "just now", "5m ago", "3h ago", "2d ago". */
export function relativeTime(iso) {
  const then = new Date(iso).getTime()
  const secs = Math.round((Date.now() - then) / 1000)
  if (secs < 45) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** Full date+time for tooltips. */
export function fmtDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}
