"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import PageHeader from "../../../components/PageHeader";

type CargoDemand = {
  id: string;
  publisher_id: string;
  transport_type: string;
  cargo_type: string;
  cargo_quantity: number;
  cargo_unit: string;
  loading_port: string;
  discharge_port: string;
  planned_loading_date: string;
  expected_vessel_type: string;
  information_expiry_date: string;
  status: string;
  rejected_reason: string | null;
  remark: string | null;
  created_at: string;

  publisher_company_name?: string;
  publisher_contact_name?: string;
  publisher_contact_phone?: string;
  publisher_contact_email?: string;
  publisher_verification_status?: string;
};

type CompanyProfile = {
  user_id: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  verification_status: string;
};

function formatTransportType(type: string) {
  if (type === "domestic") return "内贸";
  if (type === "international") return "外贸";
  if (type === "both") return "均可";
  return type;
}

function formatStatus(status: string) {
  if (status === "pending") return "待审核";
  if (status === "published") return "已发布 / 可联系";
  if (status === "completed") return "已完成";
  if (status === "closed") return "已关闭";
  if (status === "expired") return "已过期";
  if (status === "rejected") return "审核未通过";
  if (status === "draft") return "草稿";
  return status;
}

function formatCargoUnit(unit: string) {
  if (unit === "ton") return "吨";
  if (unit === "teu") return "TEU";
  if (unit === "cbm") return "立方米";
  if (unit === "piece") return "件";
  return unit;
}

function formatVerificationStatus(status?: string) {
  if (status === "pending") return "企业待认证";
  if (status === "approved") return "企业已认证";
  if (status === "rejected") return "企业认证驳回";
  return "企业未认证";
}

function formatDate(value: string | null) {
  if (!value) return "未记录";
  return new Date(value).toLocaleString("zh-CN");
}

function matchKeyword(
  keyword: string,
  values: Array<string | number | null | undefined>
) {
  const text = keyword.trim().toLowerCase();

  if (text === "") return true;

  return values
    .map((value) => String(value || ""))
    .join(" ")
    .toLowerCase()
    .includes(text);
}

