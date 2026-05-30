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

function formatCapacityUnit(unit: string | null) {
  if (!unit) return "DWT";
  if (unit === "piece") return "件";
  if (unit === "other") return "其他";
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

export default function AdminVesselsPage() {
  const [vesselList, setVesselList] = useState<VesselSupply[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  async function fetchVessels() {
    setLoading(true);

    const { data: vesselData, error: vesselError } = await supabase
      .from("vessel_supply")
      .select(
        "id, publisher_id, transport_type, vessel_type, dwt, capacity_unit, current_port_or_area, current_destination_port, available_start_date, available_end_date, service_area, regular_route, is_ballast_return, is_idle_slot, acceptable_cargo_types, information_expiry_date, status, rejected_reason, remark, created_at"
      )
      .order("created_at", { ascending: false });

    if (vesselError) {
      alert(`读取船源失败：${vesselError.message}`);
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
        await fetchVessels();
      }
    }

    initPage();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, statusFilter, pageSize]);

  const filteredVesselList = vesselList.filter((item) => {
    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "reviewed"
          ? ["published", "completed", "closed", "rejected", "expired"].includes(
              item.status
            )
          : item.status === statusFilter;

    const matchSearch = matchKeyword(keyword, [
      item.vessel_type,
      item.transport_type,
      item.dwt,
      item.capacity_unit,
      item.current_port_or_area,
      item.current_destination_port,
      item.available_start_date,
      item.available_end_date,
      item.service_area,
      item.regular_route,
      Array.isArray(item.acceptable_cargo_types)
        ? item.acceptable_cargo_types.join(" ")
        : "",
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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredVesselList.length / pageSize)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedVesselList = filteredVesselList.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  async function approveVessel(id: string) {
    setUpdatingId(id);

    const { error } = await supabase
      .from("vessel_supply")
      .update({
        status: "published",
        rejected_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setUpdatingId(null);

    if (error) {
      alert(`通过船源失败：${error.message}`);
      return;
    }

    await fetchVessels();
  }

  async function rejectVessel(id: string) {
    const reason = window.prompt("请输入船源审核未通过原因：");

    if (reason === null) return;

    if (reason.trim() === "") {
      alert("驳回原因不能为空。");
      return;
    }

    setUpdatingId(id);

    const { error } = await supabase
      .from("vessel_supply")
      .update({
        status: "rejected",
        rejected_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setUpdatingId(null);

    if (error) {
      alert(`驳回船源失败：${error.message}`);
      return;
    }

    await fetchVessels();
  }

  async function closeVessel(id: string) {
    const confirmed = window.confirm("确认关闭该船源吗？");

    if (!confirmed) return;

    setUpdatingId(id);

    const { error } = await supabase
      .from("vessel_supply")
      .update({
        status: "closed",
        rejected_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setUpdatingId(null);

    if (error) {
      alert(`关闭船源失败：${error.message}`);
      return;
    }

    await fetchVessels();
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
          description="审核船源信息，支持状态筛选、关键词搜索、通过、驳回和关闭。"
        />

        <div className="mb-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-[1fr_auto_auto_auto]">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="rounded-xl border px-4 py-3 text-sm"
            placeholder="搜索船型、区域、货种、发布方、联系人、电话、备注、驳回原因"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border bg-white px-3 py-3 text-sm"
          >
            <option value="all">全部船源</option>
            <option value="pending">待审核</option>
            <option value="reviewed">已审核</option>
            <option value="published">已发布 / 可联系</option>
            <option value="closed">已关闭</option>
            <option value="rejected">审核未通过</option>
            <option value="expired">已过期</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setStatusFilter("all");
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            重置筛选
          </button>

          <button
            onClick={fetchVessels}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            刷新数据
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取船源数据...
          </div>
        ) : (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">船源列表</h2>
              <p className="mt-1 text-sm text-slate-500">
                共 {vesselList.length} 条船源，筛选后{" "}
                {filteredVesselList.length} 条，当前第 {safeCurrentPage} /{" "}
                {totalPages} 页
              </p>
            </div>

            {filteredVesselList.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                暂无符合条件的船源数据
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  {paginatedVesselList.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-bold">
                              {item.vessel_type}
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

                            {item.is_ballast_return ? (
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                                返程空载
                              </span>
                            ) : null}

                            {item.is_idle_slot ? (
                              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700">
                                空档船期
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-2 text-sm text-slate-600">
                            当前港/区域：{item.current_port_or_area}
                            {item.current_destination_port
                              ? `；当前目的港：${item.current_destination_port}`
                              : ""}
                          </p>

                          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-4">
                            <p>
                              运力规模：{item.dwt}{" "}
                              {formatCapacityUnit(item.capacity_unit)}
                            </p>
                            <p>可用开始：{item.available_start_date}</p>
                            <p>
                              可用结束：
                              {item.available_end_date || "未填写"}
                            </p>
                            <p>有效期至：{item.information_expiry_date}</p>
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
                            onClick={() => approveVessel(item.id)}
                            disabled={updatingId === item.id}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400"
                          >
                            通过
                          </button>

                          <button
                            onClick={() => rejectVessel(item.id)}
                            disabled={updatingId === item.id}
                            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:bg-slate-400"
                          >
                            驳回
                          </button>

                          <button
                            onClick={() => closeVessel(item.id)}
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

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>每页显示</span>
                    <select
                      value={pageSize}
                      onChange={(event) =>
                        setPageSize(Number(event.target.value))
                      }
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
                        setCurrentPage((prev) =>
                          Math.min(totalPages, prev + 1)
                        )
                      }
                      disabled={safeCurrentPage >= totalPages}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}