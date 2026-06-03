"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiLogin } from "@/lib/api";
import { COOKIE_KEYS, setCookie } from "@/lib/cookies";

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code.trim()) {
      setError("請輸入 secret code");
      return;
    }
    setLoading(true);
    const result = await apiLogin(code.trim());
    setLoading(false);

    if (result.ok) {
      setCookie(COOKIE_KEYS.authed, "1");
      // 記錄 secret code,後續每次 API 呼叫都會帶上並由後端重新驗證
      setCookie(COOKIE_KEYS.secretCode, code.trim());
      router.push("/setup");
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <span className="leaf">&#127807;</span>
        <h1>Workshop 登入</h1>
        <p className="sub">請輸入顧問提供的 secret code</p>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="code">Secret Code</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="請輸入 secret code"
              autoFocus
            />
          </div>
          <button className="btn full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "登入"}
          </button>
        </form>
      </div>
    </div>
  );
}
