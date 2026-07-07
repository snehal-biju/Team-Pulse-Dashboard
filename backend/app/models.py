"""ORM models for the team dashboard."""

from datetime import date, datetime

from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, String, Table, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

# Many-to-many: which team members work on which project.
project_resources = Table(
    "project_resources",
    Base.metadata,
    Column("project_id", ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("member_id", ForeignKey("members.id", ondelete="CASCADE"), primary_key=True),
)

# Enum-like value sets, kept as plain strings so new categories can be added
# without a schema migration. The API validates against these.
PROJECT_STATUSES = ["planning", "ongoing", "on_hold", "completed"]
PROJECT_HEALTH = ["green", "amber", "red"]
EVENT_TYPES = [
    "dev_window",       # development window for an object/feature
    "testing",          # SIT / regression testing cycle
    "uat",              # user acceptance testing
    "code_freeze",      # freeze window — no changes
    "deployment",       # production / environment deployment
    "go_live",          # go-live / cutover
    "hypercare",        # post-go-live support window
    "milestone",        # generic milestone / deadline
    "release",          # release cut
    "env_booking",      # QA/staging environment reserved
    "demo",             # sprint demo / showcase
    "retro",            # retrospective
    "meeting",          # important meeting / workshop
    "on_call",          # on-call / support rota
    "other",
]
ABSENCE_TYPES = ["pto", "sick", "early_logoff", "wfh", "training", "public_holiday", "other"]
DEFECT_SEVERITIES = ["critical", "high", "medium", "low"]
DEFECT_STATUSES = ["open", "in_progress", "blocked", "resolved", "closed"]
TASK_STATUSES = ["to_do", "in_progress", "blocked", "done"]
TASK_PRIORITIES = ["high", "medium", "low"]


class TeamMember(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(100), default="")
    email: Mapped[str] = mapped_column(String(200), default="")
    birthday: Mapped[date | None] = mapped_column(Date, nullable=True)  # year ignored for display
    joined: Mapped[date | None] = mapped_column(Date, nullable=True)
    color: Mapped[str] = mapped_column(String(9), default="#0EA5E9")

    absences: Mapped[list["Absence"]] = relationship(back_populates="member", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="ongoing")
    health: Mapped[str] = mapped_column(String(10), default="green")
    priority: Mapped[str] = mapped_column(String(10), default="medium")  # high/medium/low
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    lead_id: Mapped[int | None] = mapped_column(ForeignKey("members.id"), nullable=True)
    color: Mapped[str] = mapped_column(String(9), default="#0D9488")

    events: Mapped[list["TimelineEvent"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    defects: Mapped[list["Defect"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    resources: Mapped[list["TeamMember"]] = relationship(secondary=project_resources)


class TimelineEvent(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String(30), default="milestone")
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    object_name: Mapped[str] = mapped_column(String(150), default="")  # RICEF/object/feature id
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)  # inclusive; None = single day
    environment: Mapped[str] = mapped_column(String(50), default="")   # DEV/QA/UAT/PROD
    notes: Mapped[str] = mapped_column(Text, default="")

    project: Mapped[Project | None] = relationship(back_populates="events")


class Absence(Base):
    __tablename__ = "absences"

    id: Mapped[int] = mapped_column(primary_key=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("members.id"))
    type: Mapped[str] = mapped_column(String(20), default="pto")
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)  # inclusive
    half_day: Mapped[bool] = mapped_column(default=False)
    notes: Mapped[str] = mapped_column(Text, default="")

    member: Mapped[TeamMember] = relationship(back_populates="absences")


class Defect(Base):
    __tablename__ = "defects"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(250))
    ticket_ref: Mapped[str] = mapped_column(String(50), default="")  # e.g. JIRA/ServiceNow id
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    severity: Mapped[str] = mapped_column(String(10), default="medium")
    status: Mapped[str] = mapped_column(String(20), default="open")
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("members.id"), nullable=True)
    raised_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")

    project: Mapped[Project | None] = relationship(back_populates="defects")
    assignee: Mapped[TeamMember | None] = relationship()


class Task(Base):
    """A unit of work assigned to a team member — powers the workload view."""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(250))
    description: Mapped[str] = mapped_column(Text, default="")
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("members.id"), nullable=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="to_do")
    priority: Mapped[str] = mapped_column(String(10), default="medium")
    estimate: Mapped[float | None] = mapped_column(Float, nullable=True)  # effort in days
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    assignee: Mapped[TeamMember | None] = relationship()
    project: Mapped[Project | None] = relationship()


class Message(Base):
    """Team chat post. author_name is a snapshot so history survives if the
    member is later deleted; mentions is a JSON list of member ids."""

    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("members.id"), nullable=True)
    author_name: Mapped[str] = mapped_column(String(100), default="")
    body: Mapped[str] = mapped_column(Text)
    mentions: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
