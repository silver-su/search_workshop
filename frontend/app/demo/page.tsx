"use client";

import { useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import SearchResultCard from "@/components/SearchResultCard";
import { apiSearch, SearchDoc, SearchMode, SearchTimings } from "@/lib/api";
import { COOKIE_KEYS, getCookie } from "@/lib/cookies";
import { useLocale } from "@/lib/i18n";

type RunMode = "keyword" | "vector-4" | "vector-4-lite" | "hybrid";

const VECTOR_MODELS: Record<string, { mode: SearchMode; model: string }> = {
  "vector-4": { mode: "vector", model: "voyage-4" },
  "vector-4-lite": { mode: "vector", model: "voyage-4-lite" },
};

const SEARCH_TIME_LABEL: Record<SearchMode, string> = {
  keyword: "Text Search",
  vector: "Vector Search",
  hybrid: "Hybrid Search",
};

const DEFAULT_LIMIT = 10;
const DEFAULT_NUM_CANDIDATES = 100;

// ── 根據搜尋模式 + query 產生對應的 Aggregation Pipeline ──────────────────
function buildPipeline(
  mode: SearchMode,
  query: string,
  limit: number,
  model: string | null = null,
  numCandidates: number = DEFAULT_NUM_CANDIDATES,
): object[] {
  if (mode === "keyword") {
    return [
      {
        $search: {
          index: "restaurant_sindex",
          text: { query, path: "embedding_text" },
        },
      },
      { $limit: limit },
      { $addFields: { _score: { $meta: "searchScore" } } },
      { $project: { name: 1, description: 1, add: 1, location: 1, _score: 1 } },
    ];
  }

  const vectorSearchStage: Record<string, unknown> = {
    index: "restaurant_auto_index",
    path: "embedding_text",
    query,
    limit,
    numCandidates,
  };
  if (model) vectorSearchStage["model"] = model;

  if (mode === "vector") {
    return [
      { $vectorSearch: vectorSearchStage },
      { $addFields: { _score: { $meta: "vectorSearchScore" } } },
      { $project: { name: 1, description: 1, add: 1, location: 1, _score: 1 } },
    ];
  }

  // hybrid
  return [
    {
      $rankFusion: {
        input: {
          pipelines: {
            vectorPipeline: [{ $vectorSearch: vectorSearchStage }],
            textPipeline: [
              {
                $search: {
                  index: "restaurant_sindex",
                  text: { query, path: "embedding_text" },
                },
              },
              { $limit: limit },
            ],
          },
        },
        combination: { weights: { vectorPipeline: 1, textPipeline: 1 } },
        scoreDetails: true,
      },
    },
    { $limit: limit },
    {
      $addFields: {
        _score: { $meta: "score" },
        _score_details: { $meta: "scoreDetails" },
      },
    },
    {
      $project: {
        name: 1, description: 1, add: 1, location: 1,
        _score: 1, _score_details: 1,
      },
    },
  ];
}

// ── CopyButton ────────────────────────────────────────────────────────────
function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <button
      className={`copy-btn${copied ? " copied" : ""}${className ? " " + className : ""}`}
      onClick={handleCopy}
    >
      {copied ? t.common.copied : t.common.copy}
    </button>
  );
}

