"use client";

import { useState } from "react";
import { apiIndexCheck, IndexCheckResult } from "@/lib/api";
import { COOKIE_KEYS, getCookie } from "@/lib/cookies";
import { useLocale } from "@/lib/i18n";

export default function IndexCheckSection({
  unlocked,
  onReady,
}: {
  unlocked: boolean;
  onReady?: (ready: boolean) => void;
}) {
  const { t } = useLocale();
  const [result, setResult] = useState<IndexCheckResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setError("");
    setResult(null);

    const enc = getCookie(COOKIE_KEYS.encMongoUrl);
    if (!enc) {
      setError(t.indexSection.errorNoConn);
      return;
    }

    setLoading(true);
    try {
      const r = await apiIndexCheck(enc);
      setResult(r);
      onReady?.(r.ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.indexSection.errorCheckFailed);
      onReady?.(false);
    } finally {
      setLoading(false);
    }
  };

  const renderRow = (label: string, info: IndexCheckResult["vector_index"]) => {
    let badgeClass: string = "missing";
    let badgeText = t.indexSection.badgeMissing;
    if (info.usable) {
      badgeClass = "ok";
      badgeText = t.indexSection.badgeOk;
    } else if (info.exists) {
      badgeClass = "building";
      badgeText = t.indexSection.badgeBuilding;
    }
    return (
      <div className="index-row" key={info.name}>
        <div className="meta">
          <span className="name">{info.name}</span>
          <span className="sub">
            {label}
            {info.status ? ` · ${t.indexSection.statusPrefix}${info.status}` : ""}
            {info.exists
              ? ` · queryable: ${info.queryable ? t.indexSection.queryableYes : t.indexSection.queryableNo}`
              : ""}
          </span>
        </div>
        <span className={`badge ${badgeClass}`}>{badgeText}</span>
      </div>
    );
  };

  return (
    <div className={`card${unlocked ? "" : " locked"}`}>
      <h2>
        <span>&#128270;</span> {t.indexSection.title}
      </h2>
      <p className="card-desc">{t.indexSection.desc}</p>

      {error && <div className="alert error">{error}</div>}

      {result && (
        <>
          <div className={`alert ${result.ok ? "success" : "info"}`}>
            {result.message}
          </div>
          {renderRow(t.indexSection.labelVector, result.vector_index)}
          {renderRow(t.indexSection.labelSearch, result.search_index)}
          {!result.ok &&
            (result.vector_index.exists || result.search_index.exists) && (
              <p className="section-hint">{t.indexSection.hintBuilding}</p>
            )}
        </>
      )}

      <button
        className="btn"
        onClick={handleCheck}
        disabled={!unlocked || loading}
        style={{ marginTop: 8 }}
      >
        {loading ? <span className="spinner" /> : t.indexSection.btnCheck}
      </button>

      {!unlocked && (
        <p className="section-hint">{t.indexSection.hintUnlocked}</p>
      )}
    </div>
  );
}
