"use client";

import { useState } from "react";
import { apiImport, apiImportCheck, ImportEvent } from "@/lib/api";
import { COOKIE_KEYS, getCookie } from "@/lib/cookies";

export default function ImportSection({
  unlocked,
  onDone,
}: {
  unlocked: boolean;
  onDone: () => void;
}) {
  const [percent, setPercent] = useState(0);
  const [inserted, setInserted] = useState(0);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // 既有資料需清空確認:null 代表不需確認,number 代表現有筆數
  const [confirmCount, setConfirmCount] = useState<number | null>(null);

  const getEnc = (): string | null => {
    const enc = getCookie(COOKIE_KEYS.encMongoUrl);
    if (!enc) {
      setError("找不到連線資訊,請先完成「設定」步驟");
      return null;
    }
    return enc;
  };

  // 實際執行導入(force 由是否確認清空決定)
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
          // 後端再次確認到既有資料,顯示清空確認提示
          setConfirmCount(e.count ?? 0);
        } else if (e.type === "done") {
          if (e.ok) {
            setPercent(100);
            setSuccess(e.message || "載入成功");
            onDone();
          } else {
            setError(e.message || "載入失敗,請使用者重新按下資料導入按鈕");
          }
        } else if (e.type === "error") {
          setError(e.message || "資料導入發生錯誤");
        }
      },
      force
    );
    setRunning(false);
  };

  // 按下「資料導入」:先檢查現有資料
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
        // 已有資料 → 詢問是否清空
        setConfirmCount(check.count);
        return;
      }
      // collection 不存在或為空 → 直接導入
      await runImport(enc, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "檢查現有資料失敗");
    } finally {
      setChecking(false);
    }
  };

  // 確認清空後重新導入
  const handleConfirmClear = async () => {
    const enc = getEnc();
    if (!enc) return;
    await runImport(enc, true);
  };

  const handleCancelClear = () => {
    setConfirmCount(null);
    // 取消覆蓋 = 沿用既有資料,視為資料導入已就緒,解鎖 Index 檢查
    setSuccess("已保留既有資料,可繼續進行 Index 檢查。");
    onDone();
  };

  return (
    <div className={`card${unlocked ? "" : " locked"}`}>
      <h2>
        <span>&#128229;</span> 資料導入
      </h2>
      <p className="card-desc">
        將專案中的 restaurant.json 寫入您 Atlas 的 workshop.restaurant
        collection,完成後會自動驗證筆數(需為 4292 筆)。導入前會先檢查 collection
        是否已有資料。
      </p>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {confirmCount !== null && (
        <div className="alert info">
          <p style={{ marginBottom: 12 }}>
            workshop.restaurant collection 已經有資料(目前 {confirmCount}{" "}
            筆),是否清空?
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn"
              onClick={handleConfirmClear}
              disabled={running}
            >
              {running ? <span className="spinner" /> : "清空並重新導入"}
            </button>
            <button
              className="btn secondary"
              onClick={handleCancelClear}
              disabled={running}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {(running || percent > 0) && (
        <div style={{ marginBottom: 16 }}>
          <div className="progress-label">
            <span>導入進度</span>
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
          {checking || running ? <span className="spinner" /> : "資料導入"}
        </button>
      )}

      {!unlocked && (
        <p className="section-hint">請先在「設定」步驟成功儲存連線資訊。</p>
      )}
    </div>
  );
}
