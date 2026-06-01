"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import PageHeader from "../../components/PageHeader";

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
  remark: string | null;
  created_at: string;

  publisher_company_name?: string;
  publisher_verification_status?: string;
};

type CompanyProfile = {
  user_id: string;
  company_name: string;
  verification_status: string;
};

type CurrentUserProfile = {
  user_id: string;
  company_name: string;
  verification_status: string;
  business_license_path: string | null;
  rejected_reason: string | null;
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

function formatVerificationStatus(status?: string) {
  if (status === "approved") return "已认证";
  if (status === "pending") return "证照已提交，待审核";
  if (status === "rejected") return "认证驳回";
  return "未认证";
}

function getVerificationBadgeClass(status?: string) {
  if (status === "approved") {
    return "rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700";
  }

  if (status === "pending") {
    return "rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700";
  }

  if (status === "rejected") {
    return "rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700";
  }

  return "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600";
}

function formatDate(value: string | null) {
  if (!value) return "未记录";
  return new Date(value).toLocaleDateString("zh-CN");
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

export default function VesselsPage() {
  const [vesselList, setVesselList] = useState<VesselSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserProfile, setCurrentUserProfile] =
    useState<CurrentUserProfile | null>(null);

  const [transportTypeFilter, setTransportTypeFilter] = useState("all");
  const [vesselTypeFilter, setVesselTypeFilter] = useState("all");
  const [capacityUnitFilter, setCapacityUnitFilter] = useState("all");
  const [publisherVerificationFilter, setPublisherVerificationFilter] =
    useState("all");
  const [minCapacity, setMinCapacity] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [keyword, setKeyword] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function fetchCurrentUserProfile() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setCurrentUserId("");
      setCurrentUserProfile(null);
      return;
    }

    setCurrentUserId(userData.user.id);

    const { data, error } = await supabase
      .from("company_verification")
      .select(
        "user_id, company_name, verification_status, business_license_path, rejected_reason"
      )
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (error || !data) {
      setCurrentUserProfile(null);
      return;
    }

    setCurrentUserProfile(data as CurrentUserProfile);
  }

  async function fetchVesselList() {
    setLoading(true);

    const { error: expireError } = await supabase.rpc(
      "expire_outdated_listings"
    );

    if (expireError) {
      console.error("过期信息处理失败：", expireError);
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data: vesselData, error: vesselError } = await supabase
      .from("vessel_supply")
      .select(
        "id, publisher_id, transport_type, vessel_type, dwt, capacity_unit, current_port_or_area, current_destination_port, available_start_date, available_end_date, service_area, regular_route, is_ballast_return, is_idle_slot, acceptable_cargo_types, information_expiry_date, status, remark, created_at"
      )
      .eq("status", "published")
      .gte("information_expiry_date", today)
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
        .from("public_company_profiles")
        .select("user_id, company_name, verification_status")
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
        publisher_verification_status: profile?.verification_status || "",
      };
    });

    setVesselList(merged);
    setLoading(false);
  }

  useEffect(() => {
    async function initPage() {
      await fetchCurrentUserProfile();
      await fetchVesselList();
    }

    initPage();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      await fetchCurrentUserProfile();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    transportTypeFilter,
    vesselTypeFilter,
    capacityUnitFilter,
    publisherVerificationFilter,
    minCapacity,
    maxCapacity,
    keyword,
    pageSize,
  ]);

  const filteredVesselList = vesselList.filter((item) => {
    const matchTransportType =
      transportTypeFilter === "all"
        ? true
        : item.transport_type === transportTypeFilter;

    const matchVesselType =
      vesselTypeFilter === "all" ? true : item.vessel_type === vesselTypeFilter;

    const currentCapacityUnit = item.capacity_unit || "DWT";

    const matchCapacityUnit =
      capacityUnitFilter === "all"
        ? true
        : currentCapacityUnit === capacityUnitFilter;

    const currentPublisherStatus = item.publisher_verification_status || "";

    const matchPublisherVerification =
      publisherVerificationFilter === "all"
        ? true
        : publisherVerificationFilter === "unverified"
          ? currentPublisherStatus === ""
          : currentPublisherStatus === publisherVerificationFilter;

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
      item.remark,
      item.publisher_company_name,
      item.publisher_verification_status,
    ]);

    return (
      matchTransportType &&
      matchVesselType &&
      matchCapacityUnit &&
      matchPublisherVerification &&
      matchMinCapacity &&
      matchMaxCapacity &&
      matchSearch
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

  function resetFilters() {
    setTransportTypeFilter("all");
    setVesselTypeFilter("all");
    setCapacityUnitFilter("all");
    setPublisherVerificationFilter("all");
    setMinCapacity("");
    setMaxCapacity("");
    setKeyword("");
    setCurrentPage(1);
  }

  function validateCanRequestContact(vessel: VesselSupply) {
    if (!currentUserId) {
      alert("请先登录后申请联系。");
      window.location.href = "/login";
      return false;
    }

    if (currentUserId === vessel.publisher_id) {
      alert("不能申请联系自己发布的船源。");
      return false;
    }

    if (vessel.status !== "published") {
      alert("该船源当前不可联系。");
      return false;
    }

    const today = new Date().toISOString().slice(0, 10);

    if (vessel.information_expiry_date < today) {
      alert("该船源已过期，不能申请联系。");
      return false;
    }

    if (!currentUserProfile) {
      alert("请先提交企业资料和营业执照后，再申请联系。");
      window.location.href = "/my-profile";
      return false;
    }

    if (!currentUserProfile.business_license_path) {
      alert("请先上传营业执照或企业资质文件后，再申请联系。");
      window.location.href = "/my-profile";
      return false;
    }

    if (currentUserProfile.verification_status === "rejected") {
      alert(
        `企业认证已被驳回，暂不能申请联系。驳回原因：${
          currentUserProfile.rejected_reason || "未填写"
        }`
      );
      window.location.href = "/my-profile";
      return false;
    }

    if (
      currentUserProfile.verification_status !== "pending" &&
      currentUserProfile.verification_status !== "approved"
    ) {
      alert("请先提交企业认证资料后，再申请联系。");
      window.location.href = "/my-profile";
      return false;
    }

    return true;
  }

  async function requestContact(vessel: VesselSupply) {
    if (!validateCanRequestContact(vessel)) return;

    setRequestingId(vessel.id);

    const { data: existingData, error: existingError } = await supabase
      .from("contact_request")
      .select("id")
      .eq("requester_id", currentUserId)
      .eq("vessel_supply_id", vessel.id)
      .maybeSingle();

    if (existingError) {
      setRequestingId(null);
      alert(`检查联系申请失败：${existingError.message}`);
      return;
    }

    if (existingData) {
      setRequestingId(null);
      alert("你已经申请联系过该船源。");
      return;
    }

    const { error } = await supabase.from("contact_request").insert({
      requester_id: currentUserId,
      target_user_id: vessel.publisher_id,
      cargo_demand_id: null,
      vessel_supply_id: vessel.id,
      request_type: "cargo_to_vessel",
      status: "opened",
      contact_opened_at: new Date().toISOString(),
    });

    setRequestingId(null);

    if (error) {
      const message = error.message || "";

      if (
        message.includes("unique_contact_requester_vessel") ||
        message.includes("duplicate key value")
      ) {
        alert("你已经申请联系过该船源。");
      } else {
        alert(`申请联系失败：${message}`);
      }

      return;
    }

    alert("联系申请已提交。船方将在“我的船源”中看到你的企业联系方式。");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="船源大厅"
          description="浏览已审核发布且未过期的船源信息。可按船型、运输类型、运力单位、运力区间、发布方认证状态、区域和备注关键词进行筛选。"
          actionHref="/publish-vessel"
          actionText="发布船源"
        />

        <div className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-9">
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
            value={vesselTypeFilter}
            onChange={(event) => setVesselTypeFilter(event.target.value)}
            className="rounded-xl border px-3 py-2"
          >
            <option value="all">全部船型</option>
            <option value="散货船">散货船</option>
            <option value="集装箱船">集装箱船</option>
            <option value="多用途船">多用途船</option>
            <option value="重大件船">重大件船</option>
            <option value="杂货船">杂货船</option>
            <option value="其他">其他</option>
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

          <select
            value={publisherVerificationFilter}
            onChange={(event) =>
              setPublisherVerificationFilter(event.target.value)
            }
            className="rounded-xl border px-3 py-2"
          >
            <option value="all">全部认证状态</option>
            <option value="approved">已认证发布方</option>
            <option value="pending">待审核发布方</option>
            <option value="rejected">认证驳回发布方</option>
            <option value="unverified">未认证发布方</option>
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
            className="rounded-xl border px-3 py-2 md:col-span-2"
            placeholder="关键词搜索：船型、区域、货种、备注"
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
          共 {vesselList.length} 条未过期船源，筛选后{" "}
          {filteredVesselList.length} 条，当前第 {safeCurrentPage} /{" "}
          {totalPages} 页。
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取船源信息...
          </div>
        ) : filteredVesselList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            暂无符合条件的未过期船源。
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
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold">{item.vessel_type}</h2>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                          {formatTransportType(item.transport_type)}
                        </span>

                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                          {formatStatus(item.status)}
                        </span>

                        {currentUserId ? (
                          <span
                            className={getVerificationBadgeClass(
                              item.publisher_verification_status
                            )}
                          >
                            发布方
                            {formatVerificationStatus(
                              item.publisher_verification_status
                            )}
                          </span>
                        ) : null}

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

                      {currentUserId ? (
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                          <p className="font-bold text-slate-800">发布方信息</p>
                          <p className="mt-2">
                            企业名称：
                            {item.publisher_company_name || "未填写企业名称"}
                          </p>
                          <p className="mt-1">
                            认证状态：
                            {formatVerificationStatus(
                              item.publisher_verification_status
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
                          登录后可查看发布方企业信息和认证状态。
                        </div>
                      )}

                      {item.remark ? (
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                          <span className="font-medium text-slate-800">
                            备注：
                          </span>
                          {item.remark}
                        </div>
                      ) : null}

                      <p className="mt-3 text-xs text-slate-400">
                        发布时间：{formatDate(item.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => requestContact(item)}
                        disabled={
                          requestingId === item.id ||
                          currentUserId === item.publisher_id
                        }
                        className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {requestingId === item.id ? "申请中..." : "申请联系"}
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