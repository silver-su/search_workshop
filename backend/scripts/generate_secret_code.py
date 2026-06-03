#!/usr/bin/env python3
"""產生 secret code 並寫入系統 MongoDB Atlas 的 secret collection。

特性:
- 每組 secret code 只存活一天(24 小時),透過 TTL Index 自動清除。
- 會自動確保 secret collection 上建立好 TTL Index(expireAfterSeconds=0,
  以文件中的 expireAt 欄位為到期時間)。

使用方式(在 backend 目錄下執行):
    python scripts/generate_secret_code.py                 # 產生 1 組隨機 code
    python scripts/generate_secret_code.py -n 5            # 產生 5 組
    python scripts/generate_secret_code.py --code demo-01  # 指定 code
    python scripts/generate_secret_code.py --ttl-hours 12  # 自訂存活時間(小時)
    python scripts/generate_secret_code.py --length 10     # 自訂隨機 code 長度

環境變數(沿用 backend/.env):
    SYSTEM_MONGODB_URI, SYSTEM_DB_NAME, SECRET_COLLECTION
"""
from __future__ import annotations

import argparse
import secrets
import string
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# 讓腳本可在 backend 目錄下直接執行並讀取 app.config
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pymongo import ASCENDING, MongoClient  # noqa: E402
from pymongo.errors import PyMongoError  # noqa: E402

from app.config import get_settings  # noqa: E402

settings = get_settings()

TTL_INDEX_NAME = "secret_ttl_index"
# 產生隨機 code 時使用的字元(去除易混淆字元 0/O/1/l/I)
ALPHABET = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"


def ensure_ttl_index(collection) -> None:
    """確保 secret collection 上具備以 expireAt 為基準的 TTL Index。

    expireAfterSeconds=0 代表:文件在 expireAt 指定的時間點到期。
    若已存在但設定不同,先移除再重建。
    """
    existing = collection.index_information()
    if TTL_INDEX_NAME in existing:
        idx = existing[TTL_INDEX_NAME]
        same_key = idx.get("key") == [("expireAt", ASCENDING)]
        same_ttl = idx.get("expireAfterSeconds") == 0
        if same_key and same_ttl:
            return
        collection.drop_index(TTL_INDEX_NAME)

    collection.create_index(
        [("expireAt", ASCENDING)],
        name=TTL_INDEX_NAME,
        expireAfterSeconds=0,
    )
    print(f"[index] 已確保 TTL Index: {TTL_INDEX_NAME} (expireAfterSeconds=0)")


def generate_code(length: int) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="產生 secret code 至系統 MongoDB Atlas,並設定 TTL 一天自動清除。"
    )
    parser.add_argument(
        "-n", "--count", type=int, default=1, help="要產生的 code 數量(預設 1)"
    )
    parser.add_argument(
        "--code",
        type=str,
        default=None,
        help="指定 code(僅在 count=1 時有效);未指定則隨機產生",
    )
    parser.add_argument(
        "--length", type=int, default=8, help="隨機 code 長度(預設 8)"
    )
    parser.add_argument(
        "--ttl-hours",
        type=float,
        default=24.0,
        help="code 存活時間(小時),預設 24(一天)",
    )
    args = parser.parse_args()

    if args.code and args.count != 1:
        print("錯誤: --code 只能在產生 1 組(count=1)時使用", file=sys.stderr)
        return 2
    if args.count < 1:
        print("錯誤: --count 必須 >= 1", file=sys.stderr)
        return 2

    now = datetime.now(timezone.utc)
    expire_at = now + timedelta(hours=args.ttl_hours)

    client = MongoClient(settings.system_mongodb_uri, serverSelectionTimeoutMS=8000)
    try:
        client.admin.command("ping")
    except PyMongoError as exc:
        print(f"無法連線系統 MongoDB: {exc}", file=sys.stderr)
        return 1

    try:
        db = client[settings.system_db_name]
        coll = db[settings.secret_collection]

        ensure_ttl_index(coll)

        codes: list[str] = []
        if args.code:
            codes = [args.code.strip()]
        else:
            codes = [generate_code(args.length) for _ in range(args.count)]

        docs = [
            {
                "code": code,
                "createdAt": now,
                # TTL Index 以此欄位作為到期時間點(必須為 UTC datetime)
                "expireAt": expire_at,
            }
            for code in codes
        ]

        try:
            coll.insert_many(docs, ordered=False)
        except PyMongoError as exc:
            print(f"寫入 secret 失敗(code 可能重複?): {exc}", file=sys.stderr)
            return 1

        print(f"\n已寫入 {len(codes)} 組 secret code 至 "
              f"{settings.system_db_name}.{settings.secret_collection}")
        print(f"建立時間 (UTC): {now.isoformat()}")
        print(f"到期時間 (UTC): {expire_at.isoformat()}  "
              f"(存活 {args.ttl_hours} 小時,由 TTL Index 自動清除)\n")
        print("Secret code(s):")
        for code in codes:
            print(f"  - {code}")
        print()
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
