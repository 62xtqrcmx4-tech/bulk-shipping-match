"use client";

import AuthButton from "./AuthButton";

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <a href="/" className="shrink-0">
          <div className="text-xl font-bold tracking-tight text-slate-950">
            DMU船货匹配平台
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Shipping Match Platform
          </div>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
          <a href="/cargo" className="hover:text-blue-700">
            货源大厅
          </a>
          <a href="/vessels" className="hover:text-blue-700">
            船源大厅
          </a>
          <a href="/publish-cargo" className="hover:text-blue-700">
            发布货源
          </a>
          <a href="/publish-vessel" className="hover:text-blue-700">
            发布船源
          </a>
          <a href="/my-cargo" className="hover:text-blue-700">
            我的货源
          </a>
          <a href="/my-vessels" className="hover:text-blue-700">
            我的船源
          </a>
          <a href="/my-profile" className="hover:text-blue-700">
            我的资料
          </a>
        </nav>

        <AuthButton />
      </div>
    </header>
  );
}