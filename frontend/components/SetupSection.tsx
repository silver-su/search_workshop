"use client";

import { useEffect, useState } from "react";
import { apiSetup } from "@/lib/api";
import { b64DecodeUtf8, COOKIE_KEYS, getCookie, setCookie } from "@/lib/cookies";
import { useLocale } from "@/lib/i18n";

export default function SetupSection({
  onSaved,
}: {
  onSaved: (encMongoUrl: string) => void;
}) {
  const { t } = useLocale();
  const [mongoUrl, setMongoUrl] = useState("");
  const [voyageKey, setVoyageKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // 進入頁面時優先檢查 cookie 是否已存設定資訊，有則自動帶入
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
      setError(t.setupSection.errorEmpty);
      return;
    }
    setLoading(true);
    const result = await apiSetup(mongoUrl.trim(), voyageKey.trim());
    setLoading(false);

    if (result.ok && result.enc_mongodb_url) {
      setCookie(COOKIE_KEYS.encMongoUrl, result.enc_mongodb_url);
      if (result.enc_voyage_api_key) {
        setCookie(COOKIE_KEYS.encVoyageKey, result.enc_voyage_api_key);
      }
      setSuccess(result.message + t.setupSection.successSuffix);
      onSaved(result.enc_mongodb_url);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="card">
      <h2>
        <span>&#9881;&#65039;</span> {t.setupSection.title}
      </h2>
      <p className="card-desc">{t.setupSection.desc}</p>

      {prefilled && !success && (
        <div className="alert info">{t.setupSection.prefilledInfo}</div>
      )}
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="field">
        <label htmlFor="mongoUrl">{t.setupSection.mongoUrlLabel}</label>
        <input
          id="mongoUrl"
          type="text"
          value={mongoUrl}
          onChange={(e) => setMongoUrl(e.target.value)}
          placeholder={t.setupSection.mongoUrlPlaceholder}
        />
      </div>

      <div className="field">
        <label htmlFor="voyageKey">{t.setupSection.voyageKeyLabel}</label>
        <input
          id="voyageKey"
          type="password"
          value={voyageKey}
          onChange={(e) => setVoyageKey(e.target.value)}
          placeholder={t.setupSection.voyageKeyPlaceholder}
        />
      </div>

      <button className="btn" onClick={handleSave} disabled={loading}>
        {loading ? <span className="spinner" /> : t.common.save}
      </button>
    </div>
  );
}
