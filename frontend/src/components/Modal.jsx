export default function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="spread">
          <h3>{title}</h3>
          <button className="btn small secondary" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
