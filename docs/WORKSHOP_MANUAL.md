# MongoDB Atlas Workshop 教學手冊
## 旅遊餐廳搜尋:Text Search、Vector Search 與 Hybrid Search 實作

本手冊帶你動手體驗 MongoDB Atlas 的四大特色,並搭配本 Workshop 系統完成一個
「金門餐廳搜尋」的完整 AI 搜尋應用:

1. **開立 M10 環境並啟用 Auto Scaling(可擴展至 M50)**
2. **AI Model 整合到 Atlas** — 在 Atlas 設定 VoyageAI Model 所需的 API Key
3. **Auto-Embedding** — 用 VoyageAI Text 4 model 對基礎資料自動向量化
4. **Text Search Index** — 使用 `lucene.chinese` analyzer 做中文分詞

完成後,你將能在系統的 [Text & Vector Search Demo] 頁面分別執行 **關鍵字搜尋、
向量搜尋、Hybrid Search**,並選擇性啟用 **Reranker**。

---

## 0. 名詞與環境對照表

| 項目 | 值 |
| --- | --- |
| Workshop 資料庫 | `workshop` |
| Workshop Collection | `workshop.restaurant` |
| 預期資料筆數 | **4292** 筆 |
| Vector Search Index 名稱 | `restaurant_auto_index` |
| Text Search Index 名稱 | `restaurant_sindex` |
| 向量化 / 搜尋文字欄位 | `embedding_text` |
| 中文分詞器 | `lucene.chinese` |
| Embedding 模型 | **VoyageAI Text 4**(在 Atlas Auto-Embedding 設定) |
| Reranker 模型 | `rerank-2.5`(VoyageAI) |

> 系統設定預設值定義於 `backend/app/config.py`,如需調整可改環境變數。

資料每筆結構(節錄):

```json
{
  "name": "六喜小館",
  "description": "六喜小館是一個有中式料理、四川菜的四川菜館...",
  "add": "金門縣金城鎮環島北路19號",
  "embedding_text": "店家: 六喜小館, 地址: ..., 介紹: ...",
  "location": { "type": "Point", "coordinates": [118.32228, 24.44099] }
}
```

- `embedding_text`:用來做 Auto-Embedding(向量化)與 Text Search 的主要文字欄位
- `location.coordinates`:GeoJSON 格式 `[經度, 緯度]`,Demo 頁用來顯示 Google Map

---

## 1. 開立 M10 環境並啟用 Auto Scaling(到 M50)

> **為什麼是 M10?** Atlas 的 **Vector Search Auto-Embedding** 與 **Search Index**
> 功能需要 **M10 或以上** 的專屬叢集(Dedicated Cluster),Free Tier(M0)/ Flex 無法使用。

### 操作步驟

