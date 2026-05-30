"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import PageHeader from "../../../components/PageHeader";

type CargoDemand = {
  id: string;
  cargo_type: string;
  loading_port: string;
  discharge_port: string;
  cargo_quantity: number;
  cargo_unit: string;
  status: string;
};

type VesselSupply = {
  id: string;
  vessel_type: string;
  dwt: number;
  capacity_unit: string | null;
  current_port_or_area: string;
  status: string;
};

type ContactRequest = {
  id: string;
  requester_id: string;
  target_user_id: string;
  cargo_demand_id: string | null;
  vessel_supply_id: string | null;
  request_type: string;
  status: string;
  created_at: string;
  contact_opened_at: string | null;

  requester_company_name?: string;
  requester_contact_name?: string;
  requester_contact_phone?: string;
  requester_contact_email?: string;
  requester_verification_status?: string;

  target_company_name?: string;
  target_contact_name?: string;
  target_contact_phone?: string;
  target_contact_email?: string;
  target_verification_status?: string;

  related_title?: string;
  related_status?: string;
};

type CompanyProfile = {
  user_id: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  verification_status: string;
};

function formatContactType(type: string) {
  if (type === "cargo_to_vessel") return "货方联系船源";
  if (type === "vessel_to_cargo") return "船方联系货源";
  return type || "联系申请";
}

function formatContactStatus(status: string) {
  if (status === "opened") return "已开放";
  if (status === "pending") return "待处理";
  if (status === "closed") return "已关闭";
  if (status === "rejected") return "已拒绝";
  return status || "未知状态";
}

function formatVerificationStatus(status?: string) {
  if (status === "pending") return "企业待认证";
  if (status === "approved") return "企业已认证";
  if (status === "rejected") return "企业认证驳回";
  return "企业未认证";
}

function formatCargoUnit(unit: string) {
  if (unit === "ton") return "吨";
  if (unit === "teu") return "TEU";
  if (unit === "cbm") return "立方米";
  if (unit === "piece") return "件";
  return unit;
}

