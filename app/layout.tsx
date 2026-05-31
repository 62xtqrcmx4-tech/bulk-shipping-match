import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "DMU船货匹配平台",
  description: "辽宁省智慧交通与港航物流工程研究中心 V0.1",
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