import os
import shutil
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = "uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_pdf_locally(file: UploadFile) -> str:
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos en formato PDF.")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception:
        raise HTTPException(status_code=500, detail="Error al guardar el archivo PDF.")
    
    return f"/uploads/{file.filename}"