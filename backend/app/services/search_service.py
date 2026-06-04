"""Text / Vector Search 與 VoyageAI Reranker 相關操作。

- 關鍵字搜尋:Atlas Search ($search) 比對 embedding_text,使用 restaurant_sindex
- 向量搜尋:Atlas Vector Search ($vectorSearch) Auto-Embedding,直接傳 query 字串,
  由 Atlas 以 index 上設定的 model 自動產生 embedding,使用 restaurant_auto_index
- Reranker:取得結果後,用使用者的 VoyageAI API Key 呼叫 rerank-2.5 重排
"""
from __future__ import annotations

import time
from typing import Any

import voyageai
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from ..config import get_settings

settings = get_settings()

# 結果只保留呈現需要的欄位(name/description/add)與地圖需要的 location
_KEEP_FIELDS = ("name", "description", "add", "location")


def _project_fields(doc: dict) -> dict:
    """精簡 document:只保留 name / description / add / location 與 _id。"""
    out: dict[str, Any] = {}
    if "_id" in doc:
        out["_id"] = str(doc["_id"])
    for k in _KEEP_FIELDS:
        if k in doc:
            out[k] = doc[k]
    return out


def keyword_search(
    mongodb_url: str, query: str, limit: int
) -> tuple[list[dict], float]:
    """Atlas Search ($search) 關鍵字搜尋。回傳 (結果, 耗時毫秒)。"""
    client = MongoClient(mongodb_url, serverSelectionTimeoutMS=8000)
    try:
        coll = client[settings.workshop_db_name][settings.workshop_collection]
        pipeline = [
            {
                "$search": {
                    "index": settings.search_index_name,
                    "text": {
                        "query": query,
                        "path": settings.keyword_search_path,
                    },
                }
            },
            {"$limit": limit},
            {"$addFields": {"_score": {"$meta": "searchScore"}}},
        ]
        start = time.perf_counter()
        results = []
        for doc in coll.aggregate(pipeline):
            score = doc.pop("_score", None)
            cleaned = _project_fields(doc)
            cleaned["_score"] = score
            results.append(cleaned)
        elapsed_ms = (time.perf_counter() - start) * 1000
        return results, elapsed_ms
    finally:
        client.close()


def vector_search(
    mongodb_url: str, query: str, limit: int, model: str | None = None,
    num_candidates: int | None = None,
) -> tuple[list[dict], float]:
    """Atlas Vector Search ($vectorSearch) Auto-Embedding 搜尋。回傳 (結果, 耗時毫秒)。

    傳入 query 字串與 model 名稱,Atlas 以 queryEmbeddingOptions 指定的 VoyageAI model
    自動產生 embedding 後執行向量搜尋。
    """
    client = MongoClient(mongodb_url, serverSelectionTimeoutMS=8000)
    try:
        coll = client[settings.workshop_db_name][settings.workshop_collection]
        nc = num_candidates if num_candidates and num_candidates > 0 else max(limit * 10, 100)
        vector_search_stage: dict = {
            "index": settings.vector_index_name,
            "path": settings.vector_search_path,
            "query": query,
            "limit": limit,
            "numCandidates": nc,
        }
        if model:
            vector_search_stage["model"] = model
        pipeline = [
            {"$vectorSearch": vector_search_stage},
            {"$addFields": {"_score": {"$meta": "vectorSearchScore"}}},
        ]
        start = time.perf_counter()
        results = []
        for doc in coll.aggregate(pipeline):
            score = doc.pop("_score", None)
            cleaned = _project_fields(doc)
            cleaned["_score"] = score
            results.append(cleaned)
        elapsed_ms = (time.perf_counter() - start) * 1000
        return results, elapsed_ms
    finally:
        client.close()


