"""Generic CRUD router factory — all five entities share the same shape."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db


def make_crud_router(prefix: str, model, schema_in: type[BaseModel], schema_out: type[BaseModel]) -> APIRouter:
    router = APIRouter(prefix=f"/api/{prefix}", tags=[prefix])

    def _get_or_404(db: Session, item_id: int):
        item = db.get(model, item_id)
        if item is None:
            raise HTTPException(status_code=404, detail=f"{prefix[:-1]} {item_id} not found")
        return item

    @router.get("", response_model=list[schema_out])
    def list_items(db: Session = Depends(get_db)):
        return db.query(model).all()

    @router.post("", response_model=schema_out, status_code=201)
    def create_item(payload: schema_in, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        item = model(**payload.model_dump())
        db.add(item)
        db.commit()
        return item

    @router.put("/{item_id}", response_model=schema_out)
    def update_item(item_id: int, payload: schema_in, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        item = _get_or_404(db, item_id)
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
        db.commit()
        return item

    @router.delete("/{item_id}", status_code=204)
    def delete_item(item_id: int, db: Session = Depends(get_db)):
        db.delete(_get_or_404(db, item_id))
        db.commit()

    return router
