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
};

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
  contacts?: ContactRequest[];
};

type CompanyProfile = {
  user_id: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
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
  return status;
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

function formatContactType(type: string) {
  if (type === "cargo_to_vessel") return "货方联系船源";
  if (type === "vessel_to_cargo") return "船方联系货源";
  return type || "联系申请";
}

export default function MyVesselsPage() {
  const [vesselList, setVesselList] = useState<VesselSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [transportTypeFilter, setTransportTypeFilter] = useState("all");
  const [capacityUnitFilter, setCapacityUnitFilter] = useState("all");
  const [minCapacity, setMinCapacity] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [keyword, setKeyword] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function fetchMyVessels() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      alert("请先登录后查看我发布的船源。");
      window.location.href = "/login";
      return;
    }

    const userId = userData.user.id;

    const { data: vesselData, error: vesselError } = await supabase
      .from("vessel_supply")
      .select(
        "id, publisher_id, transport_type, vessel_type, dwt, capacity_unit, current_port_or_area, current_destination_port, available_start_date, available_end_date, service_area, regular_route, is_ballast_return, is_idle_slot, acceptable_cargo_types, information_expiry_date, status, rejected_reason, remark, created_at"
      )
      .eq("publisher_id", userId)
      .order("created_at", { ascending: false });

    if (vesselError) {
      alert(`读取我的船源失败：${vesselError.message}`);
      setLoading(false);
      return;
    }

    const vessels = (vesselData || []) as VesselSupply[];

    if (vessels.length === 0) {
      setVesselList([]);
      setLoading(false);
      return;
    }

    const vesselIds = vessels.map((item) => item.id);

    const { data: contactData, error: contactError } = await supabase
      .from("contact_request")
      .select(
        "id, requester_id, target_user_id, cargo_demand_id, vessel_supply_id, request_type, status, created_at, contact_opened_at"
      )
      .in("vessel_supply_id", vesselIds)
      .order("created_at", { ascending: false });

    if (contactError) {
      alert(`读取船源联系记录失败：${contactError.message}`);
      setVesselList(vessels);
      setLoading(false);
      return;
    }

    const contacts = (contactData || []) as ContactRequest[];

    const requesterIds = Array.from(
      new Set(contacts.map((item) => item.requester_id).filter(Boolean))
    );

    let profiles: CompanyProfile[] = [];

    if (requesterIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from("company_verification")
        .select(
          "user_id, company_name, contact_name, contact_phone, contact_email"
        )
        .in("user_id", requesterIds);

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

    const contactsWithProfiles = contacts.map((contact) => {
      const profile = profileMap.get(contact.requester_id);

      return {
        ...contact,
        requester_company_name: profile?.company_name || "",
        requester_contact_name: profile?.contact_name || "",
        requester_contact_phone: profile?.contact_phone || "",
        requester_contact_email: profile?.contact_email || "",
      };
    });

    const merged = vessels.map((vessel) => ({
      ...vessel,
      contacts: contactsWithProfiles.filter(
        (contact) => contact.vessel_supply_id === vessel.id
      ),
    }));

    setVesselList(merged);
    setLoading(false);
  }

  useEffect(() => {
    fetchMyVessels();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    statusFilter,
    transportTypeFilter,
    capacityUnitFilter,
    minCapacity,
    maxCapacity,
    keyword,
    pageSize,
  ]);

  const filteredVesselList = vesselList.filter((item) => {
    const contacts = item.contacts || [];

    const matchStatus =
      statusFilter === "all" ? true : item.status === statusFilter;

    const matchTransportType =
      transportTypeFilter === "all"
        ? true
        : item.transport_type === transportTypeFilter;

    const currentCapacityUnit = item.capacity_unit || "DWT";

    const matchCapacityUnit =
      capacityUnitFilter === "all"
        ? true
        : currentCapacityUnit === capacityUnitFilter;

    const minCapacityValue =
      minCapacity.trim() === "" ? null : Number(minCapacity);

    const maxCapacityValue =
      maxCapacity.trim() === "" ? null : Number(maxCapacity);

    const matchMinCapacity =
      minCapacityValue === null ||
      Number.isNaN(minCapacityValue) ||
      item.dwt >= minCapacityValue;

    const matchMaxCapacity =
      maxCapacityValue === null ||
      Number.isNaN(maxCapacityValue) ||
      item.dwt <= maxCapacityValue;

    const keywordText = keyword.trim().toLowerCase();

    const matchKeyword =
      keywordText === ""
        ? true
        : [
            item.vessel_type,
            item.current_port_or_area,
            item.current_destination_port || "",
            item.service_area,
            item.regular_route || "",
            Array.isArray(item.acceptable_cargo_types)
              ? item.acceptable_cargo_types.join(" ")
              : "",
            item.rejected_reason || "",
            item.remark || "",
            contacts
              .map((contact) =>
                [
                  contact.requester_company_name || "",
                  contact.requester_contact_name || "",
                  contact.requester_contact_phone || "",
                  contact.requester_contact_email || "",
                  formatContactType(contact.request_type),
                  contact.created_at,
                  contact.contact_opened_at || "",
                ].join(" ")
              )
              .join(" "),
          ]
            .join(" ")
            .toLowerCase()
            .includes(keywordText);

    return (
      matchStatus &&
      matchTransportType &&
      matchCapacityUnit &&
      matchMinCapacity &&
      matchMaxCapacity &&
      matchKeyword
    );
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
    await fetchMyVessels();
  }

  function resetFilters() {
    setStatusFilter("all");
    setTransportTypeFilter("all");
    setCapacityUnitFilter("all");
    setMinCapacity("");
    setMaxCapacity("");
    setKeyword("");
    setCurrentPage(1);
  }

  function getContactDisplayName(contact: ContactRequest) {
    const company = contact.requester_company_name || "未填写企业名称";
    const person = contact.requester_contact_name || "未填写联系人";
    return `${company}｜${person}`;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="我发布的船源"
          description="管理我发布的船源信息，查看联系该船源的货方，并关闭已失效的船源。"
          actionHref="/publish-vessel"
          actionText="发布船源"
        />

        <div className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-7">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border px-3 py-2"
          >
            <option value="all">全部状态</option>
            <option value="pending">待审核</option>
            <option value="published">可联系</option>
            <option value="closed">已关闭</option>
            <option value="rejected">审核未通过</option>
            <option value="expired">已过期</option>
          </select>

          <select
            value={transportTypeFilter}
            onChange={(event) => setTransportTypeFilter(event.target.value)}
            className="rounded-xl border px-3 py-2"
          >
            <option value="all">全部运输类型</option>
            <option value="domestic">内贸</option>
            <option value="international">外贸</option>
            <option value="both">均可</option>
          </select>

          <select
            value={capacityUnitFilter}
            onChange={(event) => setCapacityUnitFilter(event.target.value)}
            className="rounded-xl border px-3 py-2"
          >
            <option value="all">全部运力单位</option>
            <option value="DWT">DWT</option>
            <option value="TEU">TEU</option>
            <option value="CBM">CBM</option>
            <option value="piece">件</option>
            <option value="other">其他</option>
          </select>

          <input
            value={minCapacity}
            onChange={(event) => setMinCapacity(event.target.value)}
            type="number"
            min="0"
            step="1"
            className="rounded-xl border px-3 py-2"
            placeholder="最小运力"
          />

          <input
            value={maxCapacity}
            onChange={(event) => setMaxCapacity(event.target.value)}
            type="number"
            min="0"
            step="1"
            className="rounded-xl border px-3 py-2"
            placeholder="最大运力"
          />

          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="rounded-xl border px-3 py-2"
            placeholder="关键词搜索"
          />

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl bg-slate-900 px-4 py-2 text-white"
          >
            重置筛选
          </button>
        </div>

        <div className="mb-4 text-sm text-slate-500">
          共 {vesselList.length} 条船源，筛选后 {filteredVesselList.length} 条，
          当前第 {safeCurrentPage} / {totalPages} 页。
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取我的船源...
          </div>
        ) : vesselList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            暂无我发布的船源。你可以先发布一条船源。
          </div>
        ) : filteredVesselList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            没有符合筛选条件的船源。
          </div>
        ) : (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="grid gap-6">
              {paginatedVesselList.map((item) => {
                const contacts = item.contacts || [];

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-bold">
                            {item.vessel_type}
                          </h2>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                            {formatTransportType(item.transport_type)}
                          </span>

                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                            {formatStatus(item.status)}
                          </span>

                          {item.is_ballast_return ? (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                              返程空载
                            </span>
                          ) : null}

                          {item.is_idle_slot ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
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
                          <p>可用开始：{item.available_start_date}</p>
                          <p>有效期至：{item.information_expiry_date}</p>
                          <p>
                            可承运：
                            {Array.isArray(item.acceptable_cargo_types)
                              ? item.acceptable_cargo_types.join("、")
                              : ""}
                          </p>
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                          <p>服务区域：{item.service_area}</p>
                          <p>常跑航线：{item.regular_route || "未填写"}</p>
                        </div>

                        {item.status === "rejected" &&
                        item.rejected_reason ? (
                          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                            <span className="font-semibold">
                              审核未通过原因：
                            </span>
                            {item.rejected_reason}
                          </div>
                        ) : null}

                        {item.remark ? (
                          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                            <span className="font-medium text-slate-800">
                              备注：
                            </span>
                            {item.remark}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => closeVessel(item.id)}
                          disabled={
                            updatingId === item.id || item.status === "closed"
                          }
                          className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          关闭船源
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 border-t pt-5">
                      <h3 className="font-bold">联系过该船源的货方</h3>

                      {contacts.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">
                          暂无货方联系该船源。
                        </p>
                      ) : (
                        <div className="mt-3 grid gap-3">
                          {contacts.map((contact) => (
                            <div
                              key={contact.id}
                              className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"
                            >
                              <p className="font-medium">
                                {getContactDisplayName(contact)}
                              </p>

                              <div className="mt-2 grid gap-1 text-slate-500 md:grid-cols-2">
                                <p>
                                  联系电话：
                                  {contact.requester_contact_phone || "未填写"}
                                </p>
                                <p>
                                  联系邮箱：
                                  {contact.requester_contact_email || "未填写"}
                                </p>
                                <p>
                                  联系类型：
                                  {formatContactType(contact.request_type)}
                                </p>
                                <p>
                                  申请时间：{formatDate(contact.created_at)}
                                </p>
                                <p>
                                  开放时间：
                                  {formatDate(contact.contact_opened_at)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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