def _parse_hybrid_score_details(details: Any) -> dict:
    """從 $rankFusion 的 scoreDetails 取出 Text / Vector 各自的原始分數與 rank。

    details 結構:{"value":..,"description":..,"details":[
        {"inputPipelineName":"textPipeline","rank":n,"weight":w,"value":原始分數,...},
        {"inputPipelineName":"vectorPipeline","rank":n,...},
    ]}
    回傳精簡的 {_text_score,_vector_score,_text_rank,_vector_rank}(無值則省略)。
    """
    out: dict[str, Any] = {}
    if not isinstance(details, dict):
        return out
    for entry in details.get("details", []) or []:
        if not isinstance(entry, dict):
            continue
        name = entry.get("inputPipelineName")
        value = entry.get("value")
        rank = entry.get("rank")
        if name == "textPipeline":
            if isinstance(value, (int, float)):
                out["_text_score"] = value
            if isinstance(rank, (int, float)):
                out["_text_rank"] = rank
        elif name == "vectorPipeline":
            if isinstance(value, (int, float)):
                out["_vector_score"] = value
            if isinstance(rank, (int, float)):
                out["_vector_rank"] = rank
    return out


def hybrid_search(
    mongodb_url: str, query: str, limit: int, model: str | None = None,
    num_candidates: int | None = None,
) -> tuple[list[dict], float]:
    """Hybrid Search:用 $rankFusion 同時執行 Text Search 與 Vector Search。

    以 Reciprocal Rank Fusion (RRF) 融合兩條 pipeline 的排名,需 MongoDB 8.0+。
    回傳 (結果, 耗時毫秒),每筆附 Text / Vector 各自原始分數。
    """
    client = MongoClient(mongodb_url, serverSelectionTimeoutMS=8000)
    try:
        coll = client[settings.workshop_db_name][settings.workshop_collection]

        nc = num_candidates if num_candidates and num_candidates > 0 else max(limit * 10, 100)
        vector_search_stage: dict = {
            "index": settings.vector_index_name,
            "path": settings.vector_search_path,
            "query": query,
            "limit": limit,
            "numCandidates": nc,
        }
        if model:
            vector_search_stage["model"] = model
        vector_pipeline = [
            {"$vectorSearch": vector_search_stage}
        ]
        text_pipeline = [
            {
                "$search": {
                    "index": settings.search_index_name,
                    "text": {
                        "query": query,
                        "path": settings.keyword_search_path,
                    },
                }
            },
            {"$limit": limit},
        ]

        pipeline = [
            {
                "$rankFusion": {
                    "input": {
                        "pipelines": {
                            "vectorPipeline": vector_pipeline,
                            "textPipeline": text_pipeline,
                        }
                    },
                    "combination": {
                        "weights": {
                            "vectorPipeline": 1,
                            "textPipeline": 1,
                        }
                    },
                    "scoreDetails": True,
                }
            },
            {"$limit": limit},
            {
                "$addFields": {
                    "_score": {"$meta": "score"},
                    "_score_details": {"$meta": "scoreDetails"},
                }
            },
        ]

        start = time.perf_counter()
        results = []
        for doc in coll.aggregate(pipeline):
            score = doc.pop("_score", None)
            details = doc.pop("_score_details", None)
            cleaned = _project_fields(doc)
            cleaned["_score"] = score
            # 解析出 Text / Vector 各自的原始分數(取不到則帶 rank)
            cleaned.update(_parse_hybrid_score_details(details))
            results.append(cleaned)
        elapsed_ms = (time.perf_counter() - start) * 1000
        return results, elapsed_ms
    finally:
        client.close()


