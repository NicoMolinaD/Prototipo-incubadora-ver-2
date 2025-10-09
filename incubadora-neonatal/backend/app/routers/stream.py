from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import asyncio


router = APIRouter(prefix="/api/incubadora", tags=["stream"])


subscribers: set[asyncio.Queue[str]] = set()


@router.get("/stream")
async def stream():
    q: asyncio.Queue[str] = asyncio.Queue()
    subscribers.add(q)


    async def event_gen():
        try:
            yield "retry: 5000"
            while True:
                msg = await q.get()
                yield msg
        except asyncio.CancelledError:
            pass
        finally:
            subscribers.discard(q)


    return StreamingResponse(event_gen(), media_type="text/event-stream")