"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiLogin } from "@/lib/api";
import { COOKIE_KEYS, setCookie } from "@/lib/cookies";
import { useLocale, LOCALES } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useLocale();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code.trim()) {
      setError(t.login.errorEmpty);
      return;
    }
    setLoading(true);
    const result = await apiLogin(code.trim());
    setLoading(false);

    if (result.ok) {
      setCookie(COOKIE_KEYS.authed, "1");
      setCookie(COOKIE_KEYS.secretCode, code.trim());
      router.push("/setup");
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        {/* 語言切換 */}
        <div className="login-lang-switcher">
          {LOCALES.map((l) => (
            <button
              key={l.value}
              className={`lang-btn-login${locale === l.value ? " active" : ""}`}
              onClick={() => setLocale(l.value)}
              aria-pressed={locale === l.value}
            >
              {l.label}
            </button>
          ))}
        </div>

        <span className="leaf">&#127807;</span>
        <h1>{t.login.title}</h1>
        <p className="sub">{t.login.subtitle}</p>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="code">{t.login.codeLabel}</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t.login.codePlaceholder}
              autoFocus
            />
          </div>
          <button className="btn full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : t.login.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
