from datetime import datetime
from sqlalchemy.orm import Session

from models import Conversation, Message


def build_conversation_title(message: str, max_len: int = 60) -> str:
    title = message.strip().replace("\n", " ")
    if len(title) <= max_len:
        return title
    return title[:max_len].rstrip() + "..."


def get_or_create_conversation(
    db: Session,
    thread_id: str,
    user_id: int,
    first_message: str | None = None,
) -> Conversation:
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.thread_id == thread_id,
            Conversation.user_id == user_id,
        )
        .first()
    )

    if conversation:
        conversation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(conversation)
        return conversation

    conversation = Conversation(
        thread_id=thread_id,
        user_id=user_id,
        title=build_conversation_title(first_message or "New chat"),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def save_message(
    db: Session,
    conversation_id: int,
    role: str,
    content: str,
) -> Message:
    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        created_at=datetime.utcnow(),
    )
    db.add(message)

    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )
    if conversation:
        conversation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(message)
    return message


def list_conversations(db: Session, user_id: int) -> list[Conversation]:
    return (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )


def get_conversation_by_thread_id(
    db: Session,
    thread_id: str,
    user_id: int,
) -> Conversation | None:
    return (
        db.query(Conversation)
        .filter(
            Conversation.thread_id == thread_id,
            Conversation.user_id == user_id,
        )
        .first()
    )


def list_conversation_messages(db: Session, conversation_id: int) -> list[Message]:
    return (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )


def rename_conversation(
    db: Session,
    thread_id: str,
    user_id: int,
    title: str,
) -> Conversation | None:
    conversation = get_conversation_by_thread_id(db, thread_id, user_id)
    if not conversation:
        return None

    conversation.title = title.strip()
    conversation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(conversation)
    return conversation


def delete_conversation(
    db: Session,
    thread_id: str,
    user_id: int,
) -> bool:
    conversation = get_conversation_by_thread_id(db, thread_id, user_id)
    if not conversation:
        return False

    db.delete(conversation)
    db.commit()
    return True