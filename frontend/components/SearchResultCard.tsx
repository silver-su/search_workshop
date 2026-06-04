"use client";

import { useState, useCallback } from "react";
import { SearchDoc } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

function extractLatLng(doc: SearchDoc): { lat: number; lng: number } | null {
  const loc = doc["location"] as { coordinates?: unknown } | undefined | null;
  const coords = loc?.coordinates;
  if (
    Array.isArray(coords) &&
    coords.length >= 2 &&
    typeof coords[0] === "number" &&
    typeof coords[1] === "number"
  ) {
    return { lng: coords[0] as number, lat: coords[1] as number };
  }
  return null;
}

// ── CopyButton ────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
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
      className={`copy-btn${copied ? " copied" : ""}`}
      onClick={handleCopy}
    >
      {copied ? t.common.copied : t.common.copy}
    </button>
  );
}

// ── RawDataModal ──────────────────────────────────────────────────────────
function RawDataModal({
  doc,
  name,
  rank,
  onClose,
}: {
  doc: SearchDoc;
  name: string;
  rank: number;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const rawJson = JSON.stringify(doc, null, 2);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">
            #{rank} {name} — JSON Raw Data
          </span>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label={t.resultCard.closeAriaLabel}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p className="pipeline-desc">{t.resultCard.rawModalDesc}</p>
          <div className="code-block-wrap">
            <CopyButton text={rawJson} />
            <pre>{rawJson}</pre>
          </div>
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

// ── SearchResultCard ──────────────────────────────────────────────────────
export default function SearchResultCard({
  doc,
  rank,
  isHybrid = false,
}: {
  doc: SearchDoc;
  rank: number;
  isHybrid?: boolean;
}) {
  const { t } = useLocale();
  const [showRaw, setShowRaw] = useState(false);

  const latlng = extractLatLng(doc);
  const name = (doc["name"] as string) || t.resultCard.noName;
  const description = (doc["description"] as string) || "";
  const add = (doc["add"] as string) || "";

  const score = doc._score;
  const rerankScore = doc._rerank_score;
  const textScore = doc._text_score;
  const vectorScore = doc._vector_score;
  const textRank = doc._text_rank;
  const vectorRank = doc._vector_rank;

  const mapSrc = latlng
    ? `https://maps.google.com/maps?q=${latlng.lat},${latlng.lng}&z=15&output=embed`
    : null;

  return (
    <>
      <div className="result-card">
        <div className="result-header">
          <span className="result-rank">#{rank}</span>
          <span className="result-name">{name}</span>
          <span className="result-scores">
            {isHybrid ? (
              <>
                {typeof textScore === "number" ? (
                  <span className="score-badge text">
                    Text: {textScore.toFixed(4)}
                  </span>
                ) : typeof textRank === "number" ? (
                  <span className="score-badge text">Text rank: {textRank}</span>
                ) : (
                  <span className="score-badge muted-badge">Text: —</span>
                )}
                {typeof vectorScore === "number" ? (
                  <span className="score-badge vector">
                    Vector: {vectorScore.toFixed(4)}
                  </span>
                ) : typeof vectorRank === "number" ? (
                  <span className="score-badge vector">
                    Vector rank: {vectorRank}
                  </span>
                ) : (
                  <span className="score-badge muted-badge">Vector: —</span>
                )}
                {typeof score === "number" && (
                  <span className="score-badge">RRF: {score.toFixed(4)}</span>
                )}
              </>
            ) : (
              typeof score === "number" && (
                <span className="score-badge">score: {score.toFixed(4)}</span>
              )
            )}
            {typeof rerankScore === "number" && (
              <span className="score-badge rerank">
                rerank: {rerankScore.toFixed(4)}
              </span>
            )}
          </span>
        </div>

        <div className="result-body">
          <div className="result-fields">
            <div className="result-field">
              <span className="field-label">{t.resultCard.labelName}</span>
              <span className="field-value">{name}</span>
            </div>
            <div className="result-field">
              <span className="field-label">{t.resultCard.labelDesc}</span>
              <span className="field-value">{description || "—"}</span>
            </div>
            <div className="result-field">
              <span className="field-label">{t.resultCard.labelAddr}</span>
              <span className="field-value">{add || "—"}</span>
            </div>
          </div>

          <div className="result-map">
            {mapSrc ? (
              <iframe
                title={`map-${rank}`}
                src={mapSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="map-missing">{t.resultCard.noLocation}</div>
            )}
          </div>
        </div>

        <div className="result-footer">
          <button className="btn-ghost sm" onClick={() => setShowRaw(true)}>
            {t.resultCard.viewRaw}
          </button>
        </div>
      </div>

      {showRaw && (
        <RawDataModal
          doc={doc}
          name={name}
          rank={rank}
          onClose={() => setShowRaw(false)}
        />
      )}
    </>
  );
}
