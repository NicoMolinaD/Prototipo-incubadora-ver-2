# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .settings import settings
from .routers import ingest, query, alerts, models_router  # <- son APIRouter

app = FastAPI(title=settings.api_title, version=settings.api_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# IMPORTANTE: no uses .router aquí
app.include_router(ingest)
app.include_router(query)
app.include_router(alerts)
app.include_router(models_router)

@app.get("/healthz")
def healthz():
    return {"ok": True}
