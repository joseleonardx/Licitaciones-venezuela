from pydantic import BaseModel, EmailStr

class CompanyCreate(BaseModel):
    razon_social: str
    rif: str
    email: EmailStr
    password: str
    telefono: str | None = None

class CompanyResponse(BaseModel):
    id: str
    razon_social: str
    rif: str
    email: str
    telefono: str | None = None

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str