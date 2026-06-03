"""設定路由:驗證使用者 Atlas 連線,成功則回傳 base64 加密的字串供前端寫 cookie。"""
from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import verify_secret_code
from ..schemas import SetupRequest, SetupResponse
from ..services import mongo_service
from ..services.crypto import b64_encode

router = APIRouter(prefix="/api", tags=["setup"])

CONNECT_FAIL_MESSAGE = (
    "使用者連線失敗,可能原因為:\n"
    "1. 連線字串錯誤\n"
    "2. 密碼錯誤,若密碼包含符號,請先進行 URL Encoding 後重新輸入\n"
    "3. Atlas 網路設定請開放 0.0.0.0/0\n"
    "4. 請與顧問聯繫"
)


@router.post("/setup", response_model=SetupResponse)
def setup(
    payload: SetupRequest,
    _code: str = Depends(verify_secret_code),
) -> SetupResponse:
    mongodb_url = payload.mongodb_url.strip()
    voyage_api_key = payload.voyage_api_key.strip()

    if not mongodb_url:
        raise HTTPException(status_code=400, detail="請輸入 MongoDB Atlas URL")
    if not voyage_api_key:
        raise HTTPException(status_code=400, detail="請輸入 VoyageAI API Key")

    ok, _detail = mongo_service.verify_user_connection(mongodb_url)
    if not ok:
        # 顯示固定的可能原因說明
        return SetupResponse(ok=False, message=CONNECT_FAIL_MESSAGE)

    return SetupResponse(
        ok=True,
        message="連線成功,請繼續進行資料導入",
        enc_mongodb_url=b64_encode(mongodb_url),
        enc_voyage_api_key=b64_encode(voyage_api_key),
    )
