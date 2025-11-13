# app/main.py
from fastapi.middleware.cors import CORSMiddleware
from .settings import settings
from fastapi import FastAPI, APIRouter
from .routers import ingest, query, alerts, models_router, auth

app = FastAPI(title="Incubadora API", version="v0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api/incubadora")
api.include_router(auth)
api.include_router(ingest)
api.include_router(query)
api.include_router(alerts)
api.include_router(models_router)

app.include_router(api)
@app.get("/healthz")
def healthz():
    return {"ok": True}
