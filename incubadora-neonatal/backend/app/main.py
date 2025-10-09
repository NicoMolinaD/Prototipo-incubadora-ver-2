from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine
from .settings import settings
from .routers import ingest, query, stream


app = FastAPI(title="Incubadora API (local)")
Base.metadata.create_all(bind=engine)


# CORS
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# SSE bridge
from .routers.stream import subscribers # type: ignore
import json


def push_event(evt: dict):
    msg = f"data: {json.dumps(evt)}"
    for q in list(subscribers):
        try:
            q.put_nowait(msg)
        except Exception:
            pass


# Routers
app.include_router(ingest.router)
app.include_router(query.router)
app.include_router(stream.router)