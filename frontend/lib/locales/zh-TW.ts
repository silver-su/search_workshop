const zhTW = {
  // ── 共用 ──────────────────────────────────────────────────────────────
  common: {
    loading: "載入中...",
    save: "儲存",
    cancel: "取消",
    close: "關閉",
    copy: "複製",
    copied: "✓ 已複製",
    logout: "登出",
  },

  // ── Header ────────────────────────────────────────────────────────────
  header: {
    brand: "MongoDB Workshop",
  },

  // ── Sidebar ───────────────────────────────────────────────────────────
  sidebar: {
    setup: "環境設定",
    demo: "Text & Vector Search Demo",
    lockedTitle: "請先完成「環境設定」",
  },

  // ── Login ─────────────────────────────────────────────────────────────
  login: {
    title: "Workshop 登入",
    subtitle: "請輸入顧問提供的 secret code",
    codePlaceholder: "請輸入 secret code",
    codeLabel: "Secret Code",
    submit: "登入",
    errorEmpty: "請輸入 secret code",
  },

  // ── Setup Page ────────────────────────────────────────────────────────
  setupPage: {
    title: "環境設定",
    subtitle: "請依序完成 設定 → 資料導入 → Index 檢查，以完成 workshop 環境設定。",
    allDoneTitle: "🎉 環境設定已完成",
    allDoneDesc: "設定、資料導入與 Index 皆已就緒，可以開始進行 Text & Vector Search。",
    nextStep: "下一步：前往 Text & Vector Search →",
  },

  // ── Stepper ───────────────────────────────────────────────────────────
  stepper: {
    setup: "設定",
    import: "資料導入",
    index: "Index 檢查",
  },

  // ── SetupSection ──────────────────────────────────────────────────────
  setupSection: {
    title: "設定",
    desc: "請輸入您自己的環境資訊。儲存時系統會檢查 MongoDB Atlas 連線是否成功。",
    prefilledInfo: "已自動帶入您先前儲存於瀏覽器的設定資訊，可直接儲存或修改後重新儲存。",
    mongoUrlLabel: "MongoDB Atlas URL",
    mongoUrlPlaceholder: "mongodb+srv://user:password@cluster.mongodb.net/...",
    voyageKeyLabel: "VoyageAI API Key",
    voyageKeyPlaceholder: "pa-...",
    errorEmpty: "請完整輸入 MongoDB Atlas URL 與 VoyageAI API Key",
    successSuffix: "（連線資訊已加密儲存於瀏覽器 cookie）",
  },

  // ── ImportSection ─────────────────────────────────────────────────────
  importSection: {
    title: "資料導入",
    desc: "將專案中的 restaurant.json 寫入您 Atlas 的 workshop.restaurant collection，完成後會自動驗證筆數（需為 4292 筆）。導入前會先檢查 collection 是否已有資料。",
    btnImport: "資料導入",
    btnClearAndImport: "清空並重新導入",
    progressLabel: "導入進度",
    confirmMsg: (count: number) =>
      `workshop.restaurant collection 已經有資料（目前 ${count} 筆），是否清空？`,
    successKeepExisting: "已保留既有資料，可繼續進行 Index 檢查。",
    errorNoConn: "找不到連線資訊，請先完成「設定」步驟",
    errorImportFailed: "載入失敗，請使用者重新按下資料導入按鈕",
    errorImportError: "資料導入發生錯誤",
    errorRequestFailed: "資料導入請求失敗",
    errorCheckFailed: "檢查現有資料失敗",
    hintUnlocked: "請先在「設定」步驟成功儲存連線資訊。",
  },

  // ── IndexCheckSection ─────────────────────────────────────────────────
  indexSection: {
    title: "Index 檢查",
    desc: "檢查 workshop.restaurant collection 是否建立 Vector Index（restaurant_auto_index）與 Search Index（restaurant_sindex），且兩者皆需為「可用（可查詢）」狀態才算通過。",
    btnCheck: "檢查 Index",
    badgeOk: "可用",
    badgeBuilding: "建置中",
    badgeMissing: "未建立",
    labelVector: "Vector Index",
    labelSearch: "Search Index",
    statusPrefix: "狀態：",
    queryableYes: "是",
    queryableNo: "否",
    hintBuilding: "若 Index 顯示「建置中」，請稍候片刻後再次按下「檢查 Index」。",
    hintUnlocked: "請先完成「資料導入」步驟。",
    errorNoConn: "找不到連線資訊，請先完成「設定」步驟",
    errorCheckFailed: "Index 檢查失敗",
  },

  // ── Demo Page ─────────────────────────────────────────────────────────
  demo: {
    title: "Text & Vector Search Demo",
    subtitle: "對 workshop.restaurant collection 進行關鍵字搜尋與向量搜尋，並可選擇啟用 Reranker。",
    queryLabel: "查詢語句",
    queryPlaceholder: "例如：金門好吃的廣東粥",
    btnKeyword: "關鍵字搜尋",
    btnVectorV4: "向量搜尋 (voyage-4)",
    btnVectorV4Lite: "向量搜尋 (voyage-4-lite)",
    btnHybrid: "Hybrid Search",
    rerankerLabel: "啟用 Reranker (rerank-2.5)",
    timingSearch: (label: string) => `${label} 耗時：`,
    timingRerank: "Reranker 耗時：",
    resultCount: (mode: string, count: number) => `${mode} · 共 ${count} 筆`,
    modeLabelKeyword: "關鍵字搜尋",
    modeLabelVector: (model: string) => `向量搜尋 (${model})`,
    modeLabelHybrid: "Hybrid Search ($rankFusion)",
    rerankerSuffix: " + Reranker (rerank-2.5)",
    limitLabel: "Limit",
    limitHint: "回傳筆數（1–100）",
    numCandidatesLabel: "numCandidates",
    numCandidatesHint: "僅用於 Vector / Hybrid Search（須 ≥ Limit）",
    pipelineBtn: "查看 Aggregation Pipeline",
    pipelineHint: "點擊後可複製 pipeline，於 MongoDB Compass 貼上使用",
    errorEmpty: "請輸入查詢語句",
    errorNumCandidates: "numCandidates 必須大於或等於 Limit",
    errorNoConn: "找不到連線資訊，請先到「環境設定」完成設定",
    errorNoVoyage: "啟用 Reranker 需要 VoyageAI API Key，請先到「環境設定」儲存",
    errorRerankerAuth: (raw: string) =>
      `Reranker 授權失敗：VoyageAI 拒絕此 API Key。\n請檢查：\n1. VoyageAI 帳號是否已綁定付款方式或仍有免費額度\n2. 該 API Key 是否為 active 且未被限制端點\n3. 帳號是否有權使用 rerank-2.5 模型\n確認後請至「環境設定」重新儲存 API Key。\n\n原始訊息：${raw}`,
    errorSearchFailed: "搜尋失敗",
  },

  // ── Pipeline Modal ────────────────────────────────────────────────────
  pipeline: {
    modalTitle: "Aggregation Pipeline",
    closeBtn: "關閉",
    compassHint: "複製後可於 MongoDB Compass →「Aggregations」標籤貼上，或在 mongosh 中使用",
    compassCmd: "db.restaurant.aggregate(pipeline)",
    compassSuffix: "執行。",
    modeLabel: {
      keyword: "Text Search ($search)",
      vector: "Vector Search ($vectorSearch)",
      hybrid: "Hybrid Search ($rankFusion)",
    },
    modeDesc: {
      keyword:
        "使用 Atlas Search 的 $search stage，對 embedding_text 欄位執行全文搜尋，並以 searchScore 排序。",
      vector:
        "使用 Atlas Vector Search 的 $vectorSearch stage，以 Auto-Embedding 自動將查詢字串轉為向量後進行語意搜尋。",
      hybrid:
        "使用 $rankFusion stage 同時執行 Text Search 與 Vector Search 兩條 pipeline，再以 Reciprocal Rank Fusion (RRF) 融合排名，需 MongoDB 8.0+。",
    },
  },

  // ── SearchResultCard ──────────────────────────────────────────────────
  resultCard: {
    noName: "(無名稱)",
    labelName: "店家名稱",
    labelDesc: "店家描述",
    labelAddr: "地址",
    noLocation: "此筆無 location.coordinates",
    viewRaw: "{ } 查看 JSON Raw Data",
    rawModalDesc: "此為該筆文件由後端回傳的完整 JSON 資料，包含所有欄位與評分資訊。",
    closeAriaLabel: "關閉",
  },

  // ── AppShell ──────────────────────────────────────────────────────────
  appShell: {
    loading: "載入中...",
  },
} as const;

export default zhTW;

// 使用 DeepReadonlyString 將所有 string literal 鬆弛為 string，
// 讓 en.ts 等其他語言包可以賦值而不受 literal type 限制。
type Loosen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends object
  ? { [K in keyof T]: Loosen<T[K]> }
  : T;

export type Translations = Loosen<typeof zhTW>;
