from sqlalchemy import Column, String, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    razon_social = Column(String, nullable=False)
    rif = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    telefono = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("now()"), nullable=False)

    bids = relationship("Bid", back_populates="company", cascade="all, delete")