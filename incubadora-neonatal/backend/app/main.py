# incubadora-neonatal/backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import ingest, query, stream, alerts  # ya existen

app = FastAPI(title="Incubadora API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo local
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(query.router)
app.include_router(stream.router)
app.include_router(alerts.router)
