"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { COOKIE_KEYS, getCookie } from "@/lib/cookies";

// 共用版面:頂部 Header + 左側 Sidebar + 主要內容,並負責登入守衛
// requireEnvReady=true 時,額外要求「環境設定」全部完成,否則導回 /setup
export default function AppShell({
  children,
  requireEnvReady = false,
}: {
  children: React.ReactNode;
  requireEnvReady?: boolean;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const authed = getCookie(COOKIE_KEYS.authed);
    if (authed !== "1") {
      router.replace("/login");
      return;
    }
    if (requireEnvReady && getCookie(COOKIE_KEYS.envReady) !== "1") {
      // 環境設定尚未完成 → 導回環境設定頁
      router.replace("/setup");
      return;
    }
    setReady(true);
  }, [router, requireEnvReady]);

  return (
    <>
      <Header />
      <div className="shell">
        <Sidebar />
        <main className="shell-main">
          {ready ? children : <p className="muted">載入中...</p>}
        </main>
      </div>
    </>
  );
}
