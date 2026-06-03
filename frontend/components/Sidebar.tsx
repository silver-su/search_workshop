"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { COOKIE_KEYS, getCookie } from "@/lib/cookies";

const MENU: {
  href: string;
  label: string;
  icon: string;
  requireEnvReady?: boolean;
}[] = [
  { href: "/setup", label: "環境設定", icon: "\u2699\uFE0F" },
  {
    href: "/demo",
    label: "Text & Vector Search Demo",
    icon: "\u{1F50E}",
    requireEnvReady: true,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [envReady, setEnvReady] = useState(false);

  // 隨路由變化重新檢查環境是否就緒(完成設定後切換頁面即更新)
  useEffect(() => {
    setEnvReady(getCookie(COOKIE_KEYS.envReady) === "1");
  }, [pathname]);

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {MENU.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const locked = item.requireEnvReady && !envReady;

          if (locked) {
            return (
              <span
                key={item.href}
                className="sidebar-link locked"
                title="請先完成「環境設定」"
                aria-disabled="true"
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span>{item.label}</span>
                <span className="sidebar-lock">&#128274;</span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link${active ? " active" : ""}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
