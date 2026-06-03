"""資料導入路由:解密 Atlas URL 後寫入 restaurant 資料,以 SSE 串流回傳進度。"""
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from ..dependencies import verify_secret_code
from ..schemas import ImportCheckRequest, ImportCheckResponse, ImportRequest
from ..services import mongo_service
from ..services.crypto import b64_decode

router = APIRouter(prefix="/api", tags=["import"])


@router.post("/import-check", response_model=ImportCheckResponse)
def import_check(
    payload: ImportCheckRequest,
    _code: str = Depends(verify_secret_code),
) -> ImportCheckResponse:
    """導入前檢查 workshop.restaurant 是否已有資料。"""
    try:
        mongodb_url = b64_decode(payload.enc_mongodb_url)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"連線字串解密失敗: {exc}") from exc

    try:
        result = mongo_service.check_existing_restaurant_data(mongodb_url)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"檢查現有資料失敗: {exc}") from exc

    return ImportCheckResponse(**result)


@router.post("/import")
def import_data(
    payload: ImportRequest,
    _code: str = Depends(verify_secret_code),
) -> StreamingResponse:
    try:
        mongodb_url = b64_decode(payload.enc_mongodb_url)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"連線字串解密失敗: {exc}") from exc

    def event_stream():
        for event in mongo_service.import_restaurant_data(
            mongodb_url, force=payload.force
        ):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
