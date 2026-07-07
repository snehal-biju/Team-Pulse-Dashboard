"""Demo seed data so the dashboard isn't empty on first run.

Dates are generated relative to today so the demo always looks current.
Delete backend/data/dashboard.db to re-seed.
"""

import json
from datetime import date, datetime, timedelta, timezone

from .database import SessionLocal
from . import models


def seed_if_empty() -> None:
    db = SessionLocal()
    try:
        if db.query(models.TeamMember).first() is not None:
            return

        today = date.today()

        def d(offset: int) -> date:
            return today + timedelta(days=offset)

        members = [
            models.TeamMember(name="Sneha Biju", role="Project Lead", email="sneha@example.com",
                              birthday=date(1990, 8, 14), joined=date(2022, 3, 1), color="#0EA5E9"),
            models.TeamMember(name="Arun Menon", role="Senior Developer", email="arun@example.com",
                              birthday=date(1988, 7, 18), joined=date(2021, 6, 15), color="#4F46E5"),
            models.TeamMember(name="Priya Nair", role="Developer", email="priya@example.com",
                              birthday=date(1993, 11, 2), joined=date(2023, 1, 9), color="#0D9488"),
            models.TeamMember(name="Rahul Iyer", role="QA Lead", email="rahul@example.com",
                              birthday=date(1991, 7, 25), joined=date(2022, 9, 5), color="#DB2777"),
            models.TeamMember(name="Meera Das", role="Business Analyst", email="meera@example.com",
                              birthday=date(1994, 2, 10), joined=date(2024, 4, 22), color="#0891B2"),
        ]
        db.add_all(members)
        db.flush()

        projects = [
            models.Project(name="Billing Revamp", description="Rebuild of the billing engine and invoice objects",
                           status="ongoing", health="amber", priority="high",
                           start_date=d(-45), end_date=d(40), lead_id=members[0].id, color="#0D9488"),
            models.Project(name="Vendor Portal", description="External vendor self-service portal",
                           status="ongoing", health="green", priority="medium",
                           start_date=d(-20), end_date=d(75), lead_id=members[1].id, color="#0EA5E9"),
            models.Project(name="Reporting Migration", description="Legacy reports to new BI stack",
                           status="planning", health="green", priority="low",
                           start_date=d(15), end_date=d(120), lead_id=members[4].id, color="#4F46E5"),
        ]
        db.add_all(projects)
        db.flush()

        billing, portal, reporting = projects

        # resources working on each project (not just a single lead)
        billing.resources = [members[0], members[1], members[2], members[3]]
        portal.resources = [members[1], members[2], members[4]]
        reporting.resources = [members[4], members[0]]
        events = [
            models.TimelineEvent(title="Invoice object — dev window", type="dev_window", project_id=billing.id,
                                 object_name="RICEF-101 Invoice", start_date=d(-10), end_date=d(4),
                                 environment="DEV"),
            models.TimelineEvent(title="Payment interface — dev window", type="dev_window", project_id=billing.id,
                                 object_name="RICEF-102 Payments", start_date=d(-3), end_date=d(9),
                                 environment="DEV"),
            models.TimelineEvent(title="SIT cycle 1", type="testing", project_id=billing.id,
                                 start_date=d(10), end_date=d(21), environment="QA"),
            models.TimelineEvent(title="UAT", type="uat", project_id=billing.id,
                                 start_date=d(24), end_date=d(33), environment="UAT"),
            models.TimelineEvent(title="Code freeze", type="code_freeze", project_id=billing.id,
                                 start_date=d(34), end_date=d(37)),
            models.TimelineEvent(title="PROD deployment", type="deployment", project_id=billing.id,
                                 start_date=d(38), environment="PROD"),
            models.TimelineEvent(title="Go-live + hypercare", type="hypercare", project_id=billing.id,
                                 start_date=d(39), end_date=d(46)),
            models.TimelineEvent(title="Vendor onboarding screens — dev window", type="dev_window",
                                 project_id=portal.id, object_name="VP-201 Onboarding",
                                 start_date=d(-5), end_date=d(14), environment="DEV"),
            models.TimelineEvent(title="QA environment booked", type="env_booking", project_id=portal.id,
                                 start_date=d(16), end_date=d(28), environment="QA"),
            models.TimelineEvent(title="Sprint demo", type="demo", project_id=portal.id, start_date=d(11)),
            models.TimelineEvent(title="Kickoff workshop", type="meeting", project_id=reporting.id,
                                 start_date=d(15)),
            models.TimelineEvent(title="Release 2026.07 cut", type="release", start_date=d(22)),
        ]
        db.add_all(events)

        absences = [
            models.Absence(member_id=members[1].id, type="pto", start_date=d(3), end_date=d(7),
                           notes="Family trip"),
            models.Absence(member_id=members[2].id, type="early_logoff", start_date=d(1), half_day=True,
                           notes="Leaving at 3 PM"),
            models.Absence(member_id=members[3].id, type="training", start_date=d(9), end_date=d(10)),
            models.Absence(member_id=members[4].id, type="pto", start_date=d(18), end_date=d(19)),
            models.Absence(member_id=members[0].id, type="wfh", start_date=d(2)),
        ]
        db.add_all(absences)

        defects = [
            models.Defect(title="Invoice totals wrong for multi-currency", ticket_ref="INC-4312",
                          project_id=billing.id, severity="critical", status="in_progress",
                          assignee_id=members[1].id, raised_date=d(-4), due_date=d(2)),
            models.Defect(title="Payment file rejected by bank gateway", ticket_ref="INC-4318",
                          project_id=billing.id, severity="high", status="open",
                          assignee_id=members[2].id, raised_date=d(-2), due_date=d(5)),
            models.Defect(title="Vendor search timeout on large lists", ticket_ref="VP-88",
                          project_id=portal.id, severity="medium", status="open",
                          assignee_id=members[2].id, raised_date=d(-6), due_date=d(12)),
            models.Defect(title="Report footer misaligned in PDF export", ticket_ref="RPT-15",
                          project_id=reporting.id, severity="low", status="resolved",
                          assignee_id=members[4].id, raised_date=d(-15), due_date=d(-1)),
        ]
        db.add_all(defects)

        tasks = [
            models.Task(title="Build invoice calculation module", project_id=billing.id,
                        assignee_id=members[1].id, status="in_progress", priority="high",
                        estimate=5, start_date=d(-6), due_date=d(3)),
            models.Task(title="Fix multi-currency rounding", project_id=billing.id,
                        assignee_id=members[1].id, status="blocked", priority="high",
                        estimate=2, due_date=d(1)),
            models.Task(title="Payment gateway integration", project_id=billing.id,
                        assignee_id=members[2].id, status="in_progress", priority="high",
                        estimate=4, start_date=d(-3), due_date=d(6)),
            models.Task(title="Write SIT test scripts", project_id=billing.id,
                        assignee_id=members[3].id, status="to_do", priority="medium",
                        estimate=3, due_date=d(9)),
            models.Task(title="Invoice template design sign-off", project_id=billing.id,
                        assignee_id=members[0].id, status="done", priority="medium",
                        estimate=1, completed_at=d(-2)),
            models.Task(title="Vendor onboarding UI", project_id=portal.id,
                        assignee_id=members[2].id, status="in_progress", priority="medium",
                        estimate=6, start_date=d(-4), due_date=d(12)),
            models.Task(title="Vendor search performance fix", project_id=portal.id,
                        assignee_id=members[1].id, status="to_do", priority="high",
                        estimate=2, due_date=d(8)),
            models.Task(title="Portal API contract with vendors", project_id=portal.id,
                        assignee_id=members[4].id, status="to_do", priority="medium",
                        estimate=3, due_date=d(15)),
            models.Task(title="Requirements workshop notes", project_id=reporting.id,
                        assignee_id=members[4].id, status="in_progress", priority="low",
                        estimate=2, start_date=d(-1), due_date=d(5)),
            models.Task(title="Legacy report inventory", project_id=reporting.id,
                        assignee_id=members[0].id, status="done", priority="low",
                        estimate=2, completed_at=d(-4)),
            models.Task(title="Set up BI dev environment", project_id=reporting.id,
                        assignee_id=None, status="to_do", priority="medium",
                        estimate=1, due_date=d(18)),
        ]
        db.add_all(tasks)

        now = datetime.now(timezone.utc)

        def mins_ago(n: int) -> datetime:
            return now - timedelta(minutes=n)

        messages = [
            models.Message(
                author_id=members[0].id, author_name=members[0].name,
                body="Morning all — let's use this channel for daily updates ahead of the Billing go-live. "
                     "@Arun Menon how's the multi-currency fix (INC-4312) looking?",
                mentions=json.dumps([members[1].id]), created_at=mins_ago(180)),
            models.Message(
                author_id=members[1].id, author_name=members[1].name,
                body="@Sneha Biju fix is in code review now, expecting to close INC-4312 by EOD.",
                mentions=json.dumps([members[0].id]), created_at=mins_ago(120)),
            models.Message(
                author_id=members[3].id, author_name=members[3].name,
                body="SIT cycle 1 kicks off next week — @Priya Nair @Meera Das please have test data ready.",
                mentions=json.dumps([members[2].id, members[4].id]), created_at=mins_ago(35)),
        ]
        db.add_all(messages)

        db.commit()
    finally:
        db.close()
