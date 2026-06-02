"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import PageHeader from "../../../components/PageHeader";

type VesselSupply = {
  id: string;
  publisher_id: string;
  transport_type: string;
  vessel_type: string;
  dwt: number;
  capacity_unit: string | null;
  current_port_or_area: string;
  current_destination_port: string | null;
  available_start_date: string;
  available_end_date: string | null;
  service_area: string;
  regular_route: string | null;
  is_ballast_return: boolean;
  is_idle_slot: boolean;
  acceptable_cargo_types: string[];
  information_expiry_date: string;
  status: string;
  rejected_reason: string | null;
  remark: string | null;
  created_at: string;
  updated_at?: string | null;

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
  if (status === "published") return "可联系";
  if (status === "completed") return "已完成";
  if (status === "closed") return "已关闭";
  if (status === "expired") return "已过期";
  if (status === "rejected") return "审核未通过";
  if (status === "draft") return "草稿";
  return status || "未知状态";
}

function formatCapacityUnit(unit: string | null) {
  if (!unit) return "DWT";
  if (unit === "piece") return "件";
  if (unit === "other") return "其他";
  return unit;
}

function formatVerificationStatus(status?: string) {
  if (status === "approved") return "已认证";
  if (status === "pending") return "证照已提交，待审核";
  if (status === "rejected") return "认证驳回";
  return "未认证";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "未记录";
  return new Date(value).toLocaleString("zh-CN");
}

function getStatusBadgeClass(status: string) {
  if (status === "pending") {
    return "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700";
  }

  if (status === "published") {
    return "rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700";
  }

  if (status === "completed") {
    return "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700";
  }

  if (status === "closed") {
    return "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600";
  }

  if (status === "expired") {
    return "rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700";
  }

  if (status === "rejected") {
    return "rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700";
  }

  return "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600";
}

