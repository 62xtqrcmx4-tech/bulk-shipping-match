"use client";

import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";
import PageHeader from "../../components/PageHeader";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(`登录失败：${error.message}`);
      return;
    }

    alert("登录成功。");
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <PageHeader title="登录账号" description="登录后可发布货源、船源并发起联系申请。" />
      </div>

      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <form onSubmit={handleLogin} className="grid gap-5">
          <label className="grid gap-2">
            <span className="font-medium">邮箱</span>
            <input
              name="email"
              required
              type="email"
              className="rounded-xl border px-3 py-3"
              placeholder="请输入邮箱"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium">密码</span>
            <input
              name="password"
              required
              type="password"
              className="rounded-xl border px-3 py-3"
              placeholder="请输入密码"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          还没有账号？{" "}
          <a href="/register" className="font-medium text-blue-700">
            去注册
          </a>
        </p>
      </div>
    </main>
  );
}