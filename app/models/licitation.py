from sqlalchemy import Column, String, Numeric, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class Licitation(Base):
    __tablename__ = "licitations"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    budget = Column(Numeric(12, 2), nullable=True)
    status = Column(String, server_default="active", nullable=False)
    closing_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text("now()"), nullable=False)

    # Debe estar indentado dentro de la clase
    bids = relationship("Bid", back_populates="licitation", cascade="all, delete")