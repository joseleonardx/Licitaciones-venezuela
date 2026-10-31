from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.bid import Bid
from app.services.storage import save_pdf_locally

router = APIRouter()

@router.post("/")
def create_bid(
    licitation_id: str = Form(...),
    company_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Guardar PDF localmente y obtener la ruta
    pdf_url = save_pdf_locally(file)

    new_bid = Bid(
        licitation_id=licitation_id,
        company_id=company_id,
        pdf_url=pdf_url,
        status="submitted"
    )
    
    db.add(new_bid)
    db.commit()
    db.refresh(new_bid)

    return {"success": True, "message": "Postulación enviada con éxito", "data": new_bid}