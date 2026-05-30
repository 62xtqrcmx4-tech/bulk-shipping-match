"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import PageHeader from "../../components/PageHeader";

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

  target_company_name?: string;
  target_contact_name?: string;
  target_contact_phone?: string;
  target_contact_email?: string;

  related_title?: string;
  related_status?: string;
  direction_text?: string;
  counterpart_company_name?: string;
  counterpart_contact_name?: string;
  counterpart_contact_phone?: string;
  counterpart_contact_email?: string;
};

type CompanyProfile = {
  user_id: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  verification_status: string;
};

type CargoDemand = {
  id: string;
  cargo_type: string;
  cargo_quantity: number;
  cargo_unit: string;
  loading_port: string;
  discharge_port: string;
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

export default function ContactsPage() {
  const [contactList, setContactList] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUserId, setCurrentUserId] = useState("");

  const [directionFilter, setDirectionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function fetchContacts() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      alert("请先登录后查看联系记录。");
      window.location.href = "/login";
      return;
    }

    const userId = userData.user.id;
    setCurrentUserId(userId);

    const { data: contactData, error: contactError } = await supabase
      .from("contact_request")
      .select(
        "id, requester_id, target_user_id, cargo_demand_id, vessel_supply_id, request_type, status, created_at, contact_opened_at"
      )
      .or(`requester_id.eq.${userId},target_user_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (contactError) {
      alert(`读取联系记录失败：${contactError.message}`);
      setLoading(false);
      return;
    }

    const contacts = (contactData || []) as ContactRequest[];

    if (contacts.length === 0) {
      setContactList([]);
      setLoading(false);
      return;
    }

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
          "id, cargo_type, cargo_quantity, cargo_unit, loading_port, discharge_port, status"
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
        .select("id, vessel_type, dwt, capacity_unit, current_port_or_area, status")
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

      const isInitiatedByMe = contact.requester_id === userId;

      const counterpart = isInitiatedByMe ? target : requester;

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

        target_company_name: target?.company_name || "",
        target_contact_name: target?.contact_name || "",
        target_contact_phone: target?.contact_phone || "",
        target_contact_email: target?.contact_email || "",

        counterpart_company_name: counterpart?.company_name || "",
        counterpart_contact_name: counterpart?.contact_name || "",
        counterpart_contact_phone: counterpart?.contact_phone || "",
        counterpart_contact_email: counterpart?.contact_email || "",

        related_title: relatedTitle,
        related_status: relatedStatus,
        direction_text: isInitiatedByMe ? "我发起的联系" : "我收到的联系",
      };
    });

    setContactList(mergedContacts);
    setLoading(false);
  }

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [directionFilter, typeFilter, statusFilter, keyword, pageSize]);

  const filteredContactList = contactList.filter((item) => {
    const isInitiatedByMe = item.requester_id === currentUserId;
    const direction = isInitiatedByMe ? "initiated" : "received";

    const matchDirection =
      directionFilter === "all" ? true : directionFilter === direction;

    const matchType =
      typeFilter === "all" ? true : item.request_type === typeFilter;

    const matchStatus =
      statusFilter === "all" ? true : item.status === statusFilter;

    const matchSearch = matchKeyword(keyword, [
      item.direction_text,
      item.request_type,
      formatContactType(item.request_type),
      item.status,
      formatContactStatus(item.status),
      item.related_title,
      item.related_status,

      item.counterpart_company_name,
      item.counterpart_contact_name,
      item.counterpart_contact_phone,
      item.counterpart_contact_email,

      item.requester_company_name,
      item.requester_contact_name,
      item.requester_contact_phone,
      item.requester_contact_email,

      item.target_company_name,
      item.target_contact_name,
      item.target_contact_phone,
      item.target_contact_email,

      item.created_at,
      item.contact_opened_at,
    ]);

    return matchDirection && matchType && matchStatus && matchSearch;
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

  function resetFilters() {
    setDirectionFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
    setKeyword("");
    setCurrentPage(1);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="联系记录"
          description="查看我发起或收到的联系申请，以及对方企业联系方式和关联货源 / 船源信息。"
        />

        <div className="mb-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="rounded-xl border px-4 py-3 text-sm"
            placeholder="搜索企业、联系人、电话、邮箱、货源、船源、港口"
          />

          <select
            value={directionFilter}
            onChange={(event) => setDirectionFilter(event.target.value)}
            className="rounded-xl border bg-white px-3 py-3 text-sm"
          >
            <option value="all">全部方向</option>
            <option value="initiated">我发起的联系</option>
            <option value="received">我收到的联系</option>
          </select>

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
            onClick={resetFilters}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            重置筛选
          </button>
        </div>

        <div className="mb-4 text-sm text-slate-500">
          共 {contactList.length} 条联系记录，筛选后 {filteredContactList.length}{" "}
          条，当前第 {safeCurrentPage} / {totalPages} 页。
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取联系记录...
          </div>
        ) : contactList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            暂无联系记录。
          </div>
        ) : filteredContactList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            暂无符合条件的联系记录。
          </div>
        ) : (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="grid gap-5">
              {paginatedContactList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {item.direction_text}
                    </span>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                      {formatContactType(item.request_type)}
                    </span>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                      {formatContactStatus(item.status)}
                    </span>

                    {item.related_status ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                        关联资源状态：{item.related_status}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm font-medium text-slate-800">
                    {item.related_title || "未关联资源"}
                  </p>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-bold text-slate-800">对方企业信息</p>

                    <div className="mt-2 grid gap-1 md:grid-cols-2">
                      <p>
                        企业：
                        {item.counterpart_company_name || "未填写企业名称"}
                      </p>
                      <p>
                        联系人：
                        {item.counterpart_contact_name || "未填写联系人"}
                      </p>
                      <p>
                        电话：
                        {item.counterpart_contact_phone || "未填写"}
                      </p>
                      <p>
                        邮箱：
                        {item.counterpart_contact_email || "未填写"}
                      </p>
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