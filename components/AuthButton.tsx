"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthButton() {
  const [email, setEmail] = useState<string | null>(null);

  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    setEmail(data.user?.email || null);
  }

  useEffect(() => {
    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setEmail(null);
    window.location.href = "/";
  }

  if (!email) {
    return (
      <div className="flex items-center gap-2">
        <a
          href="/login"
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          登录
        </a>
        <a
          href="/register"
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          注册
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-48 truncate text-sm text-slate-600 md:inline">
        {email}
      </span>
      <a
        href="/admin"
        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        后台
      </a>
      <button
        onClick={handleLogout}
        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        退出
      </button>
    </div>
  );
}