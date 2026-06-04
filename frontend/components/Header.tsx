"use client";

import { useRouter } from "next/navigation";
import { COOKIE_KEYS, deleteCookie } from "@/lib/cookies";
import { useLocale, LOCALES } from "@/lib/i18n";

export default function Header({ showLogout = true }: { showLogout?: boolean }) {
  const router = useRouter();
  const { t, locale, setLocale } = useLocale();

  const handleLogout = () => {
    deleteCookie(COOKIE_KEYS.authed);
    deleteCookie(COOKIE_KEYS.secretCode);
    deleteCookie(COOKIE_KEYS.encMongoUrl);
    deleteCookie(COOKIE_KEYS.encVoyageKey);
    router.push("/login");
  };

  return (
    <header className="app-header">
      <div className="logo">
        <span className="leaf">&#127807;</span>
        <span>{t.header.brand}</span>
      </div>
      <div className="spacer" />

      {/* 語言切換 */}
      <div className="lang-switcher">
        {LOCALES.map((l) => (
          <button
            key={l.value}
            className={`lang-btn${locale === l.value ? " active" : ""}`}
            onClick={() => setLocale(l.value)}
            aria-pressed={locale === l.value}
          >
            {l.label}
          </button>
        ))}
      </div>

      {showLogout && (
        <button className="logout-btn" onClick={handleLogout}>
          {t.common.logout}
        </button>
      )}
    </header>
  );
}
