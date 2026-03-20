from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from api.routes.chat import router as chat_router
from api.routes.conversations import router as conversations_router
from core.config import settings
from graph.builder import create_graph_builder


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set")

    checkpointer_cm = AsyncPostgresSaver.from_conn_string(settings.DATABASE_URL)
    checkpointer = await checkpointer_cm.__aenter__()

    app.state.checkpointer_cm = checkpointer_cm
    app.state.graph = create_graph_builder().compile(checkpointer=checkpointer)

    yield

    await checkpointer_cm.__aexit__(None, None, None)


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins="https://agentfrontend-latest.onrender.com",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "ok"}


app.include_router(chat_router)
app.include_router(conversations_router)