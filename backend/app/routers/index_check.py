"""Index 檢查路由:檢查 workshop.restaurant 是否具備 vector / search index。"""
from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import verify_secret_code
from ..schemas import IndexCheckRequest, IndexCheckResponse, IndexInfo
from ..services import mongo_service
from ..services.crypto import b64_decode

router = APIRouter(prefix="/api", tags=["index"])


@router.post("/index-check", response_model=IndexCheckResponse)
def index_check(
    payload: IndexCheckRequest,
    _code: str = Depends(verify_secret_code),
) -> IndexCheckResponse:
    try:
        mongodb_url = b64_decode(payload.enc_mongodb_url)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"連線字串解密失敗: {exc}") from exc

    result = mongo_service.check_indexes(mongodb_url)
    return IndexCheckResponse(
        ok=result["ok"],
        message=result["message"],
        vector_index=IndexInfo(**result["vector"]),
        search_index=IndexInfo(**result["search"]),
    )
