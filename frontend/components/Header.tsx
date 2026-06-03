"use client";

import { useRouter } from "next/navigation";
import { COOKIE_KEYS, deleteCookie } from "@/lib/cookies";

export default function Header({ showLogout = true }: { showLogout?: boolean }) {
  const router = useRouter();

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
        <span>MongoDB Workshop</span>
      </div>
      <div className="spacer" />
      {showLogout && (
        <button className="logout-btn" onClick={handleLogout}>
          登出
        </button>
      )}
    </header>
  );
}
