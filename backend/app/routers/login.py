"""登入路由:驗證 secret code。"""
from fastapi import APIRouter, HTTPException

from ..schemas import LoginRequest, LoginResponse
from ..services import mongo_service

router = APIRouter(prefix="/api", tags=["login"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    code = payload.code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="請輸入 secret code")

    try:
        exists = mongo_service.check_secret_code(code)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"系統查詢失敗: {exc}") from exc

    if exists:
        return LoginResponse(ok=True, message="登入成功")

    # 該 code 不存在
    raise HTTPException(
        status_code=401,
        detail="該 secret code 不存在,請與顧問聯繫",
    )
