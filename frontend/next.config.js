/** @type {import('next').NextConfig} */

// 允許從哪些來源存取 dev server 的 /_next/* 資源(Next.js 15+ 使用)。
// 透過環境變數 ALLOWED_DEV_ORIGINS 以逗號分隔設定,例如:
//   ALLOWED_DEV_ORIGINS=18.142.237.50,my-host.example.com
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig = {
  reactStrictMode: true,
  ...(allowedDevOrigins.length ? { allowedDevOrigins } : {}),
};

module.exports = nextConfig;
