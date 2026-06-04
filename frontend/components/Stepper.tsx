"use client";

import { useLocale } from "@/lib/i18n";

export type StepKey = "setup" | "import" | "index";

export default function Stepper({
  current,
  completed,
}: {
  current: StepKey;
  completed: Record<StepKey, boolean>;
}) {
  const { t } = useLocale();

  const STEPS: { key: StepKey; label: string }[] = [
    { key: "setup", label: t.stepper.setup },
    { key: "import", label: t.stepper.import },
    { key: "index", label: t.stepper.index },
  ];

  return (
    <div className="stepper">
      {STEPS.map((s, i) => {
        const isActive = s.key === current;
        const isDone = completed[s.key];
        const cls = `step${isActive ? " active" : ""}${isDone ? " done" : ""}`;
        return (
          <div key={s.key} style={{ display: "contents" }}>
            <div className={cls}>
              <span className="num">{isDone ? "\u2713" : i + 1}</span>
              <span>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="step-line" />}
          </div>
        );
      })}
    </div>
  );
}
