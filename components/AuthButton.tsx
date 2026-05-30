"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type UserState = {
  email: string;
  isAdmin: boolean;
};

export default function AuthButton() {
  const [userState, setUserState] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUserState() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setUserState(null);
      setLoading(false);
      return;
    }

    const email = userData.user.email || "";

    const { data: profileData, error: profileError } = await supabase
      .from("company_verification")
      .select("is_admin")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      setUserState({
        email,
        isAdmin: false,
      });
      setLoading(false);
      return;
    }

    setUserState({
      email,
      isAdmin: profileData.is_admin === true,
    });

    setLoading(false);
  }

  useEffect(() => {
    fetchUserState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchUserState();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserState(null);
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="text-sm text-slate-400">
        正在读取...
      </div>
    );
  }

  if (!userState) {
    return (
      <div className="flex items-center gap-3">
        <a
          href="/login"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          登录
        </a>
        <a
          href="/register"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          注册
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600">{userState.email}</span>

      {userState.isAdmin ? (
        <a
          href="/admin"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          后台
        </a>
      ) : null}

      <button
        onClick={handleLogout}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        退出
      </button>
    </div>
  );
}