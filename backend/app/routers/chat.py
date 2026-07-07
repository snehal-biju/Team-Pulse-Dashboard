"""Team chat router.

Kept separate from the generic CRUD factory because messages need a
server-set timestamp, a denormalized author name, and JSON-encoded mentions.
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/messages", tags=["messages"])


def _to_out(m: models.Message) -> schemas.MessageOut:
    return schemas.MessageOut(
        id=m.id,
        author_id=m.author_id,
        author_name=m.author_name,
        body=m.body,
        mentions=json.loads(m.mentions or "[]"),
        created_at=m.created_at,
    )


@router.get("", response_model=list[schemas.MessageOut])
def list_messages(db: Session = Depends(get_db)):
    msgs = db.query(models.Message).order_by(models.Message.created_at.asc()).all()
    return [_to_out(m) for m in msgs]


@router.post("", response_model=schemas.MessageOut, status_code=201)
def create_message(payload: schemas.MessageIn, db: Session = Depends(get_db)):
    author = db.get(models.TeamMember, payload.author_id) if payload.author_id else None
    msg = models.Message(
        author_id=payload.author_id,
        author_name=author.name if author else (payload.author_name or "Someone"),
        body=payload.body.strip(),
        mentions=json.dumps(payload.mentions or []),
        created_at=datetime.now(timezone.utc),
    )
    db.add(msg)
    db.commit()
    return _to_out(msg)


@router.delete("/{message_id}", status_code=204)
def delete_message(message_id: int, db: Session = Depends(get_db)):
    msg = db.get(models.Message, message_id)
    if msg is None:
        raise HTTPException(status_code=404, detail="message not found")
    db.delete(msg)
    db.commit()
