from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse

from api.deps import get_current_external_user_id
from schemas.chat import ChatRequest
from services.chat_service import generate_chat_responses

router = APIRouter()


@router.post("/chat_stream")
async def chat_stream(
    payload: ChatRequest,
    request: Request,
    external_user_id: str = Depends(get_current_external_user_id),
):
    graph = request.app.state.graph

    return StreamingResponse(
        generate_chat_responses(
            graph=graph,
            message=payload.message,
            thread_id=payload.thread_id,
            external_user_id=external_user_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )