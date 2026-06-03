"use client";

import { useState } from "react";
import { apiIndexCheck, IndexCheckResult } from "@/lib/api";
import { COOKIE_KEYS, getCookie } from "@/lib/cookies";

export default function IndexCheckSection({
  unlocked,
  onReady,
}: {
  unlocked: boolean;
  onReady?: (ready: boolean) => void;
}) {
  const [result, setResult] = useState<IndexCheckResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setError("");
    setResult(null);

    const enc = getCookie(COOKIE_KEYS.encMongoUrl);
    if (!enc) {
      setError("找不到連線資訊,請先完成「設定」步驟");
      return;
    }

    setLoading(true);
    try {
      const r = await apiIndexCheck(enc);
      setResult(r);
      // 只有兩個 index 皆可用(r.ok)才視為環境就緒
      onReady?.(r.ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Index 檢查失敗");
      onReady?.(false);
    } finally {
      setLoading(false);
    }
  };

  const renderRow = (label: string, info: IndexCheckResult["vector_index"]) => {
    // 三種狀態:可用 / 建置中(已建立但未就緒) / 未建立
    let badgeClass = "missing";
    let badgeText = "未建立";
    if (info.usable) {
      badgeClass = "ok";
      badgeText = "可用";
    } else if (info.exists) {
      badgeClass = "building";
      badgeText = "建置中";
    }
    return (
      <div className="index-row" key={info.name}>
        <div className="meta">
          <span className="name">{info.name}</span>
          <span className="sub">
            {label}
            {info.status ? ` · 狀態: ${info.status}` : ""}
            {info.exists ? ` · queryable: ${info.queryable ? "是" : "否"}` : ""}
          </span>
        </div>
        <span className={`badge ${badgeClass}`}>{badgeText}</span>
      </div>
    );
  };

  return (
    <div className={`card${unlocked ? "" : " locked"}`}>
      <h2>
        <span>&#128270;</span> Index 檢查
      </h2>
      <p className="card-desc">
        檢查 workshop.restaurant collection 是否建立 Vector Index
        (restaurant_auto_index) 與 Search Index (restaurant_sindex),且兩者皆需為
        「可用(可查詢)」狀態才算通過。
      </p>

      {error && <div className="alert error">{error}</div>}

      {result && (
        <>
          <div className={`alert ${result.ok ? "success" : "info"}`}>
            {result.message}
          </div>
          {renderRow("Vector Index", result.vector_index)}
          {renderRow("Search Index", result.search_index)}
          {!result.ok &&
            (result.vector_index.exists || result.search_index.exists) && (
              <p className="section-hint">
                若 Index 顯示「建置中」,請稍候片刻後再次按下「檢查 Index」。
              </p>
            )}
        </>
      )}

      <button
        className="btn"
        onClick={handleCheck}
        disabled={!unlocked || loading}
        style={{ marginTop: 8 }}
      >
        {loading ? <span className="spinner" /> : "檢查 Index"}
      </button>

      {!unlocked && (
        <p className="section-hint">請先完成「資料導入」步驟。</p>
      )}
    </div>
  );
}
