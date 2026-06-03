"""FastAPI 應用程式進入點。"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import login, setup, import_data, index_check, search

settings = get_settings()

app = FastAPI(
    title="MongoDB Workshop Travel System",
    description="Workshop 環境準備平台:登入 / 設定 / 資料導入 / Index 檢查",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(login.router)
app.include_router(setup.router)
app.include_router(import_data.router)
app.include_router(index_check.router)
app.include_router(search.router)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok"}