export default function AdminCargoPage() {
  const [cargoList, setCargoList] = useState<CargoDemand[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  async function fetchCargo() {
    setLoading(true);

    const { data: cargoData, error: cargoError } = await supabase
      .from("cargo_demand")
      .select(
        "id, publisher_id, transport_type, cargo_type, cargo_quantity, cargo_unit, loading_port, discharge_port, planned_loading_date, expected_vessel_type, information_expiry_date, status, rejected_reason, remark, created_at"
      )
      .order("created_at", { ascending: false });

    if (cargoError) {
      alert(`读取货源失败：${cargoError.message}`);
      setLoading(false);
      return;
    }

    const cargos = (cargoData || []) as CargoDemand[];

    const publisherIds = Array.from(
      new Set(cargos.map((item) => item.publisher_id).filter(Boolean))
    );

    let profiles: CompanyProfile[] = [];

    if (publisherIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from("company_verification")
        .select(
          "user_id, company_name, contact_name, contact_phone, contact_email, verification_status"
        )
        .in("user_id", publisherIds);

      if (!profileError) {
        profiles = (profileData || []) as CompanyProfile[];
      } else {
        console.error(profileError);
      }
    }

    const profileMap = new Map<string, CompanyProfile>();

    profiles.forEach((profile) => {
      if (!profileMap.has(profile.user_id)) {
        profileMap.set(profile.user_id, profile);
      }
    });

    const merged = cargos.map((cargo) => {
      const profile = profileMap.get(cargo.publisher_id);

      return {
        ...cargo,
        publisher_company_name: profile?.company_name || "",
        publisher_contact_name: profile?.contact_name || "",
        publisher_contact_phone: profile?.contact_phone || "",
        publisher_contact_email: profile?.contact_email || "",
        publisher_verification_status: profile?.verification_status || "",
      };
    });

    setCargoList(merged);
    setLoading(false);
  }

  useEffect(() => {
    async function initPage() {
      const allowed = await checkAdminPermission();

      if (allowed) {
        await fetchCargo();
      }
    }

    initPage();
  }, []);

  const filteredCargoList = cargoList.filter((item) => {
    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "reviewed"
          ? [
              "published",
              "completed",
              "closed",
              "rejected",
              "expired",
            ].includes(item.status)
          : item.status === statusFilter;

    const matchSearch = matchKeyword(keyword, [
      item.cargo_type,
      item.transport_type,
      item.cargo_quantity,
      item.cargo_unit,
      item.loading_port,
      item.discharge_port,
      item.planned_loading_date,
      item.expected_vessel_type,
      item.information_expiry_date,
      item.status,
      item.rejected_reason,
      item.remark,
      item.publisher_company_name,
      item.publisher_contact_name,
      item.publisher_contact_phone,
      item.publisher_contact_email,
      item.publisher_verification_status,
      item.created_at,
    ]);

    return matchStatus && matchSearch;
  });

  async function approveCargo(id: string) {
    setUpdatingId(id);

    const { error } = await supabase
      .from("cargo_demand")
      .update({
        status: "published",
        rejected_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setUpdatingId(null);

    if (error) {
      alert(`通过货源失败：${error.message}`);
      return;
    }

    await fetchCargo();
  }

  async function rejectCargo(id: string) {
    const reason = window.prompt("请输入货源审核未通过原因：");

    if (reason === null) return;

    if (reason.trim() === "") {
      alert("驳回原因不能为空。");
      return;
    }

    setUpdatingId(id);

    const { error } = await supabase
      .from("cargo_demand")
      .update({
        status: "rejected",
        rejected_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setUpdatingId(null);

    if (error) {
      alert(`驳回货源失败：${error.message}`);
      return;
    }

    await fetchCargo();
  }

  async function closeCargo(id: string) {
    const confirmed = window.confirm("确认关闭该货源吗？");

    if (!confirmed) return;

    setUpdatingId(id);

    const { error } = await supabase
      .from("cargo_demand")
      .update({
        status: "closed",
        rejected_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setUpdatingId(null);

    if (error) {
      alert(`关闭货源失败：${error.message}`);
      return;
    }

    await fetchCargo();
  }

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
          title="货源审核"
          description="审核货源订单，支持状态筛选、关键词搜索、通过、驳回和关闭。"
        />

        <div className="mb-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-[1fr_auto_auto_auto]">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="rounded-xl border px-4 py-3 text-sm"
            placeholder="搜索货种、港口、船型、发布方、联系人、电话、备注、驳回原因"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border bg-white px-3 py-3 text-sm"
          >
            <option value="all">全部货源</option>
            <option value="pending">待审核</option>
            <option value="reviewed">已审核</option>
            <option value="published">已发布 / 可联系</option>
            <option value="completed">已完成</option>
            <option value="closed">已关闭</option>
            <option value="rejected">审核未通过</option>
            <option value="expired">已过期</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setStatusFilter("all");
            }}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            重置筛选
          </button>

          <button
            onClick={fetchCargo}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            刷新数据
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取货源数据...
          </div>
        ) : (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">货源列表</h2>
              <p className="mt-1 text-sm text-slate-500">
                共 {cargoList.length} 条货源，当前显示{" "}
                {filteredCargoList.length} 条
              </p>
            </div>

            {filteredCargoList.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                暂无符合条件的货源数据
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredCargoList.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-bold">
                            {item.cargo_type}
                          </h3>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                            {formatTransportType(item.transport_type)}
                          </span>

                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                            {formatStatus(item.status)}
                          </span>

                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                            {formatVerificationStatus(
                              item.publisher_verification_status
                            )}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-600">
                          {item.loading_port} → {item.discharge_port}
                        </p>

                        <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-4">
                          <p>
                            货量：{item.cargo_quantity}{" "}
                            {formatCargoUnit(item.cargo_unit)}
                          </p>
                          <p>计划装货：{item.planned_loading_date}</p>
                          <p>期望船型：{item.expected_vessel_type}</p>
                          <p>有效期至：{item.information_expiry_date}</p>
                        </div>

                        <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                          <p className="font-bold text-slate-800">发布方</p>
                          <div className="mt-2 grid gap-1 md:grid-cols-2">
                            <p>
                              企业：
                              {item.publisher_company_name || "未填写"}
                            </p>
                            <p>
                              联系人：
                              {item.publisher_contact_name || "未填写"}
                            </p>
                            <p>
                              电话：
                              {item.publisher_contact_phone || "未填写"}
                            </p>
                            <p>
                              邮箱：
                              {item.publisher_contact_email || "未填写"}
                            </p>
                          </div>
                        </div>

                        {item.rejected_reason ? (
                          <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                            审核未通过原因：{item.rejected_reason}
                          </div>
                        ) : null}

                        {item.remark ? (
                          <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                            备注：{item.remark}
                          </div>
                        ) : null}

                        <p className="mt-3 text-xs text-slate-400">
                          发布时间：{formatDate(item.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => approveCargo(item.id)}
                          disabled={updatingId === item.id}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400"
                        >
                          通过
                        </button>

                        <button
                          onClick={() => rejectCargo(item.id)}
                          disabled={updatingId === item.id}
                          className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:bg-slate-400"
                        >
                          驳回
                        </button>

                        <button
                          onClick={() => closeCargo(item.id)}
                          disabled={updatingId === item.id}
                          className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400"
                        >
                          关闭
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}