import { textOn } from '../constants'

/** Colored pill badge with auto-contrasting text. */
export default function Badge({ color, children, style }) {
  return (
    <span className="badge" style={{ background: color, color: textOn(color), ...style }}>
      {children}
    </span>
  )
}
