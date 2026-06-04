// 後端 API client
import { COOKIE_KEYS } from "@/lib/cookies";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

// 從 cookie 讀取已登入的 secret code(瀏覽器端)
function readSecretCode(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_KEYS.secretCode}=`));
  if (!match) return "";
  return decodeURIComponent(match.split("=").slice(1).join("="));
}

// 建立帶有 secret code 的 request headers,供受保護的 API 使用
function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Secret-Code": readSecretCode(),
  };
}

export interface LoginResult {
  ok: boolean;
  message: string;
}

export async function apiLogin(code: string): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, message: data.detail || "登入失敗" };
  }
  return { ok: true, message: data.message };
}

export interface SetupResult {
  ok: boolean;
  message: string;
  enc_mongodb_url?: string | null;
  enc_voyage_api_key?: string | null;
}

export async function apiSetup(
  mongodb_url: string,
  voyage_api_key: string
): Promise<SetupResult> {
  const res = await fetch(`${API_BASE}/api/setup`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ mongodb_url, voyage_api_key }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, message: data.detail || "設定失敗" };
  }
  return data as SetupResult;
}

export interface ImportCheckResult {
  exists: boolean;
  count: number;
}

// 導入前檢查 workshop.restaurant 是否已有資料
export async function apiImportCheck(
  enc_mongodb_url: string
): Promise<ImportCheckResult> {
  const res = await fetch(`${API_BASE}/api/import-check`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ enc_mongodb_url }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "檢查現有資料失敗");
  }
  return data as ImportCheckResult;
}

export interface ImportEvent {
  type: "progress" | "done" | "error" | "needs_confirm";
  inserted?: number;
  total?: number;
  percent?: number;
  ok?: boolean;
  message?: string;
  count?: number;
}

// 透過 SSE 串流接收導入進度;force=true 代表確認清空後重新導入
export async function apiImport(
  enc_mongodb_url: string,
  onEvent: (e: ImportEvent) => void,
  force = false
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/import`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ enc_mongodb_url, force }),
  });

  if (!res.ok || !res.body) {
    let msg = "資料導入請求失敗";
    try {
      const data = await res.json();
      msg = data.detail || msg;
    } catch {
      /* ignore */
    }
    onEvent({ type: "error", message: msg });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const json = line.slice(5).trim();
      try {
        onEvent(JSON.parse(json) as ImportEvent);
      } catch {
        /* ignore parse errors */
      }
    }
  }
}

export interface IndexInfo {
  name: string;
  exists: boolean;
  type?: string | null;
  status?: string | null;
  queryable: boolean;
  usable: boolean;
}

export interface IndexCheckResult {
  ok: boolean;
  message: string;
  vector_index: IndexInfo;
  search_index: IndexInfo;
}

export async function apiIndexCheck(
  enc_mongodb_url: string
): Promise<IndexCheckResult> {
  const res = await fetch(`${API_BASE}/api/index-check`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ enc_mongodb_url }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Index 檢查失敗");
  }
  return data as IndexCheckResult;
}

// ---------- Text & Vector Search ----------
export type SearchMode = "keyword" | "vector" | "hybrid";

export interface SearchParams {
  enc_mongodb_url: string;
  enc_voyage_api_key?: string | null;
  query: string;
  mode: SearchMode;
  model?: string | null;
  use_reranker: boolean;
  limit?: number | null;
  num_candidates?: number | null;
}

// 一筆結果(已精簡為 name/description/add/location),額外帶分數
export type SearchDoc = Record<string, unknown> & {
  _score?: number | null;
  _rerank_score?: number | null;
  // Hybrid Search 時各 pipeline 的原始分數 / 排名
  _text_score?: number | null;
  _vector_score?: number | null;
  _text_rank?: number | null;
  _vector_rank?: number | null;
};

export interface SearchTimings {
  search_ms?: number;
  rerank_ms?: number;
}

export interface SearchResult {
  ok: boolean;
  message?: string | null;
  mode?: string | null;
  model?: string | null;
  reranked: boolean;
  results: SearchDoc[];
  timings?: SearchTimings;
}

export async function apiSearch(params: SearchParams): Promise<SearchResult> {
  const res = await fetch(`${API_BASE}/api/search`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "搜尋失敗");
  }
  return data as SearchResult;
}
