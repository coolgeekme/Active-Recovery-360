"""Public file-serving endpoint that proxies image bytes from Emergent Object Storage."""
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
import io

from services.storage import get_object

router = APIRouter()


@router.get("/files/{path:path}")
async def serve_file(path: str):
    """Public endpoint: stream image bytes from object storage. No auth (product images are public)."""
    try:
        data, content_type = get_object(path)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found: {e}")
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )
