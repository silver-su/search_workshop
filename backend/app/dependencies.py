"""共用的 FastAPI 相依(dependencies)。

每次受保護的 API 呼叫,都需帶上 secret code(透過 X-Secret-Code header),
後端會即時查詢系統 MongoDB Atlas 的 secret collection 確認該 code 是否仍存在。
"""
from fastapi import Header, HTTPException

from .services import mongo_service


def verify_secret_code(x_secret_code: str | None = Header(default=None)) -> str:
    """驗證 request header 中的 secret code。

    - 缺少 header → 401
    - code 不存在於 secret collection → 401「該 secret code 不存在,請與顧問聯繫」
    - 系統查詢失敗 → 500
    回傳已驗證的 code 供路由使用。
    """
    code = (x_secret_code or "").strip()
    if not code:
        raise HTTPException(status_code=401, detail="缺少 secret code,請重新登入")

    try:
        exists = mongo_service.check_secret_code(code)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"系統查詢失敗: {exc}") from exc

    if not exists:
        raise HTTPException(
            status_code=401,
            detail="該 secret code 不存在,請與顧問聯繫",
        )
    return code
