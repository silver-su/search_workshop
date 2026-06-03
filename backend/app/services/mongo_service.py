"""MongoDB 相關操作:系統 secret 查詢、使用者 Atlas 連線驗證、資料導入、index 檢查。"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Iterator

from pymongo import MongoClient
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError, OperationFailure

from ..config import get_settings

settings = get_settings()


# ----------------------------------------------------------------------------
# 系統端:查詢 secret collection
# ----------------------------------------------------------------------------
def check_secret_code(code: str) -> bool:
    """連線本系統的 Atlas,查詢 secret code 是否存在。

    對應語法:db.secret.find_one({'code': 使用者輸入文字})
    """
    client = MongoClient(settings.system_mongodb_uri, serverSelectionTimeoutMS=5000)
    try:
        db = client[settings.system_db_name]
        doc = db[settings.secret_collection].find_one({"code": code})
        return doc is not None
    finally:
        client.close()


# ----------------------------------------------------------------------------
# 使用者端:驗證連線
# ----------------------------------------------------------------------------
def verify_user_connection(mongodb_url: str) -> tuple[bool, str]:
    """嘗試連線使用者的 Atlas,回傳 (是否成功, 訊息)。"""
    client = None
    try:
        client = MongoClient(mongodb_url, serverSelectionTimeoutMS=8000)
        # ping 觸發實際連線
        client.admin.command("ping")
        return True, "連線成功"
    except (ServerSelectionTimeoutError, OperationFailure, PyMongoError) as exc:
        return False, str(exc)
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)
    finally:
        if client is not None:
            client.close()


# ----------------------------------------------------------------------------
# 使用者端:資料導入(generator 產生進度,用於 SSE）
# ----------------------------------------------------------------------------
def _load_restaurant_data() -> list[dict]:
    path = Path(__file__).resolve().parents[2] / settings.restaurant_json_path
    if not path.exists():
        raise FileNotFoundError(f"找不到資料檔: {path}")
    with path.open("r", encoding="utf-8") as f:
        content = f.read().strip()
    # 支援標準 JSON array 與 NDJSON(每行一筆)
    if content.startswith("["):
        return json.loads(content)
    return [json.loads(line) for line in content.splitlines() if line.strip()]


def check_existing_restaurant_data(mongodb_url: str) -> dict:
    """檢查使用者 Atlas 的 workshop.restaurant collection 是否已有資料。

    回傳:
      {"exists": bool, "count": int}
      - collection 不存在或為空 → exists=False, count=0
      - collection 已有資料      → exists=True,  count=現有筆數
    """
    client = None
    try:
        client = MongoClient(mongodb_url, serverSelectionTimeoutMS=8000)
        db = client[settings.workshop_db_name]
        if settings.workshop_collection not in db.list_collection_names():
            return {"exists": False, "count": 0}
        count = db[settings.workshop_collection].count_documents({})
        return {"exists": count > 0, "count": count}
    finally:
        if client is not None:
            client.close()


def import_restaurant_data(mongodb_url: str, force: bool = False) -> Iterator[dict]:
    """將 restaurant.json 寫入使用者 Atlas 的 workshop.restaurant collection。

    導入前先檢查現有資料:
      - collection 不存在或為空 → 直接導入
      - 已有資料且 force=False   → yield needs_confirm 事件,等待前端確認
      - 已有資料且 force=True    → 清空後重新導入

    以 generator 逐步 yield 進度事件 dict:
      {"type": "progress", "inserted": int, "total": int, "percent": int}
      {"type": "done", "ok": bool, "message": str, "count": int}
      {"type": "error", "message": str}
    """
    client = None
    try:
        data = _load_restaurant_data()
        total = len(data)
        if total == 0:
            yield {"type": "error", "message": "restaurant.json 沒有任何資料"}
            return

        client = MongoClient(mongodb_url, serverSelectionTimeoutMS=8000)
        db = client[settings.workshop_db_name]
        coll = db[settings.workshop_collection]

        # 導入前先檢查現有資料
        existing_count = 0
        if settings.workshop_collection in db.list_collection_names():
            existing_count = coll.count_documents({})

        if existing_count > 0 and not force:
            # 已有資料且未確認 → 要求前端確認是否清空
            yield {
                "type": "needs_confirm",
                "count": existing_count,
                "message": "workshop.restaurant collection 已經有資料,是否清空?",
            }
            return

        # collection 不存在 / 為空 → 直接導入;已確認(force)→ 清空後重新導入
        coll.drop()

        batch_size = 200
        inserted = 0
        yield {"type": "progress", "inserted": 0, "total": total, "percent": 0}

        for start in range(0, total, batch_size):
            batch = data[start : start + batch_size]
            coll.insert_many(batch, ordered=False)
            inserted += len(batch)
            percent = int(inserted / total * 100)
            yield {
                "type": "progress",
                "inserted": inserted,
                "total": total,
                "percent": percent,
            }

        # 驗證筆數
        count = coll.count_documents({})
        if count != settings.expected_restaurant_count:
            coll.drop()
            yield {
                "type": "done",
                "ok": False,
                "count": count,
                "message": "載入失敗,請使用者重新按下資料導入按鈕",
            }
            return

        yield {
            "type": "done",
            "ok": True,
            "count": count,
            "message": "載入成功,請開始進行相關 workshop 內容",
        }
    except FileNotFoundError as exc:
        yield {"type": "error", "message": str(exc)}
    except PyMongoError as exc:
        yield {"type": "error", "message": f"資料庫操作失敗: {exc}"}
    except Exception as exc:  # noqa: BLE001
        yield {"type": "error", "message": str(exc)}
    finally:
        if client is not None:
            client.close()


# ----------------------------------------------------------------------------
# 使用者端:Index 檢查
# ----------------------------------------------------------------------------
# Atlas Search / Vector Search index 視為「可用」的狀態
USABLE_STATUSES = {"READY", "STEADY", "ACTIVE"}


def _missing_index_info(name: str) -> dict:
    return {
        "name": name,
        "exists": False,
        "type": None,
        "status": None,
        "queryable": False,
        "usable": False,
    }


def _build_index_info(name: str, found: dict[str, dict]) -> dict:
    info = found.get(name)
    if info is None:
        return _missing_index_info(name)

    status = (info.get("status") or "UNKNOWN").upper()
    queryable = bool(info.get("queryable", False))
    # 「可用」需同時:存在、queryable 為真、且狀態為可查詢狀態
    usable = queryable and status in USABLE_STATUSES
    return {
        "name": name,
        "exists": True,
        "type": info.get("type"),
        "status": status,
        "queryable": queryable,
        "usable": usable,
    }


def _summarize_message(vector_info: dict, search_info: dict) -> str:
    problems: list[str] = []
    for info in (vector_info, search_info):
        if not info["exists"]:
            problems.append(f"{info['name']}:尚未建立")
        elif not info["usable"]:
            problems.append(
                f"{info['name']}:建置中或尚未就緒(status={info['status']}),請稍候再檢查"
            )
    if not problems:
        return "兩個 Index 皆已建立且為可用(可查詢)狀態"
    return "Index 尚未全部就緒 — " + ";".join(problems)


def check_indexes(mongodb_url: str) -> dict:
    """檢查 workshop.restaurant collection 是否具備指定的 vector / search index。

    Atlas Search / Vector Search index 透過 listSearchIndexes 取得。
    """
    client = None
    try:
        client = MongoClient(mongodb_url, serverSelectionTimeoutMS=8000)
        db = client[settings.workshop_db_name]
        coll = db[settings.workshop_collection]

        found: dict[str, dict] = {}
        try:
            for idx in coll.list_search_indexes():
                found[idx.get("name")] = {
                    "type": idx.get("type", "search"),
                    "status": idx.get("status", "UNKNOWN"),
                    # queryable=True 代表該 index 已建置完成、可被查詢使用
                    "queryable": bool(idx.get("queryable", False)),
                }
        except OperationFailure as exc:
            # 非 Atlas 或不支援 search index 時會失敗
            return {
                "ok": False,
                "message": f"無法讀取 Search Index 清單(請確認為 Atlas 環境): {exc}",
                "vector": _missing_index_info(settings.vector_index_name),
                "search": _missing_index_info(settings.search_index_name),
            }

        vector_info = _build_index_info(settings.vector_index_name, found)
        search_info = _build_index_info(settings.search_index_name, found)

        both_usable = vector_info["usable"] and search_info["usable"]
        message = _summarize_message(vector_info, search_info)
        return {
            "ok": both_usable,
            "message": message,
            "vector": vector_info,
            "search": search_info,
        }
    except PyMongoError as exc:
        return {
            "ok": False,
            "message": f"連線或查詢失敗: {exc}",
            "vector": _missing_index_info(settings.vector_index_name),
            "search": _missing_index_info(settings.search_index_name),
        }
    finally:
        if client is not None:
            client.close()
