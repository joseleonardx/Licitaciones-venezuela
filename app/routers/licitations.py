from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.licitation import Licitation
from app.schemas.licitation_schema import LicitationResponse

router = APIRouter()

@router.get("/", response_model=list[LicitationResponse])
def get_active_licitations(db: Session = Depends(get_db)):
    licitations = db.query(Licitation).filter(Licitation.status == "active").all()
    return licitations

@router.get("/{licitation_id}", response_model=LicitationResponse)
def get_licitation_detail(licitation_id: str, db: Session = Depends(get_db)):
    licitation = db.query(Licitation).filter(Licitation.id == licitation_id).first()
    if not licitation:
        raise HTTPException(status_code=404, detail="Licitación no encontrada")
    return licitation