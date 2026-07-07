"""Pydantic schemas (request/response bodies)."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class _FromORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Team members ---------------------------------------------------------- #

class MemberIn(BaseModel):
    name: str
    role: str = ""
    email: str = ""
    birthday: date | None = None
    joined: date | None = None
    color: str = "#0EA5E9"


class MemberOut(MemberIn, _FromORM):
    id: int


# --- Projects --------------------------------------------------------------- #

class ProjectIn(BaseModel):
    name: str
    description: str = ""
    status: str = "ongoing"
    health: str = "green"
    priority: str = "medium"
    start_date: date | None = None
    end_date: date | None = None
    lead_id: int | None = None
    member_ids: list[int] = []
    color: str = "#0D9488"


class ProjectOut(ProjectIn):
    id: int


# --- Timeline events -------------------------------------------------------- #

class EventIn(BaseModel):
    title: str
    type: str = "milestone"
    project_id: int | None = None
    object_name: str = ""
    start_date: date
    end_date: date | None = None
    environment: str = ""
    notes: str = ""


class EventOut(EventIn, _FromORM):
    id: int


# --- Absences ---------------------------------------------------------------- #

class AbsenceIn(BaseModel):
    member_id: int
    type: str = "pto"
    start_date: date
    end_date: date | None = None
    half_day: bool = False
    notes: str = ""


class AbsenceOut(AbsenceIn, _FromORM):
    id: int


# --- Defects ------------------------------------------------------------------ #

class DefectIn(BaseModel):
    title: str
    ticket_ref: str = ""
    project_id: int | None = None
    severity: str = "medium"
    status: str = "open"
    assignee_id: int | None = None
    raised_date: date | None = None
    due_date: date | None = None
    notes: str = ""


class DefectOut(DefectIn, _FromORM):
    id: int


# --- Tasks (workload) --------------------------------------------------------- #

class TaskIn(BaseModel):
    title: str
    description: str = ""
    assignee_id: int | None = None
    project_id: int | None = None
    status: str = "to_do"
    priority: str = "medium"
    estimate: float | None = None
    start_date: date | None = None
    due_date: date | None = None
    completed_at: date | None = None


class TaskOut(TaskIn, _FromORM):
    id: int


# --- Chat messages ------------------------------------------------------------ #

class MessageIn(BaseModel):
    author_id: int | None = None
    author_name: str = ""
    body: str
    mentions: list[int] = []


class MessageOut(BaseModel):
    id: int
    author_id: int | None = None
    author_name: str
    body: str
    mentions: list[int] = []
    created_at: datetime
