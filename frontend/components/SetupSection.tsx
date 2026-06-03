"use client";

import { useEffect, useState } from "react";
import { apiSetup } from "@/lib/api";
import { b64DecodeUtf8, COOKIE_KEYS, getCookie, setCookie } from "@/lib/cookies";

export default function SetupSection({
  onSaved,
}: {
  onSaved: (encMongoUrl: string) => void;
}) {
  const [mongoUrl, setMongoUrl] = useState("");
  const [voyageKey, setVoyageKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // 進入頁面時優先檢查 cookie 是否已存設定資訊,有則自動帶入(解密後填入欄位)
  useEffect(() => {
    const encMongo = getCookie(COOKIE_KEYS.encMongoUrl);
    const encVoyage = getCookie(COOKIE_KEYS.encVoyageKey);

    let didPrefill = false;
    if (encMongo) {
      const url = b64DecodeUtf8(encMongo);
      if (url) {
        setMongoUrl(url);
        didPrefill = true;
      }
    }
    if (encVoyage) {
      const key = b64DecodeUtf8(encVoyage);
      if (key) {
        setVoyageKey(key);
        didPrefill = true;
      }
    }
    if (didPrefill) {
      setPrefilled(true);
    }
  }, []);

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (!mongoUrl.trim() || !voyageKey.trim()) {
      setError("請完整輸入 MongoDB Atlas URL 與 VoyageAI API Key");
      return;
    }
    setLoading(true);
    const result = await apiSetup(mongoUrl.trim(), voyageKey.trim());
    setLoading(false);

    if (result.ok && result.enc_mongodb_url) {
      // 寫入 base64 加密後的 cookie
      setCookie(COOKIE_KEYS.encMongoUrl, result.enc_mongodb_url);
      if (result.enc_voyage_api_key) {
        setCookie(COOKIE_KEYS.encVoyageKey, result.enc_voyage_api_key);
      }
      setSuccess(result.message + "(連線資訊已加密儲存於瀏覽器 cookie)");
      onSaved(result.enc_mongodb_url);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="card">
      <h2>
        <span>&#9881;&#65039;</span> 設定
      </h2>
      <p className="card-desc">
        請輸入您自己的環境資訊。儲存時系統會檢查 MongoDB Atlas 連線是否成功。
      </p>

      {prefilled && !success && (
        <div className="alert info">
          已自動帶入您先前儲存於瀏覽器的設定資訊,可直接儲存或修改後重新儲存。
        </div>
      )}
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="field">
        <label htmlFor="mongoUrl">MongoDB Atlas URL</label>
        <input
          id="mongoUrl"
          type="text"
          value={mongoUrl}
          onChange={(e) => setMongoUrl(e.target.value)}
          placeholder="mongodb+srv://user:password@cluster.mongodb.net/..."
        />
      </div>

      <div className="field">
        <label htmlFor="voyageKey">VoyageAI API Key</label>
        <input
          id="voyageKey"
          type="password"
          value={voyageKey}
          onChange={(e) => setVoyageKey(e.target.value)}
          placeholder="pa-..."
        />
      </div>

      <button className="btn" onClick={handleSave} disabled={loading}>
        {loading ? <span className="spinner" /> : "儲存"}
      </button>
    </div>
  );
}
