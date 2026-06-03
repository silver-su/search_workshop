"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Stepper, { StepKey } from "@/components/Stepper";
import SetupSection from "@/components/SetupSection";
import ImportSection from "@/components/ImportSection";
import IndexCheckSection from "@/components/IndexCheckSection";
import { COOKIE_KEYS, deleteCookie, getCookie, setCookie } from "@/lib/cookies";

export default function SetupPage() {
  const router = useRouter();
  const [current, setCurrent] = useState<StepKey>("setup");
  const [completed, setCompleted] = useState<Record<StepKey, boolean>>({
    setup: false,
    import: false,
    index: false,
  });

  // 進入頁面時還原既有狀態
  useEffect(() => {
    const enc = getCookie(COOKIE_KEYS.encMongoUrl);
    const envReady = getCookie(COOKIE_KEYS.envReady) === "1";
    setCompleted((c) => ({
      ...c,
      setup: !!enc,
      // 若先前已整體就緒,視為資料導入與 index 皆完成
      import: envReady || c.import,
      index: envReady,
    }));
    if (envReady) {
      setCurrent("index");
    } else if (enc) {
      setCurrent("import");
    }
  }, []);

  const handleSetupSaved = () => {
    // 重新設定連線 → 環境需重新驗證
    deleteCookie(COOKIE_KEYS.envReady);
    setCompleted((c) => ({ ...c, setup: true, index: false }));
    setCurrent("import");
  };

  const handleImportDone = () => {
    // 重新導入資料 → index 需重新檢查
    deleteCookie(COOKIE_KEYS.envReady);
    setCompleted((c) => ({ ...c, import: true, index: false }));
    setCurrent("index");
  };

  const handleIndexReady = (ready: boolean) => {
    setCompleted((c) => ({ ...c, index: ready }));
    if (ready) {
      setCookie(COOKIE_KEYS.envReady, "1");
    } else {
      deleteCookie(COOKIE_KEYS.envReady);
    }
  };

  const allDone = completed.setup && completed.import && completed.index;

  return (
    <AppShell>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>環境設定</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        請依序完成 設定 &rarr; 資料導入 &rarr; Index 檢查,以完成 workshop
        環境設定。
      </p>

      <Stepper current={current} completed={completed} />

      <SetupSection onSaved={handleSetupSaved} />

      <ImportSection unlocked={completed.setup} onDone={handleImportDone} />

      <IndexCheckSection unlocked={completed.import} onReady={handleIndexReady} />

      {allDone && (
        <div className="card" style={{ textAlign: "center" }}>
          <h2 style={{ justifyContent: "center" }}>
            <span>&#127881;</span> 環境設定已完成
          </h2>
          <p className="card-desc">
            設定、資料導入與 Index 皆已就緒,可以開始進行 Text &amp; Vector
            Search。
          </p>
          <button className="btn" onClick={() => router.push("/demo")}>
            下一步:前往 Text &amp; Vector Search &rarr;
          </button>
        </div>
      )}
    </AppShell>
  );
}
