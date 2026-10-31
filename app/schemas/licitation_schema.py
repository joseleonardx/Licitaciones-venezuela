from pydantic import BaseModel
from datetime import datetime

class LicitationResponse(BaseModel):
    id: str
    title: str
    description: str
    budget: float | None
    status: str
    closing_date: datetime

    class Config:
        from_attributes = True