function formatCapacityUnit(unit: string | null) {
  if (!unit) return "DWT";
  if (unit === "piece") return "件";
  if (unit === "other") return "其他";
  return unit;
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

export default function AdminContactsPage() {
  const [contactList, setContactList] = useState<ContactRequest[]>([]);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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

  async function fetchContacts() {
    setLoading(true);

    const { data: contactData, error: contactError } = await supabase
      .from("contact_request")
      .select(
        "id, requester_id, target_user_id, cargo_demand_id, vessel_supply_id, request_type, status, created_at, contact_opened_at"
      )
      .order("created_at", { ascending: false });

    if (contactError) {
      alert(`读取联系申请失败：${contactError.message}`);
      setLoading(false);
      return;
    }

    const contacts = (contactData || []) as ContactRequest[];

    const userIds = Array.from(
      new Set(
        contacts
          .flatMap((item) => [item.requester_id, item.target_user_id])
          .filter(Boolean)
      )
    );

    const cargoIds = Array.from(
      new Set(contacts.map((item) => item.cargo_demand_id).filter(Boolean))
    ) as string[];

    const vesselIds = Array.from(
      new Set(contacts.map((item) => item.vessel_supply_id).filter(Boolean))
    ) as string[];

    let profiles: CompanyProfile[] = [];
    let cargos: CargoDemand[] = [];
    let vessels: VesselSupply[] = [];

    if (userIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from("company_verification")
        .select(
          "user_id, company_name, contact_name, contact_phone, contact_email, verification_status"
        )
        .in("user_id", userIds);

      if (!profileError) {
        profiles = (profileData || []) as CompanyProfile[];
      } else {
        console.error(profileError);
      }
    }

    if (cargoIds.length > 0) {
      const { data: cargoData, error: cargoError } = await supabase
        .from("cargo_demand")
        .select(
          "id, cargo_type, loading_port, discharge_port, cargo_quantity, cargo_unit, status"
        )
        .in("id", cargoIds);

      if (!cargoError) {
        cargos = (cargoData || []) as CargoDemand[];
      } else {
        console.error(cargoError);
      }
    }

    if (vesselIds.length > 0) {
      const { data: vesselData, error: vesselError } = await supabase
        .from("vessel_supply")
        .select(
          "id, vessel_type, dwt, capacity_unit, current_port_or_area, status"
        )
        .in("id", vesselIds);

      if (!vesselError) {
        vessels = (vesselData || []) as VesselSupply[];
      } else {
        console.error(vesselError);
      }
    }

    const profileMap = new Map<string, CompanyProfile>();
    profiles.forEach((profile) => {
      if (!profileMap.has(profile.user_id)) {
        profileMap.set(profile.user_id, profile);
      }
    });

    const cargoMap = new Map<string, CargoDemand>();
    cargos.forEach((cargo) => {
      cargoMap.set(cargo.id, cargo);
    });

    const vesselMap = new Map<string, VesselSupply>();
    vessels.forEach((vessel) => {
      vesselMap.set(vessel.id, vessel);
    });

    const mergedContacts = contacts.map((contact) => {
      const requester = profileMap.get(contact.requester_id);
      const target = profileMap.get(contact.target_user_id);

      let relatedTitle = "未关联资源";
      let relatedStatus = "";

      if (contact.cargo_demand_id) {
        const cargo = cargoMap.get(contact.cargo_demand_id);
        if (cargo) {
          relatedTitle = `货源：${cargo.cargo_type}｜${cargo.loading_port} → ${
            cargo.discharge_port
          }｜${cargo.cargo_quantity} ${formatCargoUnit(cargo.cargo_unit)}`;
          relatedStatus = cargo.status;
        }
      }

      if (contact.vessel_supply_id) {
        const vessel = vesselMap.get(contact.vessel_supply_id);
        if (vessel) {
          relatedTitle = `船源：${vessel.vessel_type}｜${
            vessel.current_port_or_area
          }｜${vessel.dwt} ${formatCapacityUnit(vessel.capacity_unit)}`;
          relatedStatus = vessel.status;
        }
      }

      return {
        ...contact,

        requester_company_name: requester?.company_name || "",
        requester_contact_name: requester?.contact_name || "",
        requester_contact_phone: requester?.contact_phone || "",
        requester_contact_email: requester?.contact_email || "",
        requester_verification_status: requester?.verification_status || "",

        target_company_name: target?.company_name || "",
        target_contact_name: target?.contact_name || "",
        target_contact_phone: target?.contact_phone || "",
        target_contact_email: target?.contact_email || "",
        target_verification_status: target?.verification_status || "",

        related_title: relatedTitle,
        related_status: relatedStatus,
      };
    });

    setContactList(mergedContacts);
    setLoading(false);
  }

  useEffect(() => {
    async function initPage() {
      const allowed = await checkAdminPermission();

      if (allowed) {
        await fetchContacts();
      }
    }

    initPage();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, typeFilter, statusFilter, pageSize]);

  const filteredContactList = contactList.filter((item) => {
    const matchType =
      typeFilter === "all" ? true : item.request_type === typeFilter;

    const matchStatus =
      statusFilter === "all" ? true : item.status === statusFilter;

    const matchSearch = matchKeyword(keyword, [
      item.request_type,
      formatContactType(item.request_type),
      item.status,
      formatContactStatus(item.status),
      item.related_title,
      item.related_status,
      item.requester_company_name,
      item.requester_contact_name,
      item.requester_contact_phone,
      item.requester_contact_email,
      item.requester_verification_status,
      item.target_company_name,
      item.target_contact_name,
      item.target_contact_phone,
      item.target_contact_email,
      item.target_verification_status,
      item.created_at,
      item.contact_opened_at,
    ]);

    return matchType && matchStatus && matchSearch;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredContactList.length / pageSize)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedContactList = filteredContactList.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

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
          title="联系申请总览"
          description="查看所有联系申请，包括申请方、被联系方、关联货源/船源、申请时间和开放时间。"
        />

        <div className="mb-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="rounded-xl border px-4 py-3 text-sm"
            placeholder="搜索企业、联系人、电话、邮箱、货源、船源、港口、状态"
          />

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border bg-white px-3 py-3 text-sm"
          >
            <option value="all">全部联系类型</option>
            <option value="vessel_to_cargo">船方联系货源</option>
            <option value="cargo_to_vessel">货方联系船源</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border bg-white px-3 py-3 text-sm"
          >
            <option value="all">全部状态</option>
            <option value="opened">已开放</option>
            <option value="pending">待处理</option>
            <option value="closed">已关闭</option>
            <option value="rejected">已拒绝</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setTypeFilter("all");
              setStatusFilter("all");
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            重置筛选
          </button>

          <button
            onClick={fetchContacts}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            刷新数据
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取联系申请数据...
          </div>
        ) : (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">联系申请列表</h2>
              <p className="mt-1 text-sm text-slate-500">
                共 {contactList.length} 条联系申请，筛选后{" "}
                {filteredContactList.length} 条，当前第 {safeCurrentPage} /{" "}
                {totalPages} 页
              </p>
            </div>

            {filteredContactList.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                暂无符合条件的联系申请数据
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  {paginatedContactList.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                          {formatContactType(item.request_type)}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                          {formatContactStatus(item.status)}
                        </span>

                        {item.related_status ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                            关联资源状态：{item.related_status}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 text-sm font-medium text-slate-800">
                        {item.related_title || "未关联资源"}
                      </p>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-800">申请方</p>
                            <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                              {formatVerificationStatus(
                                item.requester_verification_status
                              )}
                            </span>
                          </div>

                          <div className="mt-2 grid gap-1">
                            <p>
                              企业：{item.requester_company_name || "未填写"}
                            </p>
                            <p>
                              联系人：{item.requester_contact_name || "未填写"}
                            </p>
                            <p>
                              电话：{item.requester_contact_phone || "未填写"}
                            </p>
                            <p>
                              邮箱：{item.requester_contact_email || "未填写"}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-800">被联系方</p>
                            <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                              {formatVerificationStatus(
                                item.target_verification_status
                              )}
                            </span>
                          </div>

                          <div className="mt-2 grid gap-1">
                            <p>企业：{item.target_company_name || "未填写"}</p>
                            <p>联系人：{item.target_contact_name || "未填写"}</p>
                            <p>电话：{item.target_contact_phone || "未填写"}</p>
                            <p>邮箱：{item.target_contact_email || "未填写"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                        <p>申请时间：{formatDate(item.created_at)}</p>
                        <p>开放时间：{formatDate(item.contact_opened_at)}</p>
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