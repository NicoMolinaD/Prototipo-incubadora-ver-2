# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .settings import settings
from .routers import ingest, query, alerts, models_router

app = FastAPI(title=settings.api_title, version=settings.api_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Añade el prefijo común para todas las rutas
app.include_router(ingest, prefix="/api/incubadora")
app.include_router(query, prefix="/api/incubadora")
app.include_router(alerts, prefix="/api/incubadora")
app.include_router(models_router, prefix="/api/incubadora")

@app.get("/healthz")
def healthz():
    return {"ok": True}
