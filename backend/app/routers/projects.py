"""Projects router — dedicated (not the generic factory) because a project
has a many-to-many list of resources that the generic CRUD can't map."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _out(p: models.Project) -> schemas.ProjectOut:
    return schemas.ProjectOut(
        id=p.id, name=p.name, description=p.description, status=p.status,
        health=p.health, priority=p.priority, start_date=p.start_date,
        end_date=p.end_date, lead_id=p.lead_id, color=p.color,
        member_ids=[m.id for m in p.resources],
    )


def _apply(p: models.Project, payload: schemas.ProjectIn, db: Session) -> None:
    data = payload.model_dump()
    member_ids = data.pop("member_ids", []) or []
    for key, value in data.items():
        setattr(p, key, value)
    p.resources = (
        db.query(models.TeamMember).filter(models.TeamMember.id.in_(member_ids)).all()
        if member_ids else []
    )


@router.get("", response_model=list[schemas.ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return [_out(p) for p in db.query(models.Project).all()]


@router.post("", response_model=schemas.ProjectOut, status_code=201)
def create_project(payload: schemas.ProjectIn, db: Session = Depends(get_db)):
    p = models.Project()
    _apply(p, payload, db)
    db.add(p)
    db.commit()
    return _out(p)


@router.put("/{project_id}", response_model=schemas.ProjectOut)
def update_project(project_id: int, payload: schemas.ProjectIn, db: Session = Depends(get_db)):
    p = db.get(models.Project, project_id)
    if p is None:
        raise HTTPException(status_code=404, detail=f"project {project_id} not found")
    _apply(p, payload, db)
    db.commit()
    return _out(p)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    p = db.get(models.Project, project_id)
    if p is None:
        raise HTTPException(status_code=404, detail=f"project {project_id} not found")
    db.delete(p)
    db.commit()
