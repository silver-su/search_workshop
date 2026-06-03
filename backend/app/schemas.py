"""Pydantic request / response models."""
from pydantic import BaseModel, Field


# ---------- 登入 ----------
class LoginRequest(BaseModel):
    code: str = Field(..., description="使用者輸入的 secret code")


class LoginResponse(BaseModel):
    ok: bool
    message: str


# ---------- 設定(驗證 Atlas 連線) ----------
class SetupRequest(BaseModel):
    mongodb_url: str = Field(..., description="使用者自己的 MongoDB Atlas 連線字串")
    voyage_api_key: str = Field(..., description="VoyageAI API Key")


class SetupResponse(BaseModel):
    ok: bool
    message: str
    # 以 base64 加密後的連線字串與 key,前端會寫入 cookie
    enc_mongodb_url: str | None = None
    enc_voyage_api_key: str | None = None


# ---------- 資料導入 ----------
class ImportCheckRequest(BaseModel):
    enc_mongodb_url: str = Field(..., description="cookie 中 base64 加密的 Atlas 連線字串")


class ImportCheckResponse(BaseModel):
    exists: bool
    count: int


class ImportRequest(BaseModel):
    enc_mongodb_url: str = Field(..., description="cookie 中 base64 加密的 Atlas 連線字串")
    force: bool = Field(default=False, description="是否清空既有資料後重新導入")


# 導入採用 SSE / streaming 進度,因此回應為純文字事件流,不在此定義 body model


# ---------- Index 檢查 ----------
class IndexCheckRequest(BaseModel):
    enc_mongodb_url: str = Field(..., description="cookie 中 base64 加密的 Atlas 連線字串")


class IndexInfo(BaseModel):
    name: str
    exists: bool
    type: str | None = None
    status: str | None = None
    queryable: bool = False
    # usable = 存在 且 可查詢(已就緒)
    usable: bool = False


class IndexCheckResponse(BaseModel):
    ok: bool
    message: str
    vector_index: IndexInfo
    search_index: IndexInfo


# ---------- Text & Vector Search ----------
class SearchRequest(BaseModel):
    enc_mongodb_url: str = Field(..., description="cookie 中 base64 加密的 Atlas 連線字串")
    enc_voyage_api_key: str | None = Field(
        default=None, description="cookie 中 base64 加密的 VoyageAI API Key(reranker 用)"
    )
    query: str = Field(..., description="查詢語句")
    # keyword | vector
    mode: str = Field(..., description="搜尋模式:keyword 或 vector")
    # 向量搜尋採用的 model(展示用;Auto-Embedding 實際 model 綁在 index 上)
    model: str | None = Field(default=None, description="向量搜尋採用的模型名稱")
    use_reranker: bool = Field(default=False, description="是否啟用 VoyageAI rerank-2.5")
    limit: int | None = Field(default=None, description="回傳筆數")


class SearchResponse(BaseModel):
    ok: bool
    message: str | None = None
    mode: str | None = None
    model: str | None = None
    reranked: bool = False
    results: list[dict] = []
    # 各階段耗時(毫秒):search_ms、rerank_ms(若啟用 reranker)
    timings: dict[str, float] = {}