// ── PipelineModal ─────────────────────────────────────────────────────────
function PipelineModal({
  mode,
  query,
  limit,
  model,
  numCandidates,
  onClose,
}: {
  mode: SearchMode;
  query: string;
  limit: number;
  model: string | null;
  numCandidates: number;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const pipeline = buildPipeline(mode, query, limit, model, numCandidates);
  const pipelineJson = JSON.stringify(pipeline, null, 2);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{t.pipeline.modalTitle}</span>
          <span className="pipeline-mode-chip">{t.pipeline.modeLabel[mode]}</span>
          <button className="modal-close" onClick={onClose} aria-label={t.common.close}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p className="pipeline-desc">{t.pipeline.modeDesc[mode]}</p>
          <div className="code-block-wrap">
            <CopyButton text={pipelineJson} />
            <pre>{pipelineJson}</pre>
          </div>
          <p className="muted" style={{ marginTop: 14, fontSize: 12 }}>
            💡 {t.pipeline.compassHint}{" "}
            <code style={{ background: "#f0f0f0", padding: "1px 5px", borderRadius: 4 }}>
              {t.pipeline.compassCmd}
            </code>
            {t.pipeline.compassSuffix && <> {t.pipeline.compassSuffix}</>}
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn secondary" onClick={onClose}>
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DemoPage ──────────────────────────────────────────────────────────────
export default function DemoPage() {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [useReranker, setUseReranker] = useState(false);
  const [loading, setLoading] = useState<RunMode | null>(null);
  const [error, setError] = useState("");
  const [results, setResults] = useState<SearchDoc[]>([]);
  const [info, setInfo] = useState("");
  const [timings, setTimings] = useState<SearchTimings | null>(null);
  const [resultMode, setResultMode] = useState<SearchMode | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [lastModel, setLastModel] = useState<string | null>(null);
  const [showPipeline, setShowPipeline] = useState(false);
  const [limitInput, setLimitInput] = useState(DEFAULT_LIMIT);
  const [numCandidatesInput, setNumCandidatesInput] = useState(DEFAULT_NUM_CANDIDATES);

  const runSearch = async (runMode: RunMode) => {
    setError("");
    setInfo("");
    setResults([]);
    setTimings(null);
    setResultMode(null);
    setShowPipeline(false);

    const trimmed = query.trim();
    if (!trimmed) {
      setError(t.demo.errorEmpty);
      return;
    }

    const encMongo = getCookie(COOKIE_KEYS.encMongoUrl);
    if (!encMongo) {
      setError(t.demo.errorNoConn);
      return;
    }
    const encVoyage = getCookie(COOKIE_KEYS.encVoyageKey);
    if (useReranker && !encVoyage) {
      setError(t.demo.errorNoVoyage);
      return;
    }

    // numCandidates 只對 Vector / Hybrid 有意義，在這兩種模式下才做檢查
    if (runMode !== "keyword" && numCandidatesInput < limitInput) {
      setError(t.demo.errorNumCandidates);
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
        limit: limitInput,
        num_candidates: numCandidatesInput,
      });
      setResults(res.results);
      setResultMode(mode);
      setLastQuery(trimmed);
      setLastModel(model);
      setTimings(res.timings ?? null);

      let modeLabel: string;
      if (runMode === "keyword") {
        modeLabel = t.demo.modeLabelKeyword;
      } else if (runMode === "hybrid") {
        modeLabel = t.demo.modeLabelHybrid;
      } else {
        modeLabel = t.demo.modeLabelVector(model!);
      }
      const rerankerPart = res.reranked ? t.demo.rerankerSuffix : "";
      setInfo(t.demo.resultCount(modeLabel + rerankerPart, res.results.length));
    } catch (e) {
      const raw = e instanceof Error ? e.message : t.demo.errorSearchFailed;
      if (
        useReranker &&
        (raw.includes("403") ||
          raw.includes("401") ||
          raw.includes("授權") ||
          raw.includes("Forbidden"))
      ) {
        setError(t.demo.errorRerankerAuth(raw));
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
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>{t.demo.title}</h1>
      <p className="muted" style={{ marginBottom: 24 }}>{t.demo.subtitle}</p>

      <div className="card">
        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="query">{t.demo.queryLabel}</label>
          <input
            id="query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}

            placeholder={t.demo.queryPlaceholder}
          />
        </div>

        <div className="search-actions">
          <button className="btn" onClick={() => runSearch("keyword")} disabled={busy}>
            {loading === "keyword" ? <span className="spinner" /> : t.demo.btnKeyword}
          </button>
          <button className="btn" onClick={() => runSearch("vector-4")} disabled={busy}>
            {loading === "vector-4" ? <span className="spinner" /> : t.demo.btnVectorV4}
          </button>
          <button className="btn" onClick={() => runSearch("vector-4-lite")} disabled={busy}>
            {loading === "vector-4-lite" ? <span className="spinner" /> : t.demo.btnVectorV4Lite}
          </button>
          <button className="btn" onClick={() => runSearch("hybrid")} disabled={busy}>
            {loading === "hybrid" ? <span className="spinner" /> : t.demo.btnHybrid}
          </button>
        </div>

        <label className="reranker-toggle">
          <input
            type="checkbox"
            checked={useReranker}
            onChange={(e) => setUseReranker(e.target.checked)}
          />
          <span>{t.demo.rerankerLabel}</span>
        </label>

        {/* ── 搜尋參數 ── */}
        <div className="search-params-row">
          <div className="search-param-field">
            <label htmlFor="limitInput">{t.demo.limitLabel}</label>
            <input
              id="limitInput"
              type="number"
              min={1}
              max={100}
              value={limitInput}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 1 && v <= 100) setLimitInput(v);
              }}
            />
            <span className="param-hint">{t.demo.limitHint}</span>
          </div>
          <div className="search-param-field">
            <label htmlFor="numCandidatesInput">{t.demo.numCandidatesLabel}</label>
            <input
              id="numCandidatesInput"
              type="number"
              min={1}
              max={10000}
              value={numCandidatesInput}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 1) setNumCandidatesInput(v);
              }}
            />
            <span className="param-hint">{t.demo.numCandidatesHint}</span>
          </div>
        </div>

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
              {t.demo.timingSearch(SEARCH_TIME_LABEL[resultMode])}
              <strong> {timings.search_ms?.toFixed(1) ?? "-"} ms</strong>
            </span>
            {typeof timings.rerank_ms === "number" && (
              <span className="timing-chip rerank">
                {t.demo.timingRerank}
                <strong> {timings.rerank_ms.toFixed(1)} ms</strong>
              </span>
            )}
          </div>
        )}

        {resultMode && lastQuery && !error && (
          <div className="pipeline-trigger-bar">
            <button className="btn-ghost" onClick={() => setShowPipeline(true)}>
              <span>{"< >"}</span>
              {t.demo.pipelineBtn}
            </button>
            <span className="muted" style={{ fontSize: 12 }}>
              {t.demo.pipelineHint}
            </span>
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

      {showPipeline && resultMode && (
        <PipelineModal
          mode={resultMode}
          query={lastQuery}
          limit={limitInput}
          model={lastModel}
          numCandidates={numCandidatesInput}
          onClose={() => setShowPipeline(false)}
        />
      )}
    </AppShell>
  );
}
