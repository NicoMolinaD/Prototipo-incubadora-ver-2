from fastapi import Header, HTTPException
from typing import Optional
from .settings import settings




def verify_api_key(x_api_key: Optional[str] = Header(None)):
    if x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")