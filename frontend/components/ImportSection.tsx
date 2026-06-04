"use client";

import { useState } from "react";
import { apiImport, apiImportCheck, ImportEvent } from "@/lib/api";
import { COOKIE_KEYS, getCookie } from "@/lib/cookies";
import { useLocale } from "@/lib/i18n";

export default function ImportSection({
  unlocked,
  onDone,
}: {
  unlocked: boolean;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const [percent, setPercent] = useState(0);
  const [inserted, setInserted] = useState(0);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmCount, setConfirmCount] = useState<number | null>(null);

  const getEnc = (): string | null => {
    const enc = getCookie(COOKIE_KEYS.encMongoUrl);
    if (!enc) {
      setError(t.importSection.errorNoConn);
      return null;
    }
    return enc;
  };

  const runImport = async (enc: string, force: boolean) => {
    setError("");
    setSuccess("");
    setConfirmCount(null);
    setPercent(0);
    setInserted(0);
    setTotal(0);

    setRunning(true);
    await apiImport(
      enc,
      (e: ImportEvent) => {
        if (e.type === "progress") {
          setPercent(e.percent ?? 0);
          setInserted(e.inserted ?? 0);
          setTotal(e.total ?? 0);
        } else if (e.type === "needs_confirm") {
          setConfirmCount(e.count ?? 0);
        } else if (e.type === "done") {
          if (e.ok) {
            setPercent(100);
            setSuccess(e.message || t.importSection.errorImportFailed);
            onDone();
          } else {
            setError(e.message || t.importSection.errorImportFailed);
          }
        } else if (e.type === "error") {
          setError(e.message || t.importSection.errorImportError);
        }
      },
      force
    );
    setRunning(false);
  };

  const handleImport = async () => {
    setError("");
    setSuccess("");
    setConfirmCount(null);

    const enc = getEnc();
    if (!enc) return;

    setChecking(true);
    try {
      const check = await apiImportCheck(enc);
      if (check.exists && check.count > 0) {
        setConfirmCount(check.count);
        return;
      }
      await runImport(enc, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.importSection.errorCheckFailed);
    } finally {
      setChecking(false);
    }
  };

  const handleConfirmClear = async () => {
    const enc = getEnc();
    if (!enc) return;
    await runImport(enc, true);
  };

  const handleCancelClear = () => {
    setConfirmCount(null);
    setSuccess(t.importSection.successKeepExisting);
    onDone();
  };

  return (
    <div className={`card${unlocked ? "" : " locked"}`}>
      <h2>
        <span>&#128229;</span> {t.importSection.title}
      </h2>
      <p className="card-desc">{t.importSection.desc}</p>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {confirmCount !== null && (
        <div className="alert info">
          <p style={{ marginBottom: 12 }}>
            {t.importSection.confirmMsg(confirmCount)}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn"
              onClick={handleConfirmClear}
              disabled={running}
            >
              {running ? <span className="spinner" /> : t.importSection.btnClearAndImport}
            </button>
            <button
              className="btn secondary"
              onClick={handleCancelClear}
              disabled={running}
            >
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}

      {(running || percent > 0) && (
        <div style={{ marginBottom: 16 }}>
          <div className="progress-label">
            <span>{t.importSection.progressLabel}</span>
            <span>
              {inserted}
              {total ? ` / ${total}` : ""} ({percent}%)
            </span>
          </div>
          <div className="progress">
            <div className="bar" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {confirmCount === null && (
        <button
          className="btn"
          onClick={handleImport}
          disabled={!unlocked || running || checking}
        >
          {checking || running ? <span className="spinner" /> : t.importSection.btnImport}
        </button>
      )}

      {!unlocked && (
        <p className="section-hint">{t.importSection.hintUnlocked}</p>
      )}
    </div>
  );
}
