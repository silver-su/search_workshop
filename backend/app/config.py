"""Application configuration loaded from environment variables."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # 本系統(workshop 平台)自己的 MongoDB Atlas 連線字串,用來查詢 secret collection
    system_mongodb_uri: str = "mongodb://localhost:27017"
    # 本系統的資料庫名稱
    system_db_name: str = "workshop_system"
    # secret collection 名稱
    secret_collection: str = "secret"

    # 使用者端 workshop 用的資料庫 / collection 設定
    workshop_db_name: str = "workshop"
    workshop_collection: str = "restaurant"
    expected_restaurant_count: int = 4292

    # 使用者環境需具備的 index 名稱
    vector_index_name: str = "restaurant_auto_index"
    search_index_name: str = "restaurant_sindex"

    # 向量搜尋(Auto-Embedding)所用的文字欄位(index path)
    vector_search_path: str = "embedding_text"
    # 關鍵字搜尋($search)比對的文字欄位
    keyword_search_path: str = "embedding_text"
    # 搜尋預設回傳筆數
    search_limit: int = 10
    # VoyageAI Reranker 使用的模型
    rerank_model: str = "rerank-2.5"
    # Reranker 取出文字內容用來比對的欄位
    rerank_document_path: str = "embedding_text"

    # CORS 允許的前端來源
    cors_origins: str = "http://localhost:3000"

    # restaurant.json 路徑(相對於 backend 目錄)
    restaurant_json_path: str = "data/restaurant.json"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
