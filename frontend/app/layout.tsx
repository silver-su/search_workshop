import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "MongoDB Workshop",
  description: "Workshop Environment Setup Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
