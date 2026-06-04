"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Stepper, { StepKey } from "@/components/Stepper";
import SetupSection from "@/components/SetupSection";
import ImportSection from "@/components/ImportSection";
import IndexCheckSection from "@/components/IndexCheckSection";
import { COOKIE_KEYS, deleteCookie, getCookie, setCookie } from "@/lib/cookies";
import { useLocale } from "@/lib/i18n";

export default function SetupPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [current, setCurrent] = useState<StepKey>("setup");
  const [completed, setCompleted] = useState<Record<StepKey, boolean>>({
    setup: false,
    import: false,
    index: false,
  });

  useEffect(() => {
    const enc = getCookie(COOKIE_KEYS.encMongoUrl);
    const envReady = getCookie(COOKIE_KEYS.envReady) === "1";
    setCompleted((c) => ({
      ...c,
      setup: !!enc,
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
    deleteCookie(COOKIE_KEYS.envReady);
    setCompleted((c) => ({ ...c, setup: true, index: false }));
    setCurrent("import");
  };

  const handleImportDone = () => {
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
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>{t.setupPage.title}</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        {t.setupPage.subtitle}
      </p>

      <Stepper current={current} completed={completed} />

      <SetupSection onSaved={handleSetupSaved} />

      <ImportSection unlocked={completed.setup} onDone={handleImportDone} />

      <IndexCheckSection unlocked={completed.import} onReady={handleIndexReady} />

      {allDone && (
        <div className="card" style={{ textAlign: "center" }}>
          <h2 style={{ justifyContent: "center" }}>
            {t.setupPage.allDoneTitle}
          </h2>
          <p className="card-desc">{t.setupPage.allDoneDesc}</p>
          <button className="btn" onClick={() => router.push("/demo")}>
            {t.setupPage.nextStep}
          </button>
        </div>
      )}
    </AppShell>
  );
}
