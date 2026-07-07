// Thin REST client. Relative /api URLs work in dev (vite proxy) and prod
// (FastAPI serves the build).

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText}: ${body}`)
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  list: (resource) => request(`/api/${resource}`),
  create: (resource, data) => request(`/api/${resource}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (resource, id, data) => request(`/api/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (resource, id) => request(`/api/${resource}/${id}`, { method: 'DELETE' }),
  meta: () => request('/api/meta'),
}

export async function loadAll() {
  const [members, projects, events, absences, defects, tasks, meta] = await Promise.all([
    api.list('members'),
    api.list('projects'),
    api.list('events'),
    api.list('absences'),
    api.list('defects'),
    api.list('tasks'),
    api.meta(),
  ])
  return { members, projects, events, absences, defects, tasks, meta }
}
