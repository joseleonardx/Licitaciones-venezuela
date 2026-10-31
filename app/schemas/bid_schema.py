from pydantic import BaseModel

class BidResponse(BaseModel):
    id: str
    licitation_id: str
    company_id: str
    pdf_url: str
    status: str

    class Config:
        from_attributes = True