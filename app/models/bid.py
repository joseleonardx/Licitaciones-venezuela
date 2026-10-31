from sqlalchemy import Column, String, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class Bid(Base):
    __tablename__ = "bids"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    licitation_id = Column(UUID(as_uuid=True), ForeignKey("licitations.id", ondelete="CASCADE"), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    pdf_url = Column(String, nullable=False)
    status = Column(String, server_default="submitted", nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=text("now()"), nullable=False)

    licitation = relationship("Licitation", back_populates="bids")
    company = relationship("Company", back_populates="bids")