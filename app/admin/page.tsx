"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import PageHeader from "../../components/PageHeader";

type CountStats = {
  companyTotal: number;
  companyPending: number;
  cargoTotal: number;
  cargoPending: number;
  vesselTotal: number;
  vesselPending: number;
  contactTotal: number;
};

export default function AdminPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<CountStats>({
    companyTotal: 0,
    companyPending: 0,
    cargoTotal: 0,
    cargoPending: 0,
    vesselTotal: 0,
    vesselPending: 0,
    contactTotal: 0,
  });

  async function checkAdminPermission() {
    setCheckingAdmin(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      alert("请先登录后访问后台。");
      window.location.href = "/login";
      return false;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("company_verification")
      .select("is_admin")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (profileError) {
      alert(`读取管理员权限失败：${profileError.message}`);
      window.location.href = "/";
      return false;
    }

    if (!profileData || profileData.is_admin !== true) {
      alert("无权限访问后台。");
      window.location.href = "/";
      return false;
    }

    setIsAdmin(true);
    setCheckingAdmin(false);
    return true;
  }

  async function fetchStats() {
    setLoading(true);

    const [
      companyTotalResult,
      companyPendingResult,
      cargoTotalResult,
      cargoPendingResult,
      vesselTotalResult,
      vesselPendingResult,
      contactTotalResult,
    ] = await Promise.all([
      supabase
        .from("company_verification")
        .select("id", { count: "exact", head: true }),

      supabase
        .from("company_verification")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "pending"),

      supabase
        .from("cargo_demand")
        .select("id", { count: "exact", head: true }),

      supabase
        .from("cargo_demand")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),

      supabase
        .from("vessel_supply")
        .select("id", { count: "exact", head: true }),

      supabase
        .from("vessel_supply")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),

      supabase
        .from("contact_request")
        .select("id", { count: "exact", head: true }),
    ]);

    setStats({
      companyTotal: companyTotalResult.count || 0,
      companyPending: companyPendingResult.count || 0,
      cargoTotal: cargoTotalResult.count || 0,
      cargoPending: cargoPendingResult.count || 0,
      vesselTotal: vesselTotalResult.count || 0,
      vesselPending: vesselPendingResult.count || 0,
      contactTotal: contactTotalResult.count || 0,
    });

    setLoading(false);
  }

  useEffect(() => {
    async function initAdminPage() {
      const allowed = await checkAdminPermission();

      if (allowed) {
        await fetchStats();
      }
    }

    initAdminPage();
  }, []);

  if (checkingAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在校验管理员权限...
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-8 text-center text-red-600 shadow-sm ring-1 ring-slate-200">
            无权限访问后台。
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="后台管理"
          description="管理员后台首页。请选择需要处理的审核或监管模块。"
        />

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={fetchStats}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            刷新统计
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取后台统计...
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <a
              href="/admin/companies"
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">企业认证审核</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    审核企业资料、营业执照和认证状态，支持查看证照、认证通过和认证驳回。
                  </p>
                </div>

                {stats.companyPending > 0 ? (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                    待审核 {stats.companyPending}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    暂无待审
                  </span>
                )}
              </div>

              <div className="mt-6 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">企业总数</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {stats.companyTotal}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">待审核</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {stats.companyPending}
                  </p>
                </div>
              </div>
            </a>

            <a
              href="/admin/cargo"
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">货源审核</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    审核货源订单，支持按状态筛选、关键词搜索、通过、驳回和关闭。
                  </p>
                </div>

                {stats.cargoPending > 0 ? (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                    待审核 {stats.cargoPending}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    暂无待审
                  </span>
                )}
              </div>

              <div className="mt-6 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">货源总数</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {stats.cargoTotal}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">待审核</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {stats.cargoPending}
                  </p>
                </div>
              </div>
            </a>

            <a
              href="/admin/vessels"
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">船源审核</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    审核船源信息，支持按状态筛选、关键词搜索、通过、驳回和关闭。
                  </p>
                </div>

                {stats.vesselPending > 0 ? (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                    待审核 {stats.vesselPending}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    暂无待审
                  </span>
                )}
              </div>

              <div className="mt-6 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">船源总数</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {stats.vesselTotal}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">待审核</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {stats.vesselPending}
                  </p>
                </div>
              </div>
            </a>

            <a
              href="/admin/contacts"
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">联系申请总览</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    查看所有联系申请，包括申请方、被联系方、关联货源/船源和开放时间。
                  </p>
                </div>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  共 {stats.contactTotal}
                </span>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="text-slate-500">联系申请总数</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {stats.contactTotal}
                </p>
              </div>
            </a>
          </div>
        )}
      </div>
    </main>
  );
}