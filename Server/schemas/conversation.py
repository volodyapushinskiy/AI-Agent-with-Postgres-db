from pydantic import BaseModel


class ConversationOut(BaseModel):
    thread_id: str
    title: str | None = None
    created_at: str
    updated_at: str


class MessageOut(BaseModel):
    role: str
    content: str
    created_at: str


class ConversationRenameRequest(BaseModel):
    title: str


class SimpleStatusResponse(BaseModel):
    status: str
    message: str