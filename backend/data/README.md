# data 目錄

請將正式的 `restaurant.json`(共 **4292** 筆)放在此目錄,覆蓋現有的範例檔。

支援兩種格式:
- 標準 JSON 陣列:`[ {...}, {...}, ... ]`
- NDJSON(每行一筆):`{...}\n{...}\n...`

資料導入時系統會:
1. 先 `drop` 使用者 Atlas 的 `workshop.restaurant` collection
2. 批次寫入全部資料
3. 驗證筆數是否為 4292
   - 不符 → drop 後提示重新導入
   - 相符 → 提示載入成功
