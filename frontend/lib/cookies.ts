"use client";

// 簡易 cookie 工具(瀏覽器端)
export function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=").slice(1).join("="));
}

export function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// 將後端以 base64(UTF-8 bytes)編碼的字串解回明文
export function b64DecodeUtf8(encoded: string): string | null {
  if (typeof atob === "undefined") return null;
  try {
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return null;
  }
}

// cookie 名稱常數
export const COOKIE_KEYS = {
  authed: "ws_authed",
  secretCode: "ws_secret_code",
  encMongoUrl: "ws_enc_mongo_url",
  encVoyageKey: "ws_enc_voyage_key",
  // 環境設定全部完成(設定 + 資料導入 + Index 就緒)的標記
  envReady: "ws_env_ready",
} as const;
