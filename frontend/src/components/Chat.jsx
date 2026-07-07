import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import { relativeTime, fmtDateTime } from '../constants'

const POLL_MS = 8000
const STORE_KEY = 'chat_posting_as'

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Team chat card. No auth in this internal tool, so "posting as" is a member
 * picker persisted in localStorage. Type "@" to tag a teammate — messages that
 * mention you are highlighted.
 */
export default function Chat({ members }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [postingAs, setPostingAs] = useState(() => {
    const saved = Number(localStorage.getItem(STORE_KEY))
    return saved || null
  })
  const [mention, setMention] = useState(null) // { start, query, items, index } | null
  const [sending, setSending] = useState(false)

  const listRef = useRef(null)
  const taRef = useRef(null)
  const prevLen = useRef(0)

  // default identity = first member, once members load
  useEffect(() => {
    if (!postingAs && members.length) setPostingAs(members[0].id)
  }, [members, postingAs])

  const me = members.find((m) => m.id === postingAs) || null
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members])

  const load = () => api.list('messages').then(setMessages).catch(() => {})

  useEffect(() => {
    load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [])

  // auto-scroll to newest when messages grow and the user is near the bottom
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const grew = messages.length > prevLen.current
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (grew && nearBottom) el.scrollTop = el.scrollHeight
    prevLen.current = messages.length
  }, [messages])

  const chooseIdentity = (id) => {
    setPostingAs(id)
    localStorage.setItem(STORE_KEY, String(id))
  }

  // ---- mention autocomplete ---- //
  const onChange = (e) => {
    const value = e.target.value
    setText(value)
    const pos = e.target.selectionStart
    const before = value.slice(0, pos)
    const m = before.match(/@([\p{L}]*)$/u)
    if (m) {
      const query = m[1].toLowerCase()
      const items = members
        .filter((mem) => mem.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(query)) ||
          mem.name.toLowerCase().startsWith(query))
        .slice(0, 6)
      setMention(items.length ? { start: pos - m[0].length, query, items, index: 0 } : null)
    } else {
      setMention(null)
    }
  }

  const acceptMention = (member) => {
    const el = taRef.current
    const pos = el.selectionStart
    const before = text.slice(0, mention.start)
    const after = text.slice(pos)
    const insert = `@${member.name} `
    const next = before + insert + after
    setText(next)
    setMention(null)
    requestAnimationFrame(() => {
      const caret = (before + insert).length
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }

  const onKeyDown = (e) => {
    if (mention) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMention((s) => ({ ...s, index: (s.index + 1) % s.items.length }))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMention((s) => ({ ...s, index: (s.index - 1 + s.items.length) % s.items.length }))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        acceptMention(mention.items[mention.index])
        return
      }
      if (e.key === 'Escape') {
        setMention(null)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const send = async () => {
    const body = text.trim()
    if (!body || !postingAs || sending) return
    const mentions = members.filter((m) => body.includes(`@${m.name}`)).map((m) => m.id)
    setSending(true)
    try {
      await api.create('messages', { author_id: postingAs, body, mentions })
      setText('')
      setMention(null)
      await load()
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
      })
    } finally {
      setSending(false)
    }
  }

  const del = async (id) => {
    if (!window.confirm('Delete this message?')) return
    await api.remove('messages', id)
    load()
  }

  // regex that matches any @Member Name (longest first so full names win)
  const mentionRe = useMemo(() => {
    if (!members.length) return null
    const names = members.map((m) => m.name).sort((a, b) => b.length - a.length).map(escapeRe)
    return new RegExp(`@(${names.join('|')})`, 'g')
  }, [members])

  const renderBody = (body) => {
    if (!mentionRe) return body
    const parts = []
    let last = 0
    let m
    mentionRe.lastIndex = 0
    while ((m = mentionRe.exec(body)) !== null) {
      if (m.index > last) parts.push(body.slice(last, m.index))
      const isMe = me && m[1] === me.name
      parts.push(
        <span key={m.index} className={`mention${isMe ? ' me' : ''}`}>@{m[1]}</span>,
      )
      last = m.index + m[0].length
    }
    if (last < body.length) parts.push(body.slice(last))
    return parts
  }

  return (
    <div className="card chat-card">
      <div className="spread" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Team chat <span className="count">{messages.length}</span></h2>
        <label className="small muted row" style={{ gap: 6, marginBottom: 0 }}>
          You:
          <select value={postingAs ?? ''} onChange={(e) => chooseIdentity(Number(e.target.value))}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ccc', font: 'inherit' }}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
      </div>

      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && <p className="muted small">No messages yet — say hello 👋</p>}
        {messages.map((msg) => {
          const forMe = me && msg.mentions.includes(me.id)
          const author = msg.author_id ? memberById[msg.author_id] : null
          const color = author?.color || '#64748B'
          const mine = msg.author_id === postingAs
          return (
            <div key={msg.id} className={`chat-msg${forMe ? ' for-me' : ''}`}>
              <span className="chat-avatar" style={{ background: color }}>
                {initials(msg.author_name)}
              </span>
              <div className="chat-bubble">
                <div className="chat-meta">
                  <strong>{msg.author_name}</strong>
                  <span className="muted" title={fmtDateTime(msg.created_at)}>{relativeTime(msg.created_at)}</span>
                  {forMe && <span className="badge" style={{ background: '#7C3AED' }}>mentions you</span>}
                  {mine && (
                    <button className="chat-del" title="Delete" onClick={() => del(msg.id)}>✕</button>
                  )}
                </div>
                <div className="chat-body">{renderBody(msg.body)}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="chat-input">
        {mention && (
          <div className="mention-menu">
            {mention.items.map((mem, i) => (
              <div
                key={mem.id}
                className={`mention-item${i === mention.index ? ' active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); acceptMention(mem) }}
              >
                <span className="dot" style={{ background: mem.color }} /> {mem.name}
                <span className="muted small" style={{ marginLeft: 'auto' }}>{mem.role}</span>
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={taRef}
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="Write an update… use @ to tag a teammate. Enter to send, Shift+Enter for a new line."
        />
        <button className="btn" onClick={send} disabled={sending || !text.trim()}>Send</button>
      </div>
    </div>
  )
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('')
}
