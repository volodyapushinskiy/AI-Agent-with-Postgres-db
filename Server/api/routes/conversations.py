from fastapi import APIRouter, HTTPException, Depends

from api.deps import get_current_external_user_id
from db import SessionLocal
from schemas.conversation import (
    ConversationOut,
    MessageOut,
    ConversationRenameRequest,
    SimpleStatusResponse,
)
from services.conversation_service import (
    list_conversations,
    get_conversation_by_thread_id,
    list_conversation_messages,
    rename_conversation,
    delete_conversation,
)
from services.user_service import get_or_create_user

router = APIRouter()


@router.get("/conversations", response_model=list[ConversationOut])
async def get_conversations(
    external_user_id: str = Depends(get_current_external_user_id),
):
    db = SessionLocal()
    try:
        user = get_or_create_user(db, external_user_id)
        conversations = list_conversations(db, user.id)

        return [
            ConversationOut(
                thread_id=item.thread_id,
                title=item.title,
                created_at=item.created_at.isoformat(),
                updated_at=item.updated_at.isoformat(),
            )
            for item in conversations
        ]
    finally:
        db.close()


@router.get("/conversations/{thread_id}/messages", response_model=list[MessageOut])
async def get_conversation_messages(
    thread_id: str,
    external_user_id: str = Depends(get_current_external_user_id),
):
    db = SessionLocal()
    try:
        user = get_or_create_user(db, external_user_id)
        conversation = get_conversation_by_thread_id(db, thread_id, user.id)

        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        messages = list_conversation_messages(db, conversation.id)

        return [
            MessageOut(
                role=item.role,
                content=item.content,
                created_at=item.created_at.isoformat(),
            )
            for item in messages
        ]
    finally:
        db.close()


@router.patch("/conversations/{thread_id}", response_model=ConversationOut)
async def patch_conversation(
    thread_id: str,
    payload: ConversationRenameRequest,
    external_user_id: str = Depends(get_current_external_user_id),
):
    db = SessionLocal()
    try:
        title = payload.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Title cannot be empty")

        user = get_or_create_user(db, external_user_id)
        conversation = rename_conversation(db, thread_id, user.id, title)

        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        return ConversationOut(
            thread_id=conversation.thread_id,
            title=conversation.title,
            created_at=conversation.created_at.isoformat(),
            updated_at=conversation.updated_at.isoformat(),
        )
    finally:
        db.close()


@router.delete("/conversations/{thread_id}", response_model=SimpleStatusResponse)
async def remove_conversation(
    thread_id: str,
    external_user_id: str = Depends(get_current_external_user_id),
):
    db = SessionLocal()
    try:
        user = get_or_create_user(db, external_user_id)
        deleted = delete_conversation(db, thread_id, user.id)

        if not deleted:
            raise HTTPException(status_code=404, detail="Conversation not found")

        return SimpleStatusResponse(
            status="ok",
            message=f"Conversation {thread_id} deleted",
        )
    finally:
        db.close()