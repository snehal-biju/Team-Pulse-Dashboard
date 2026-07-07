# Team Pulse Dashboard

An interactive dashboard for a project team: major project timelines
(development windows per object, testing cycles, UAT, code freezes,
deployments, go-lives), team availability (PTO, early log-offs, WFH,
training), birthdays, and open defects — all editable in the app and stored
in a local SQLite file. No external services required.

## Views

| Tab | What it shows |
|-----|---------------|
| **Overview** | Who's out today, birthdays in the next 30 days, windows active today, a **team workload snapshot** (active tasks per person), project health cards with % elapsed and open-defect counts, critical defects sorted by severity/due date, everything coming up in 14 days, and a **team chat** where members tag each other with `@` to ask for or post updates |
| **Workload** | Organized **by resource**: a comparative active-load bar chart, then one card per person showing their current tasks and a collapsible list of completed ones. Each task has a status dropdown and a **reassign dropdown to move it to another resource**. Assign new work with "+ Assign task"; filter by project. Includes an "Unassigned" bucket |
| **Calendar** | Month/week/list calendar of all event types, absences and birthdays, with per-category filter chips and a per-project filter. Click an entry to edit; drag across days to create |
| **Projects** | One card per project with status/health/priority, the **resources working on it** (lead marked ★), and a mini-Gantt of its timeline events with a today marker |
| **Defects** | Open-defects register, filterable by assignee / status / severity. **Assign or reassign a defect to a resource and change its status inline** from the table (dropdowns), or click a row to edit everything. Overdue items are flagged |
| **Team** | 14-day availability strip per member, member cards with birthdays and upcoming absences |

Event types out of the box: dev window, testing cycle, UAT, code freeze,
deployment, go-live, hypercare, milestone, release cut, environment booking,
demo, retro, meeting, on-call, other. Absence types: PTO, sick, early
log-off, WFH, training, public holiday, other.

## Run locally (Windows / PowerShell)

Backend (port 8000):

```powershell
cd team-dashboard\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend dev server (port 5173, proxies /api to the backend):

```powershell
cd team-dashboard\frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The first backend start creates
`backend/data/dashboard.db` and seeds demo data — delete that file to reset.

## Single-process production run (no Docker)

```powershell
cd team-dashboard\frontend
npm run build          # writes frontend/dist
cd ..\backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

FastAPI serves the built frontend from `frontend/dist`, so the whole app is
one process at <http://localhost:8000> — reachable by teammates on your
network at `http://<your-machine>:8000`.

## Docker deployment

```bash
docker compose up --build
```

One container on port 8000; the SQLite file persists in the
`dashboard-data` volume.

## Run it on the web (no local setup)

This app has a Python backend, so **GitHub Pages will not work** (Pages only
serves static files). Use one of these instead:

- **Render** (free, gives a public URL) — New → Web Service → connect this
  repo → it detects the `Dockerfile` and deploys. The container reads `$PORT`
  automatically. Add a persistent disk mounted at `/app/data` if you want the
  SQLite data to survive restarts.
- **Railway / Fly.io** — same idea: deploy from the repo using the Dockerfile.
- **GitHub Codespaces** — Code → Codespaces → Create. In the browser terminal
  run `docker compose up --build` (or the backend/frontend dev servers) and
  open the forwarded port. Good for trying it without deploying.

## API

Plain REST under `/api` — `members`, `projects`, `events`, `absences`,
`defects`, `tasks`, each with `GET` (list), `POST`, `PUT /{id}`, `DELETE /{id}`
(`projects` carry a `member_ids` list of resources).
`messages` (team chat) supports `GET` / `POST` / `DELETE /{id}`;
`GET /api/meta` returns the value sets. Interactive docs at
<http://localhost:8000/docs>. Handy for bulk-loading real data from a
script or Excel export.

## Structure

```
backend/
  app/
    main.py        FastAPI app + static hosting of the frontend build
    database.py    SQLite engine/session
    models.py      SQLAlchemy models + category value sets
    schemas.py     Pydantic request/response schemas
    seed.py        demo data (runs once when the DB is empty)
    routers/crud.py     generic CRUD router (members, events, absences, defects, tasks)
    routers/projects.py projects + resources (many-to-many)
    routers/chat.py     team chat messages
frontend/
  src/
    App.jsx        shell + tabs, loads all data once and passes it down
    api.js         REST client
    constants.js   category labels/colors + contrast + date helpers
    theme.css      Teal & Slate theme (CSS variables)
    components/    Modal, form fields (one per entity), Badge, Chat
    pages/         Overview, Workload, CalendarPage, Projects, Defects, Team
Dockerfile         two-stage build -> single uvicorn container
```

## Ideas for later

- Pull defects from Jira/Azure DevOps and PTO from Outlook instead of manual entry
- Sprint boundaries and capacity view (% of team available per week)
- Public-holiday calendars per country, work anniversaries, new-joiner start dates
- Deployment-freeze windows enforced as warnings when someone books a deployment
- Email/Teams digest of "this week" from the overview data
- Simple auth if hosted beyond the team
