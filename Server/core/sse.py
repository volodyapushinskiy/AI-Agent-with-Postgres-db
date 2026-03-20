import json
from langchain_core.messages import AIMessageChunk


def sse_event(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def serialise_ai_message_chunk(chunk) -> str:
    if isinstance(chunk, AIMessageChunk):
        return chunk.content or ""
    return ""