export default function AdminVesselsPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [vesselList, setVesselList] = useState<VesselSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("pending");
  const [keyword, setKeyword] = useState("");
  const [rejectReasonById, setRejectReasonById] = useState<
    Record<string, string>
  >({});

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  async function fetchVesselList() {
    setLoading(true);

    const { error: expireError } = await supabase.rpc(
      "expire_outdated_listings"
    );

    if (expireError) {
      console.error("过期信息处理失败：", expireError);
    }

    const { data: vesselData, error: vesselError } = await supabase
      .from("vessel_supply")
      .select(
        "id, publisher_id, transport_type, vessel_type, dwt, capacity_unit, current_port_or_area, current_destination_port, available_start_date, available_end_date, service_area, regular_route, is_ballast_return, is_idle_slot, acceptable_cargo_types, information_expiry_date, status, rejected_reason, remark, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (vesselError) {
      alert(`读取船源审核列表失败：${vesselError.message}`);
      setLoading(false);
      return;
    }

    const vessels = (vesselData || []) as VesselSupply[];

    const publisherIds = Array.from(
      new Set(vessels.map((item) => item.publisher_id).filter(Boolean))
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

    const merged = vessels.map((vessel) => {
      const profile = profileMap.get(vessel.publisher_id);

      return {
        ...vessel,
        publisher_company_name: profile?.company_name || "",
        publisher_contact_name: profile?.contact_name || "",
        publisher_contact_phone: profile?.contact_phone || "",
        publisher_contact_email: profile?.contact_email || "",
        publisher_verification_status: profile?.verification_status || "",
      };
    });

    setVesselList(merged);
    setLoading(false);
  }

  useEffect(() => {
    async function initPage() {
      const allowed = await checkAdminPermission();

      if (allowed) {
        await fetchVesselList();
      }
    }

    initPage();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, keyword, pageSize]);

  const filteredVesselList = vesselList.filter((item) => {
    const matchStatus =
      statusFilter === "all" ? true : item.status === statusFilter;

    const keywordText = keyword.trim().toLowerCase();

    const matchKeyword =
      keywordText === ""
        ? true
        : [
            item.vessel_type,
            item.transport_type,
            item.dwt,
            item.capacity_unit || "",
            item.current_port_or_area,
            item.current_destination_port || "",
            item.available_start_date,
            item.available_end_date || "",
            item.service_area,
            item.regular_route || "",
            Array.isArray(item.acceptable_cargo_types)
              ? item.acceptable_cargo_types.join(" ")
              : "",
            item.status,
            formatStatus(item.status),
            item.rejected_reason || "",
            item.remark || "",
            item.publisher_company_name || "",
            item.publisher_contact_name || "",
            item.publisher_contact_phone || "",
            item.publisher_contact_email || "",
            formatVerificationStatus(item.publisher_verification_status),
          ]
            .join(" ")
            .toLowerCase()
            .includes(keywordText);

    return matchStatus && matchKeyword;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredVesselList.length / pageSize)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedVesselList = filteredVesselList.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  async function approveVessel(vesselId: string) {
    const confirmed = window.confirm("确认审核通过该船源吗？");

    if (!confirmed) return;

    setUpdatingId(vesselId);

    const { error } = await supabase
      .from("vessel_supply")
      .update({
        status: "published",
        rejected_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vesselId);

    setUpdatingId(null);

    if (error) {
      alert(`审核通过失败：${error.message}`);
      return;
    }

    alert("船源已审核通过。");
    await fetchVesselList();
  }

  async function rejectVessel(vesselId: string) {
    const reason = rejectReasonById[vesselId]?.trim();

    if (!reason) {
      alert("请先填写驳回原因。");
      return;
    }

    const confirmed = window.confirm("确认驳回该船源吗？");

    if (!confirmed) return;

    setUpdatingId(vesselId);

    const { error } = await supabase
      .from("vessel_supply")
      .update({
        status: "rejected",
        rejected_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vesselId);

    setUpdatingId(null);

    if (error) {
      alert(`驳回船源失败：${error.message}`);
      return;
    }

    setRejectReasonById((prev) => ({
      ...prev,
      [vesselId]: "",
    }));

    alert("船源已驳回。");
    await fetchVesselList();
  }

  async function closeVessel(vesselId: string) {
    const confirmed = window.confirm("确认关闭该船源吗？关闭后前台将不再展示。");

    if (!confirmed) return;

    setUpdatingId(vesselId);

    const { error } = await supabase
      .from("vessel_supply")
      .update({
        status: "closed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", vesselId);

    setUpdatingId(null);

    if (error) {
      alert(`关闭船源失败：${error.message}`);
      return;
    }

    alert("船源已关闭。");
    await fetchVesselList();
  }

  function resetFilters() {
    setStatusFilter("all");
    setKeyword("");
    setCurrentPage(1);
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
          title="船源审核"
          description="审核用户发布的船源信息，可按状态筛选并搜索船型、区域、发布方企业和联系方式。"
        />

        <div className="mb-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-[1fr_auto_auto]">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="rounded-xl border px-4 py-3 text-sm"
            placeholder="搜索船型、区域、航线、货种、企业、联系人、电话、邮箱、备注"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border bg-white px-4 py-3 text-sm"
          >
            <option value="all">全部状态</option>
            <option value="pending">待审核</option>
            <option value="published">可联系</option>
            <option value="completed">已完成</option>
            <option value="closed">已关闭</option>
            <option value="expired">已过期</option>
            <option value="rejected">审核未通过</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            重置筛选
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <p>
            共 {vesselList.length} 条船源，筛选后{" "}
            {filteredVesselList.length} 条，当前第 {safeCurrentPage} /{" "}
            {totalPages} 页。
          </p>

          <button
            onClick={fetchVesselList}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            刷新数据
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取船源审核列表...
          </div>
        ) : filteredVesselList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            暂无符合条件的船源。
          </div>
        ) : (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="grid gap-5">
              {paginatedVesselList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold">
                          {item.vessel_type}
                        </h2>

                        <span className={getStatusBadgeClass(item.status)}>
                          {formatStatus(item.status)}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                          {formatTransportType(item.transport_type)}
                        </span>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                          发布方
                          {formatVerificationStatus(
                            item.publisher_verification_status
                          )}
                        </span>

                        {item.is_ballast_return ? (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                            返程空载
                          </span>
                        ) : null}

                        {item.is_idle_slot ? (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                            空档船期
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-slate-600">
                        当前港/区域：{item.current_port_or_area}
                        {item.current_destination_port
                          ? `；当前目的港：${item.current_destination_port}`
                          : ""}
                      </p>

                      <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-4">
                        <p>
                          运力规模：{item.dwt}{" "}
                          {formatCapacityUnit(item.capacity_unit)}
                        </p>
                        <p>可用开始：{formatDate(item.available_start_date)}</p>
                        <p>
                          可用结束：
                          {item.available_end_date
                            ? formatDate(item.available_end_date)
                            : "未填写"}
                        </p>
                        <p>
                          有效期至：{formatDate(item.information_expiry_date)}
                        </p>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                        <p>服务区域：{item.service_area}</p>
                        <p>常跑航线：{item.regular_route || "未填写"}</p>
                        <p>
                          可承运：
                          {Array.isArray(item.acceptable_cargo_types)
                            ? item.acceptable_cargo_types.join("、")
                            : ""}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                          <p className="font-bold text-slate-800">发布方信息</p>
                          <p className="mt-2">
                            企业名称：
                            {item.publisher_company_name || "未填写企业名称"}
                          </p>
                          <p className="mt-1">
                            联系人：
                            {item.publisher_contact_name || "未填写联系人"}
                          </p>
                          <p className="mt-1">
                            电话：
                            {item.publisher_contact_phone || "未填写"}
                          </p>
                          <p className="mt-1">
                            邮箱：
                            {item.publisher_contact_email || "未填写"}
                          </p>
                          <p className="mt-1">
                            认证状态：
                            {formatVerificationStatus(
                              item.publisher_verification_status
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                          <p className="font-bold text-slate-800">时间信息</p>
                          <p className="mt-2">
                            发布时间：{formatDate(item.created_at)}
                          </p>
                          <p className="mt-1">
                            更新时间：{formatDate(item.updated_at)}
                          </p>
                        </div>
                      </div>

                      {item.remark ? (
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                          <span className="font-medium text-slate-800">
                            备注：
                          </span>
                          {item.remark}
                        </div>
                      ) : null}

                      {item.status === "rejected" &&
                      item.rejected_reason ? (
                        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                          <span className="font-semibold">驳回原因：</span>
                          {item.rejected_reason}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => approveVessel(item.id)}
                        disabled={
                          updatingId === item.id || item.status === "published"
                        }
                        className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        审核通过
                      </button>

                      <button
                        onClick={() => closeVessel(item.id)}
                        disabled={
                          updatingId === item.id ||
                          item.status === "closed" ||
                          item.status === "completed"
                        }
                        className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        关闭船源
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
                    <p className="text-sm font-bold text-red-900">
                      驳回该船源
                    </p>

                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                      <input
                        value={rejectReasonById[item.id] || ""}
                        onChange={(event) =>
                          setRejectReasonById((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm"
                        placeholder="请输入驳回原因，例如：船源信息不完整、有效期填写错误等"
                      />

                      <button
                        onClick={() => rejectVessel(item.id)}
                        disabled={
                          updatingId === item.id || item.status === "rejected"
                        }
                        className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        确认驳回
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>每页显示</span>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="rounded-xl border bg-white px-3 py-2 text-sm"
                >
                  <option value={10}>10 条</option>
                  <option value={20}>20 条</option>
                  <option value={50}>50 条</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={safeCurrentPage <= 1}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  上一页
                </button>

                <span className="text-sm text-slate-600">
                  第 {safeCurrentPage} / {totalPages} 页
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={safeCurrentPage >= totalPages}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  下一页
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}