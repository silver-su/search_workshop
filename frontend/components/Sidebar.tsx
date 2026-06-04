"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { COOKIE_KEYS, getCookie } from "@/lib/cookies";
import { useLocale } from "@/lib/i18n";

export default function Sidebar() {
  const pathname = usePathname();
  const [envReady, setEnvReady] = useState(false);
  const { t } = useLocale();

  // 隨路由變化重新檢查環境是否就緒
  useEffect(() => {
    setEnvReady(getCookie(COOKIE_KEYS.envReady) === "1");
  }, [pathname]);

  const MENU = [
    { href: "/setup", label: t.sidebar.setup, icon: "\u2699\uFE0F" },
    {
      href: "/demo",
      label: t.sidebar.demo,
      icon: "\u{1F50E}",
      requireEnvReady: true,
    },
  ];

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
                title={t.sidebar.lockedTitle}
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
