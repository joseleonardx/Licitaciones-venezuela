from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base

# 1. IMPORTAR LOS MODELOS (Obligatorio para que SQLAlchemy los registre)
from app.models.company import Company
from app.models.licitation import Licitation
from app.models.bid import Bid

# 2. IMPORTAR LOS ROUTERS
from app.routers import licitations, bids

# Crear las tablas automáticamente en Supabase si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API Licitaciones Venezuela - MVP",
    version="1.0.0"
)

# Habilitar CORS para Web, iOS y Android
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar la carpeta de archivos subidos para acceso público a los PDFs
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Incluir Rutas
app.include_router(licitations.router, prefix="/api/licitations", tags=["Licitaciones"])
app.include_router(bids.router, prefix="/api/bids", tags=["Postulaciones"])

@app.get("/")
def read_root():
    return {"status": "Backend activo y operando al 100% 🚀"}