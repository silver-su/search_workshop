"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import SearchResultCard from "@/components/SearchResultCard";
import { apiSearch, SearchDoc, SearchMode, SearchTimings } from "@/lib/api";
import { COOKIE_KEYS, getCookie } from "@/lib/cookies";

type RunMode = "keyword" | "vector-4" | "vector-4-lite" | "hybrid";

const VECTOR_MODELS: Record<string, { mode: SearchMode; model: string }> = {
  "vector-4": { mode: "vector", model: "voyage-4" },
  "vector-4-lite": { mode: "vector", model: "voyage-4-lite" },
};

// 各搜尋類型的耗時標籤
const SEARCH_TIME_LABEL: Record<SearchMode, string> = {
  keyword: "Text Search",
  vector: "Vector Search",
  hybrid: "Hybrid Search",
};

export default function DemoPage() {
  const [query, setQuery] = useState("");
  const [useReranker, setUseReranker] = useState(false);
  const [loading, setLoading] = useState<RunMode | null>(null);
  const [error, setError] = useState("");
  const [results, setResults] = useState<SearchDoc[]>([]);
  const [info, setInfo] = useState("");
  const [timings, setTimings] = useState<SearchTimings | null>(null);
  const [resultMode, setResultMode] = useState<SearchMode | null>(null);

  const runSearch = async (runMode: RunMode) => {
    setError("");
    setInfo("");
    setResults([]);
    setTimings(null);
    setResultMode(null);

    const trimmed = query.trim();
    if (!trimmed) {
      setError("請輸入查詢語句");
      return;
    }

    const encMongo = getCookie(COOKIE_KEYS.encMongoUrl);
    if (!encMongo) {
      setError("找不到連線資訊,請先到「環境設定」完成設定");
      return;
    }
    const encVoyage = getCookie(COOKIE_KEYS.encVoyageKey);
    if (useReranker && !encVoyage) {
      setError("啟用 Reranker 需要 VoyageAI API Key,請先到「環境設定」儲存");
      return;
    }

    let mode: SearchMode;
    let model: string | null = null;
    if (runMode === "keyword") {
      mode = "keyword";
    } else if (runMode === "hybrid") {
      mode = "hybrid";
    } else {
      mode = VECTOR_MODELS[runMode].mode;
      model = VECTOR_MODELS[runMode].model;
    }

    setLoading(runMode);
    try {
      const res = await apiSearch({
        enc_mongodb_url: encMongo,
        enc_voyage_api_key: encVoyage,
        query: trimmed,
        mode,
        model,
        use_reranker: useReranker,
      });
      setResults(res.results);
      setResultMode(mode);
      setTimings(res.timings ?? null);
      let modeLabel: string;
      if (runMode === "keyword") {
        modeLabel = "關鍵字搜尋";
      } else if (runMode === "hybrid") {
        modeLabel = "Hybrid Search ($rankFusion)";
      } else {
        modeLabel = `向量搜尋 (${model})`;
      }
      setInfo(
        `${modeLabel}${res.reranked ? " + Reranker (rerank-2.5)" : ""} · 共 ${
          res.results.length
        } 筆`
      );
    } catch (e) {
      const raw = e instanceof Error ? e.message : "搜尋失敗";
      // 針對 reranker 授權錯誤(401/403)顯示友善提示
      if (
        useReranker &&
        (raw.includes("403") ||
          raw.includes("401") ||
          raw.includes("授權") ||
          raw.includes("Forbidden"))
      ) {
        setError(
          "Reranker 授權失敗:VoyageAI 拒絕此 API Key。\n" +
            "請檢查:\n" +
            "1. VoyageAI 帳號是否已綁定付款方式或仍有免費額度\n" +
            "2. 該 API Key 是否為 active 且未被限制端點\n" +
            "3. 帳號是否有權使用 rerank-2.5 模型\n" +
            "確認後請至「環境設定」重新儲存 API Key。\n\n" +
            "原始訊息:" +
            raw
        );
      } else {
        setError(raw);
      }
    } finally {
      setLoading(null);
    }
  };

  const busy = loading !== null;

  return (
    <AppShell requireEnvReady>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>
        Text &amp; Vector Search Demo
      </h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        對 workshop.restaurant collection 進行關鍵字搜尋與向量搜尋,並可選擇啟用
        Reranker。
      </p>

      <div className="card">
        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="query">查詢語句</label>
          <input
            id="query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如:金門好吃的廣東粥"
          />
        </div>

        <div className="search-actions">
          <button
            className="btn"
            onClick={() => runSearch("keyword")}
            disabled={busy}
          >
            {loading === "keyword" ? <span className="spinner" /> : "關鍵字搜尋"}
          </button>
          <button
            className="btn"
            onClick={() => runSearch("vector-4")}
            disabled={busy}
          >
            {loading === "vector-4" ? (
              <span className="spinner" />
            ) : (
              "向量搜尋 (voyage-4)"
            )}
          </button>
          <button
            className="btn"
            onClick={() => runSearch("vector-4-lite")}
            disabled={busy}
          >
            {loading === "vector-4-lite" ? (
              <span className="spinner" />
            ) : (
              "向量搜尋 (voyage-4-lite)"
            )}
          </button>
          <button
            className="btn"
            onClick={() => runSearch("hybrid")}
            disabled={busy}
          >
            {loading === "hybrid" ? (
              <span className="spinner" />
            ) : (
              "Hybrid Search"
            )}
          </button>
        </div>

        <label className="reranker-toggle">
          <input
            type="checkbox"
            checked={useReranker}
            onChange={(e) => setUseReranker(e.target.checked)}
          />
          <span>啟用 Reranker(rerank-2.5)</span>
        </label>

        {error && (
          <div className="alert error" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}
        {info && !error && (
          <div className="alert info" style={{ marginTop: 16 }}>
            {info}
          </div>
        )}

        {timings && resultMode && !error && (
          <div className="timing-bar">
            <span className="timing-chip">
              {SEARCH_TIME_LABEL[resultMode]} 耗時:
              <strong>
                {" "}
                {timings.search_ms?.toFixed(1) ?? "-"} ms
              </strong>
            </span>
            {typeof timings.rerank_ms === "number" && (
              <span className="timing-chip rerank">
                Reranker 耗時:<strong> {timings.rerank_ms.toFixed(1)} ms</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="results-list">
          {results.map((doc, i) => (
            <SearchResultCard
              key={(doc["_id"] as string) || (doc["id"] as string) || i}
              doc={doc}
              rank={i + 1}
              isHybrid={resultMode === "hybrid"}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
