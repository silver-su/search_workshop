import type { Translations } from "./zh-TW";

const en: Translations = {
  // ── Common ────────────────────────────────────────────────────────────
  common: {
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    copy: "Copy",
    copied: "✓ Copied",
    logout: "Logout",
  },

  // ── Header ────────────────────────────────────────────────────────────
  header: {
    brand: "MongoDB Workshop",
  },

  // ── Sidebar ───────────────────────────────────────────────────────────
  sidebar: {
    setup: "Environment Setup",
    demo: "Text & Vector Search Demo",
    lockedTitle: "Please complete Environment Setup first",
  },

  // ── Login ─────────────────────────────────────────────────────────────
  login: {
    title: "Workshop Login",
    subtitle: "Enter the secret code provided by your consultant",
    codePlaceholder: "Enter secret code",
    codeLabel: "Secret Code",
    submit: "Login",
    errorEmpty: "Please enter a secret code",
  },

  // ── Setup Page ────────────────────────────────────────────────────────
  setupPage: {
    title: "Environment Setup",
    subtitle: "Complete Setup → Data Import → Index Check to finish the workshop environment.",
    allDoneTitle: "🎉 Environment Setup Complete",
    allDoneDesc: "Setup, data import, and indexes are all ready. You can now start Text & Vector Search.",
    nextStep: "Next: Go to Text & Vector Search →",
  },

  // ── Stepper ───────────────────────────────────────────────────────────
  stepper: {
    setup: "Setup",
    import: "Data Import",
    index: "Index Check",
  },

  // ── SetupSection ──────────────────────────────────────────────────────
  setupSection: {
    title: "Setup",
    desc: "Enter your environment credentials. The system will verify the MongoDB Atlas connection when you save.",
    prefilledInfo: "Previously saved credentials have been pre-filled. You can save directly or update them.",
    mongoUrlLabel: "MongoDB Atlas URL",
    mongoUrlPlaceholder: "mongodb+srv://user:password@cluster.mongodb.net/...",
    voyageKeyLabel: "VoyageAI API Key",
    voyageKeyPlaceholder: "pa-...",
    errorEmpty: "Please enter both MongoDB Atlas URL and VoyageAI API Key",
    successSuffix: " (credentials encrypted and stored in browser cookie)",
  },

  // ── ImportSection ─────────────────────────────────────────────────────
  importSection: {
    title: "Data Import",
    desc: "Import restaurant.json into your Atlas workshop.restaurant collection. The record count (4292) will be verified automatically. Existing data will be checked before import.",
    btnImport: "Import Data",
    btnClearAndImport: "Clear & Re-import",
    progressLabel: "Import Progress",
    confirmMsg: (count: number) =>
      `workshop.restaurant already has data (${count} records). Clear and re-import?`,
    successKeepExisting: "Existing data kept. You can proceed to Index Check.",
    errorNoConn: "Connection info not found. Please complete the Setup step first.",
    errorImportFailed: "Import failed. Please click the Import button again.",
    errorImportError: "An error occurred during data import.",
    errorRequestFailed: "Data import request failed.",
    errorCheckFailed: "Failed to check existing data.",
    hintUnlocked: "Please save your connection info in the Setup step first.",
  },

  // ── IndexCheckSection ─────────────────────────────────────────────────
  indexSection: {
    title: "Index Check",
    desc: "Check whether the Vector Index (restaurant_auto_index) and Search Index (restaurant_sindex) exist on workshop.restaurant and are both in a queryable (ready) state.",
    btnCheck: "Check Indexes",
    badgeOk: "Ready",
    badgeBuilding: "Building",
    badgeMissing: "Not Found",
    labelVector: "Vector Index",
    labelSearch: "Search Index",
    statusPrefix: "Status: ",
    queryableYes: "Yes",
    queryableNo: "No",
    hintBuilding: "If an index shows \"Building\", wait a moment and click Check Indexes again.",
    hintUnlocked: "Please complete the Data Import step first.",
    errorNoConn: "Connection info not found. Please complete the Setup step first.",
    errorCheckFailed: "Index check failed.",
  },

  // ── Demo Page ─────────────────────────────────────────────────────────
  demo: {
    title: "Text & Vector Search Demo",
    subtitle: "Run keyword and vector searches on the workshop.restaurant collection, with optional Reranker.",
    queryLabel: "Search Query",
    queryPlaceholder: "e.g. Cantonese congee in Kinmen",
    btnKeyword: "Keyword Search",
    btnVectorV4: "Vector Search (voyage-4)",
    btnVectorV4Lite: "Vector Search (voyage-4-lite)",
    btnHybrid: "Hybrid Search",
    rerankerLabel: "Enable Reranker (rerank-2.5)",
    timingSearch: (label: string) => `${label} time:`,
    timingRerank: "Reranker time:",
    resultCount: (mode: string, count: number) => `${mode} · ${count} results`,
    modeLabelKeyword: "Keyword Search",
    modeLabelVector: (model: string) => `Vector Search (${model})`,
    modeLabelHybrid: "Hybrid Search ($rankFusion)",
    rerankerSuffix: " + Reranker (rerank-2.5)",
    limitLabel: "Limit",
    limitHint: "Number of results to return (1–100)",
    numCandidatesLabel: "numCandidates",
    numCandidatesHint: "Vector / Hybrid Search only (must be ≥ Limit)",
    pipelineBtn: "View Aggregation Pipeline",
    pipelineHint: "Copy the pipeline and paste it in MongoDB Compass",
    errorEmpty: "Please enter a search query",
    errorNumCandidates: "numCandidates must be greater than or equal to Limit",
    errorNoConn: "Connection info not found. Please complete Environment Setup first.",
    errorNoVoyage: "Reranker requires a VoyageAI API Key. Please save it in Environment Setup.",
    errorRerankerAuth: (raw: string) =>
      `Reranker auth failed: VoyageAI rejected this API Key.\nPlease check:\n1. Is your VoyageAI account linked to a payment method or still has free quota?\n2. Is the API Key active and not endpoint-restricted?\n3. Does your account have access to the rerank-2.5 model?\nUpdate the key in Environment Setup.\n\nOriginal error: ${raw}`,
    errorSearchFailed: "Search failed",
  },

  // ── Pipeline Modal ────────────────────────────────────────────────────
  pipeline: {
    modalTitle: "Aggregation Pipeline",
    closeBtn: "Close",
    compassHint: "Paste into MongoDB Compass → Aggregations tab, or run in mongosh with",
    compassCmd: "db.restaurant.aggregate(pipeline)",
    compassSuffix: "",
    modeLabel: {
      keyword: "Text Search ($search)",
      vector: "Vector Search ($vectorSearch)",
      hybrid: "Hybrid Search ($rankFusion)",
    },
    modeDesc: {
      keyword:
        "Uses the Atlas Search $search stage to perform full-text search on the embedding_text field, ranked by searchScore.",
      vector:
        "Uses the Atlas Vector Search $vectorSearch stage with Auto-Embedding to automatically convert the query string into a vector for semantic search.",
      hybrid:
        "Uses the $rankFusion stage to run both Text Search and Vector Search pipelines simultaneously, fusing rankings with Reciprocal Rank Fusion (RRF). Requires MongoDB 8.0+.",
    },
  },

  // ── SearchResultCard ──────────────────────────────────────────────────
  resultCard: {
    noName: "(No name)",
    labelName: "Name",
    labelDesc: "Description",
    labelAddr: "Address",
    noLocation: "No location.coordinates in this record",
    viewRaw: "{ } View JSON Raw Data",
    rawModalDesc: "Full JSON document returned by the backend, including all fields and scores.",
    closeAriaLabel: "Close",
  },

  // ── AppShell ──────────────────────────────────────────────────────────
  appShell: {
    loading: "Loading...",
  },
};

export default en;
