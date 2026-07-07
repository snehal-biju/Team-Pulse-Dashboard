"""Team dashboard API.

Run with:  uvicorn app.main:app --reload --port 8000
Serves the built frontend from ../frontend/dist when present, so a single
process can host the whole app in production.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models, schemas
from .database import Base, engine
from .routers import chat, projects
from .routers.crud import make_crud_router
from .seed import seed_if_empty

Base.metadata.create_all(engine)
seed_if_empty()

app = FastAPI(title="Team Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # internal tool; tighten if exposed beyond the team
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(make_crud_router("members", models.TeamMember, schemas.MemberIn, schemas.MemberOut))
app.include_router(projects.router)
app.include_router(make_crud_router("events", models.TimelineEvent, schemas.EventIn, schemas.EventOut))
app.include_router(make_crud_router("absences", models.Absence, schemas.AbsenceIn, schemas.AbsenceOut))
app.include_router(make_crud_router("defects", models.Defect, schemas.DefectIn, schemas.DefectOut))
app.include_router(make_crud_router("tasks", models.Task, schemas.TaskIn, schemas.TaskOut))
app.include_router(chat.router)


@app.get("/api/meta")
def meta():
    """Value sets the frontend uses to build dropdowns and legends."""
    return {
        "project_statuses": models.PROJECT_STATUSES,
        "project_health": models.PROJECT_HEALTH,
        "event_types": models.EVENT_TYPES,
        "absence_types": models.ABSENCE_TYPES,
        "defect_severities": models.DEFECT_SEVERITIES,
        "defect_statuses": models.DEFECT_STATUSES,
        "task_statuses": models.TASK_STATUSES,
        "task_priorities": models.TASK_PRIORITIES,
    }


# Serve the production frontend build if it exists (single-process deployment).
_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if _dist.is_dir():
    app.mount("/", StaticFiles(directory=_dist, html=True), name="frontend")
