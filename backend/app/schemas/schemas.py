from pydantic import BaseModel, Field
from typing import Optional, Literal

RType = Literal["file", "folder"]

class FolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    parent_id: Optional[str] = None

class ItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    move_to: Optional[str] = None
    move_to_root: bool = False

class InitUpload(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    size: int = Field(gt=0)
    mime_type: Optional[str] = "application/octet-stream"
    folder_id: Optional[str] = None

class CompleteUpload(BaseModel):
    file_id: str

class ShareCreate(BaseModel):
    resource_type: RType
    resource_id: str
    email: str
    role: Literal["viewer", "editor"]

class PublicLinkCreate(BaseModel):
    resource_type: RType
    resource_id: str
    password: Optional[str] = None
    expires_at: Optional[str] = None

class ItemRef(BaseModel):
    resource_type: RType
    resource_id: str