def rerank(
    voyage_api_key: str, query: str, docs: list[dict], top_k: int
) -> tuple[list[dict], float]:
    """用 VoyageAI rerank-2.5 對搜尋結果重排。回傳 (結果, 耗時毫秒)。

    取每筆 document 的 rerank_document_path 欄位文字送去 rerank,
    依回傳的 relevance_score 重新排序,並把分數寫回 _rerank_score。
    """
    if not docs:
        return docs, 0.0

    # 取每筆文件的文字內容;若指定欄位為空,退而求其次用 name+description 組合,
    # 避免送出空字串造成 VoyageAI rerank 回 400。
    def _doc_text(d: dict) -> str:
        text = str(d.get(settings.rerank_document_path, "") or "").strip()
        if text:
            return text
        # 結果已精簡為 name/description/add,用這些欄位組出 rerank 文字
        parts = [
            str(d.get("name", "") or ""),
            str(d.get("description", "") or ""),
            str(d.get("add", "") or ""),
        ]
        fallback = " ".join(p for p in parts if p).strip()
        # 仍為空時給一個佔位字串,確保 documents 不含空字串
        return fallback or "(no content)"

    # 只挑出有對應文字的文件送去 rerank,並保留原始索引以利對回
    indexed = [(i, _doc_text(d)) for i, d in enumerate(docs)]
    valid = [(i, t) for (i, t) in indexed if t]
    if not valid:
        return docs, 0.0

    orig_indexes = [i for (i, _t) in valid]
    documents_text = [t for (_i, t) in valid]

    # top_k 必須 <= documents 數量
    k = min(top_k, len(documents_text))

    # 採用 VoyageAI 官方 client 的 rerank()
    client = voyageai.Client(api_key=voyage_api_key)
    start = time.perf_counter()
    reranking = client.rerank(
        query=query,
        documents=documents_text,
        model=settings.rerank_model,
        top_k=k if k > 0 else None,
    )
    elapsed_ms = (time.perf_counter() - start) * 1000

    reranked: list[dict] = []
    for item in reranking.results:
        local_idx = item.index
        if local_idx is None or local_idx >= len(orig_indexes):
            continue
        doc = dict(docs[orig_indexes[local_idx]])
        doc["_rerank_score"] = item.relevance_score
        reranked.append(doc)
    return reranked, elapsed_ms


def run_search(
    mongodb_url: str,
    voyage_api_key: str | None,
    query: str,
    mode: str,
    use_reranker: bool,
    limit: int | None = None,
    model: str | None = None,
    num_candidates: int | None = None,
) -> dict:
    """統一入口:依 mode 執行搜尋,並視需要套用 reranker。

    mode: "keyword" | "vector" | "hybrid"
    model: VoyageAI embedding model 名稱(向量搜尋時透過 queryEmbeddingOptions 指定)
    num_candidates: 向量搜尋候選數,None 時自動計算
    回傳 {"mode", "reranked", "results": [...], "timings": {...}}
    """
    lim = limit or settings.search_limit
    timings: dict[str, float] = {}

    try:
        if mode == "keyword":
            results, search_ms = keyword_search(mongodb_url, query, lim)
        elif mode == "vector":
            results, search_ms = vector_search(mongodb_url, query, lim, model=model, num_candidates=num_candidates)
        elif mode == "hybrid":
            results, search_ms = hybrid_search(mongodb_url, query, lim, model=model, num_candidates=num_candidates)
        else:
            return {"ok": False, "message": f"未知的搜尋模式: {mode}"}
    except PyMongoError as exc:
        return {"ok": False, "message": f"搜尋失敗: {exc}"}

    timings["search_ms"] = round(search_ms, 2)

    reranked_applied = False
    if use_reranker:
        if not voyage_api_key:
            return {"ok": False, "message": "啟用 Reranker 需提供 VoyageAI API Key"}
        try:
            results, rerank_ms = rerank(voyage_api_key, query, results, lim)
            timings["rerank_ms"] = round(rerank_ms, 2)
            reranked_applied = True
        except voyageai.error.AuthenticationError as exc:
            hint = (
                "VoyageAI 拒絕授權(API Key 無效或帳號未授權)。"
                "請至 VoyageAI 後台確認 Key 正確,再到「環境設定」重新儲存。"
            )
            return {"ok": False, "message": f"Reranker 授權失敗: {hint}\n回應: {exc}"}
        except voyageai.error.RateLimitError as exc:
            return {
                "ok": False,
                "message": f"Reranker 已達速率 / 額度限制,請稍後再試。\n回應: {exc}",
            }
        except voyageai.error.VoyageError as exc:
            hint = (
                "若為授權 / 額度問題(403),請至 VoyageAI 後台確認帳號已啟用付費或仍有額度。"
            )
            return {"ok": False, "message": f"Reranker 呼叫失敗: {exc}\n{hint}"}
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "message": f"Reranker 呼叫失敗: {exc}"}

    return {
        "ok": True,
        "mode": mode,
        "reranked": reranked_applied,
        "results": results,
        "timings": timings,
    }
