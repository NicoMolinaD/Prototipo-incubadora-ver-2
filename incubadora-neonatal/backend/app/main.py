# app/main.py
from fastapi.middleware.cors import CORSMiddleware
from .settings import settings
from fastapi import FastAPI, APIRouter
from .routers import ingest, query, alerts, models_router

app = FastAPI(title="Incubadora API", version="v0.1.0")

app = FastAPI(title=settings.api_title, version=settings.api_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api/incubadora")
api.include_router(ingest.router)
api.include_router(query.router)
api.include_router(alerts.router)
api.include_router(models_router.router)
@app.get("/healthz")
def healthz():
    return {"ok": True}
