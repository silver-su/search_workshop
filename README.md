# MongoDB Workshop Travel System

Workshop 用的環境準備平台。讓多位使用者輸入自己的 MongoDB Atlas 連線字串,
透過統一的互動頁面完成 **登入 → 設定 → 資料導入 → Index 檢查**。

- 前端:Next.js (React, App Router, TypeScript) — 套用 MongoDB Leafy Green 風格
- 後端:Python FastAPI + PyMongo

```
Workshop_Travel/
├── backend/                  # FastAPI 後端
│   ├── app/
│   │   ├── main.py           # 應用進入點 + CORS
│   │   ├── config.py         # 環境變數設定
│   │   ├── schemas.py        # Pydantic models
│   │   ├── routers/
│   │   │   ├── login.py        # POST /api/login
│   │   │   ├── setup.py        # POST /api/setup
│   │   │   ├── import_data.py  # POST /api/import (SSE 進度)
│   │   │   └── index_check.py  # POST /api/index-check
│   │   └── services/
│   │       ├── crypto.py        # base64 編 / 解碼
│   │       └── mongo_service.py # secret 查詢 / 連線驗證 / 導入 / index 檢查
│   ├── data/restaurant.json  # ← 請放入正式的 4292 筆資料
│   ├── requirements.txt
│   └── .env.example
└── frontend/                 # Next.js 前端
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx          # 導向 /login
    │   ├── globals.css       # MongoDB 風格
    │   ├── login/page.tsx    # 登入頁
    │   └── setup/page.tsx    # 環境準備頁(三區塊)
    ├── components/           # Header / Stepper / 三個區塊元件
    ├── lib/                  # api.ts / cookies.ts
    ├── package.json
    └── .env.local.example
```

---

## 1. 後端啟動

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 設定環境變數
cp .env.example .env
# 編輯 .env,填入本系統(平台)自己的 Atlas 連線字串 SYSTEM_MONGODB_URI
```

### 產生 secret code(含 TTL 一天自動清除)

使用內建腳本產生登入用的 secret code,並自動建立 TTL Index,
讓每組 code 一天後自動從 secret collection 清除:

```bash
# 在 backend 目錄、已啟用 venv 的情況下執行
python scripts/generate_secret_code.py             # 產生 1 組隨機 code
python scripts/generate_secret_code.py -n 20        # 產生 20 組(workshop 多人用)
python scripts/generate_secret_code.py --code demo  # 指定 code
python scripts/generate_secret_code.py --ttl-hours 12  # 自訂存活時間
```

腳本會:
1. 連線 `SYSTEM_MONGODB_URI` 指定的系統 Atlas
2. 確保 `secret` collection 上建立 `secret_ttl_index`
   (以文件的 `expireAt` 欄位為到期時間,`expireAfterSeconds=0`)
3. 寫入 `{ code, createdAt, expireAt }`,`expireAt` 為現在 + TTL(預設 24 小時)

> TTL 由 MongoDB 背景執行緒約每 60 秒掃描一次,過期後自動刪除,因此實際清除時間
> 可能比 `expireAt` 略晚數十秒,屬正常現象。

啟動:

```bash
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
```

- API 文件:http://localhost:8000/docs
- 健康檢查:http://localhost:8000/health

### 放入正式資料

把正式的 `restaurant.json`(共 **4292** 筆)覆蓋到 `backend/data/restaurant.json`。
支援標準 JSON 陣列或 NDJSON(每行一筆)。

---

## 2. 前端啟動

```bash
cd frontend
npm install
cp .env.local.example .env.local   # 預設指向 http://localhost:8000
npm run dev
```

開啟 http://localhost:3000

---

## 流程說明

1. **登入**:輸入 secret code → 後端執行 `db.secret.find_one({'code': 輸入文字})`
   - 存在 → 進入環境準備頁
   - 不存在 → 顯示「該 secret code 不存在,請與顧問聯繫」

2. **設定**:輸入 MongoDB Atlas URL + VoyageAI API Key → 按儲存
   - 後端 ping 測試連線
   - 成功 → 字串以 base64 加密寫入瀏覽器 cookie,解鎖「資料導入」
   - 失敗 → 顯示可能原因(連線字串 / 密碼 URL Encoding / 0.0.0.0/0 / 聯絡顧問)

3. **資料導入**:按按鈕 → 後端 base64 解密連線字串 → 寫入 `workshop.restaurant`
   - 顯示 progress bar(SSE 串流進度)
   - 完成驗證筆數是否為 4292
     - 不符 → drop collection,提示重新導入
     - 相符 → 提示「載入成功,請開始進行相關 workshop 內容」

4. **Index 檢查**:按按鈕 → 檢查 `workshop.restaurant` 是否有
   - Vector Index:`restaurant_auto_index`
   - Search Index:`restaurant_sindex`

---

## 安全性說明

- 依需求使用 **base64** 對連線字串與 API Key 進行編碼後存於 cookie。
  base64 屬於可逆編碼而非真正加密,正式環境建議改用伺服器端 session 或對稱加密
  (可替換 `backend/app/services/crypto.py` 的實作)。
