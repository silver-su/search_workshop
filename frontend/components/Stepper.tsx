"use client";

export type StepKey = "setup" | "import" | "index";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "setup", label: "設定" },
  { key: "import", label: "資料導入" },
  { key: "index", label: "Index 檢查" },
];

export default function Stepper({
  current,
  completed,
}: {
  current: StepKey;
  completed: Record<StepKey, boolean>;
}) {
  return (
    <div className="stepper">
      {STEPS.map((s, i) => {
        const isActive = s.key === current;
        const isDone = completed[s.key];
        const cls = `step${isActive ? " active" : ""}${
          isDone ? " done" : ""
        }`;
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
