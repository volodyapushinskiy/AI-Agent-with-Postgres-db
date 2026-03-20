from uuid import uuid4

from db import SessionLocal
from core.sse import sse_event, serialise_ai_message_chunk
from services.conversation_service import (
    get_or_create_conversation,
    save_message,
)
from services.user_service import get_or_create_user


async def generate_chat_responses(
    graph,
    message: str,
    external_user_id: str,
    thread_id: str | None = None,
):
    db = SessionLocal()
    assistant_chunks: list[str] = []

    try:
        user = get_or_create_user(db, external_user_id)

        if thread_id is None:
            thread_id = str(uuid4())
            yield sse_event(
                {
                    "type": "thread",
                    "thread_id": thread_id,
                }
            )

        conversation = get_or_create_conversation(
            db=db,
            thread_id=thread_id,
            user_id=user.id,
            first_message=message,
        )

        save_message(
            db=db,
            conversation_id=conversation.id,
            role="user",
            content=message,
        )

        config = {
            "configurable": {
                "thread_id": thread_id,
            }
        }

        events = graph.astream_events(
            {"messages": [("user", message)]},
            version="v2",
            config=config,
        )

        async for event in events:
            event_type = event["event"]

            if event_type == "on_chat_model_stream":
                chunk_content = serialise_ai_message_chunk(event["data"]["chunk"])
                if chunk_content:
                    assistant_chunks.append(chunk_content)
                    yield sse_event(
                        {
                            "type": "content",
                            "content": chunk_content,
                        }
                    )

            elif event_type == "on_chat_model_end":
                output = event["data"].get("output")
                tool_calls = output.tool_calls if hasattr(output, "tool_calls") else []
                search_calls = [
                    call
                    for call in tool_calls
                    if call["name"] == "tavily_search_results_json"
                ]

                if search_calls:
                    search_query = search_calls[0]["args"].get("query", "")
                    yield sse_event(
                        {
                            "type": "search_start",
                            "query": search_query,
                        }
                    )

            elif event_type == "on_tool_end" and event.get("name") == "tavily_search_results_json":
                output = event["data"]["output"]
                urls = []

                if isinstance(output, list):
                    for item in output:
                        if isinstance(item, dict) and "url" in item:
                            urls.append(item["url"])

                yield sse_event(
                    {
                        "type": "search_results",
                        "urls": urls,
                    }
                )

        assistant_text = "".join(assistant_chunks).strip()
        if assistant_text:
            save_message(
                db=db,
                conversation_id=conversation.id,
                role="assistant",
                content=assistant_text,
            )

    except Exception as e:
        yield sse_event(
            {
                "type": "error",
                "message": str(e),
            }
        )
    finally:
        db.close()

    yield sse_event({"type": "end"})