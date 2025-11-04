from fastapi import APIRouter
from typing import List

router = APIRouter(tags=["alerts"])

@router.get("/alerts", response_model=List[str])
def alerts():
    # placeholder: sin reglas de negocio todavia
    return []