1. 登入 [MongoDB Atlas](https://cloud.mongodb.com/)。
2. 選擇(或建立)一個 Project。
3. 點選 **Create**(Create a Cluster)。
4. 叢集類型選擇 **Dedicated**。
5. **Cluster Tier** 選擇 **M10**。
6. 展開 Tier 設定,啟用 **Auto-scale cluster tier**:
   - 勾選 **Enable cluster tier auto-scaling**
   - **Maximum cluster size** 設為 **M50**
   - (可選)勾選 **Allow cluster to be scaled down**,讓低載時自動降回
7. 選擇雲端供應商與區域(建議與你所在地最近的區域,降低延遲)。
8. 命名叢集,按下 **Create Deployment** 等待數分鐘佈署完成。

### 設定網路與帳號(讓本系統能連線)

1. **Network Access**:新增 IP `0.0.0.0/0`(允許任何來源,Workshop 方便用;正式環境請限縮)。
2. **Database Access**:建立一組 Database User(記下帳號 / 密碼)。
3. **取得連線字串**:叢集頁面 → **Connect** → **Drivers** → 複製
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/...`

> **密碼含符號注意**:若密碼包含 `@ : / ? # %` 等符號,連線字串中需先做
> **URL Encoding**(例如 `@` → `%40`),否則連線會失敗。

### 驗證重點(學習目標)
- [ ] 叢集 Tier 為 **M10**
- [ ] 已啟用 **Auto-scaling**,上限 **M50**
- [ ] Network Access 已開放 `0.0.0.0/0`
- [ ] 已建立 DB User,並取得可用的連線字串

---

## 2. 將 AI Model 整合到 Atlas(設定 VoyageAI API Key)

Atlas 已將 **VoyageAI** 的 AI Model 整合進平台。你只需在 Atlas 設定一次 VoyageAI
API Key,Atlas 即可在「索引建立」與「查詢」時自動呼叫 VoyageAI 產生向量
(Auto-Embedding),無需自行寫 embedding 程式。

### 取得 VoyageAI API Key

1. 前往 [VoyageAI Dashboard](https://dashboard.voyageai.com/)。
2. 確認帳號已 **綁定付款方式或仍有免費額度**(否則 Reranker 會回 403)。
3. 建立並複製一組 **API Key**(格式類似 `pa-...`)。

### 在 Atlas 設定 VoyageAI API Key

1. 進入 Atlas 專案 → 左側 **Data Services / Atlas Vector Search** 相關設定。
2. 找到 **AI Model / Embedding Provider**(Voyage AI)設定處。
3. 貼上你的 **VoyageAI API Key** 並儲存。
   - 此 Key 即為 Auto-Embedding 在 index-time 與 query-time 產生向量時使用。

> **在本 Workshop 系統中**:同一把 **VoyageAI API Key** 會在
> [環境設定] 頁面填入,系統用它來啟用 **Reranker(rerank-2.5)**。
> 也就是說,你在 Atlas 設定的 Key 與系統填入的 Key 為同一把,達到「AI Model 統一整合」。

### 驗證重點(學習目標)
- [ ] 已在 VoyageAI 取得有效 API Key(帳號有額度)
- [ ] 已在 Atlas 設定 VoyageAI API Key 供 Auto-Embedding 使用

---

## 3. Auto-Embedding:用 VoyageAI Text 4 對基礎資料自動向量化

**Auto-Embedding** 讓你不必預先計算向量。你只要在 Vector Search Index 上指定
**文字欄位** 與 **embedding 模型(VoyageAI Text 4)**,Atlas 會:

- **索引時(index-time)**:自動把 `embedding_text` 欄位的文字轉成向量並建索引
- **查詢時(query-time)**:自動把你輸入的查詢字串轉成向量再做相似度比對

> 本 Workshop 的資料量(4292 筆 < 100k)符合 Auto-Embedding 的使用條件。

### 建立 Vector Search Index(Auto-Embedding)

1. 進入叢集 → **Atlas Search**(或 Vector Search)→ **Create Search Index**。
2. 選擇 **Vector Search** 類型 → **JSON Editor**。
3. **Database / Collection** 選擇 `workshop` / `restaurant`。
4. **Index Name** 命名為 **`restaurant_auto_index`**(務必一致,系統會檢查此名稱)。
5. 使用以下 Auto-Embedding 的 index 定義(`type: "text"` 即為 Auto-Embedding):

```json
{
  "fields": [
    {
      "type": "text",
      "path": "embedding_text",
      "model": "voyage-4"
    }
  ]
}
```

> - `path`:要被向量化的文字欄位,本 Workshop 為 **`embedding_text`**。
> - `model`:**VoyageAI Text 4 model**(`voyage-4`)。
>   Auto-Embedding 的 model 是**綁在 index 定義上**的;查詢端不需(也無法)再指定 model。
>   若你的 Atlas 版本目前 Auto-Embedding 清單尚未提供 `voyage-4`,請改選環境支援的
>   Text 4 系列模型名稱,並確保與本步驟一致。

6. 按下 **Create**,等待 index 由 `BUILDING` 變為 **`READY`(queryable)**。

> **重要**:資料要先寫入 collection,Atlas 才能對既有文件產生 embedding。
> 因此實務順序為「**先建立 / 確認 index 設定 → 導入資料 → 等待 index ready**」。
> 在本系統中,你會在 [資料導入] 完成 4292 筆後,於 [Index 檢查] 確認此 index 已 `usable`。

### 驗證重點(學習目標)
- [ ] Vector Index 名稱為 **`restaurant_auto_index`**
- [ ] `type` 為 `text`(Auto-Embedding)、`path` 為 `embedding_text`
- [ ] `model` 為 **VoyageAI Text 4**
- [ ] index 狀態為 **READY / queryable**

---

## 4. Text Search Index:使用 `lucene.chinese` 中文分詞器

關鍵字搜尋(`$search`)需要一個 **Atlas Search Index**。由於資料是中文,我們使用
**`lucene.chinese`** analyzer 進行中文斷詞,讓「廣東粥」「海鮮」等詞彙能正確被分詞與比對。

### 建立 Search Index(中文分詞)

1. 進入叢集 → **Atlas Search** → **Create Search Index**。
2. 選擇 **Atlas Search** 類型 → **JSON Editor**。
3. **Database / Collection** 選擇 `workshop` / `restaurant`。
4. **Index Name** 命名為 **`restaurant_sindex`**(務必一致)。
5. 使用以下定義,對 `embedding_text` 套用 `lucene.chinese`:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "embedding_text": {
        "type": "string",
        "analyzer": "lucene.chinese",
        "searchAnalyzer": "lucene.chinese"
      }
    }
  }
}
```

> - `analyzer` / `searchAnalyzer` 皆設 **`lucene.chinese`**,確保「索引時」與
>   「查詢時」都用同一套中文分詞,結果才一致。
> - 若想同時讓其他欄位(如 `name`、`description`)可被搜尋,可在 `fields` 內加入對應
>   定義並各自指定 analyzer。

6. 按下 **Create**,等待 index 變為 **`READY`**。

### 驗證重點(學習目標)
- [ ] Search Index 名稱為 **`restaurant_sindex`**
- [ ] `embedding_text` 套用 **`lucene.chinese`** analyzer
- [ ] index 狀態為 **READY / queryable**

---

## 5. 使用本 Workshop 系統完成環境準備

完成 Atlas 端的叢集、API Key、兩個 Index 設定後,回到本系統依序操作。

### 5.1 登入
- 開啟系統首頁,輸入顧問提供的 **secret code**。
- 系統會查詢後端 secret collection,正確即進入 [環境設定]。

### 5.2 [環境設定] → 設定
1. 在 **MongoDB Atlas URL** 貼上步驟 1 取得的連線字串。
2. 在 **VoyageAI API Key** 貼上步驟 2 的 Key。
3. 按 **儲存**:
   - 系統會測試 Atlas 連線是否成功。
   - 成功 → 連線資訊以 base64 編碼存於瀏覽器 cookie,並解鎖 [資料導入]。
   - 失敗 → 顯示可能原因(連線字串錯誤 / 密碼需 URL Encoding / 需開放 `0.0.0.0/0`)。

### 5.3 [環境設定] → 資料導入
1. 按 **資料導入**。系統會先檢查 `workshop.restaurant` 是否已有資料:
   - 不存在或為空 → 直接導入
   - 已有資料 → 詢問「是否清空?」(選「取消」會保留既有資料並開啟 [Index 檢查])
2. 導入時顯示進度條,完成後驗證筆數是否為 **4292**:
   - 相符 → 顯示「載入成功」
   - 不符 → 自動清空,請重新導入

> 導入完成後,Atlas 的 Auto-Embedding 會開始對 `embedding_text` 產生向量,
> `restaurant_auto_index` 需要一點時間才會變為可查詢狀態。

### 5.4 [環境設定] → Index 檢查
- 按 **檢查 Index**,系統確認:
  - `restaurant_auto_index`(Vector Index)
  - `restaurant_sindex`(Search Index)
- 兩者都必須是 **「可用(queryable / READY)」** 才算通過。
  - 若顯示「建置中」,稍候再按一次檢查。
- 全部就緒後出現 **[下一步:前往 Text & Vector Search]** 按鈕。

### 驗證重點(學習目標)
- [ ] 連線測試成功、連線資訊已儲存
- [ ] `workshop.restaurant` 共 **4292** 筆
- [ ] 兩個 Index 皆為 **可用** 狀態

---

## 6. [Text & Vector Search Demo]:實際查詢

進入 Demo 頁面,在查詢欄輸入語句(例如:`金門好吃的廣東粥`、`海鮮餐廳`),
分別點擊以下按鈕觀察差異。每次查詢會顯示**該搜尋方式的耗時**;啟用 Reranker 時
另顯示 **Reranker 耗時**。每筆結果只呈現 **店家名稱 / 店家描述 / 地址**,右側為
Google Map。

### 6.1 關鍵字搜尋(Text Search)
- 走 `$search`,使用 `restaurant_sindex` 與 `lucene.chinese` 比對 `embedding_text`。
- 特性:**字面 / 斷詞** 命中,適合精確詞彙(如店名、地名)。

### 6.2 向量搜尋(Vector Search)— voyage-4 / voyage-4-lite
- 走 `$vectorSearch`(**Auto-Embedding**),直接傳查詢字串,由 Atlas 用
  `restaurant_auto_index` 上設定的 model 自動產生查詢向量。
- 特性:**語意** 相似,能找到「意思相近但用字不同」的結果。
- 兩個按鈕為展示用標籤;實際 embedding model 取決於 index 定義(VoyageAI Text 4)。

### 6.3 Hybrid Search($rankFusion)
- 用 **`$rankFusion`** 同時跑 Text 與 Vector 兩條 pipeline,以
  **Reciprocal Rank Fusion (RRF)** 融合排名。
- 每筆結果會額外顯示 **Text 分數** 與 **Vector 分數**,以及融合後的 **RRF 分數**。
- 特性:兼顧「字面命中」與「語意相似」,通常品質最佳。
- > 需 **MongoDB 8.0+**。

### 6.4 Reranker(rerank-2.5)
- 勾選 **啟用 Reranker** 後,任一搜尋的結果會再用 VoyageAI **`rerank-2.5`** 重排。
- 特性:用 cross-encoder 對「查詢 × 文件」做更精準的相關性評分,提升排序品質。
- > 需 VoyageAI 帳號有效授權與額度(否則回 403)。

### 練習建議
1. 同一句查詢,比較「關鍵字 vs 向量 vs Hybrid」的結果差異與耗時。
2. 對向量搜尋勾選 Reranker,觀察排序變化與額外耗時。
3. 試試「字面不同但語意相近」的查詢(例如用「想吃熱湯」找粥品店),
   體會 Vector Search 的語意能力。

---

## 7. 常見問題(Troubleshooting)

| 問題 | 可能原因 / 解法 |
| --- | --- |
| 設定頁連線失敗 | 連線字串錯誤;密碼含符號未做 URL Encoding;Network Access 未開 `0.0.0.0/0` |
| 資料導入筆數不符 | 系統會自動清空,請重新導入;確認 `restaurant.json` 為正式 4292 筆 |
| Index 檢查顯示「建置中」 | Atlas 仍在建立 / 產生 embedding,稍候再檢查 |
| 找不到 Index | index 名稱需與 `restaurant_auto_index` / `restaurant_sindex` 完全一致 |
| Hybrid Search 報錯 | `$rankFusion` 需 MongoDB **8.0+** |
| Reranker 403 Forbidden | VoyageAI 帳號未綁定付款 / 無額度 / Key 權限不足 |
| 向量搜尋無結果或報錯 | 確認 `restaurant_auto_index` 已 READY、`path` 為 `embedding_text` |

---

## 8. 學習成果檢核表

完成本 Workshop 後,你應該已實作並理解:

- [ ] 開立 **M10** 叢集並啟用 **Auto Scaling 至 M50**
- [ ] 將 **VoyageAI AI Model 整合到 Atlas**(設定 API Key)
- [ ] 用 **Auto-Embedding + VoyageAI Text 4** 對 `embedding_text` 自動向量化
      (`restaurant_auto_index`)
- [ ] 建立 **Text Search Index** 並使用 **`lucene.chinese`** 中文分詞器
      (`restaurant_sindex`)
- [ ] 在系統中完成 **設定 → 資料導入(4292 筆)→ Index 檢查**
- [ ] 操作 **Text / Vector / Hybrid Search** 並啟用 **Reranker**,理解三者差異
