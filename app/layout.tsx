import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "DMU船货匹配平台",
  description: "Bulk Shipping Match Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}