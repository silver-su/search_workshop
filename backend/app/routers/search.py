"""Text & Vector Search 路由。"""
from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import verify_secret_code
from ..schemas import SearchRequest, SearchResponse
from ..services import search_service
from ..services.crypto import b64_decode

router = APIRouter(prefix="/api", tags=["search"])


@router.post("/search", response_model=SearchResponse)
def search(
    payload: SearchRequest,
    _code: str = Depends(verify_secret_code),
) -> SearchResponse:
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="請輸入查詢語句")

    try:
        mongodb_url = b64_decode(payload.enc_mongodb_url)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"連線字串解密失敗: {exc}") from exc

    voyage_api_key = None
    if payload.use_reranker:
        if not payload.enc_voyage_api_key:
            raise HTTPException(
                status_code=400,
                detail="啟用 Reranker 需要 VoyageAI API Key,請先於環境設定儲存",
            )
        try:
            # 解碼後去除可能夾帶的空白 / 換行,避免授權失敗
            voyage_api_key = b64_decode(payload.enc_voyage_api_key).strip()
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=400, detail=f"VoyageAI API Key 解密失敗: {exc}"
            ) from exc
        if not voyage_api_key:
            raise HTTPException(
                status_code=400,
                detail="VoyageAI API Key 為空,請至環境設定重新儲存",
            )

    result = search_service.run_search(
        mongodb_url=mongodb_url,
        voyage_api_key=voyage_api_key,
        query=query,
        mode=payload.mode,
        use_reranker=payload.use_reranker,
        limit=payload.limit,
    )

    if not result.get("ok"):
        raise HTTPException(status_code=502, detail=result.get("message", "搜尋失敗"))

    return SearchResponse(
        ok=True,
        mode=result.get("mode"),
        model=payload.model,
        reranked=result.get("reranked", False),
        results=result.get("results", []),
        timings=result.get("timings", {}),
    )
