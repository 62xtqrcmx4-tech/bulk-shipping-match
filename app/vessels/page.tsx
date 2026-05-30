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
  publisher_business_license_path?: string | null;
};

type CompanyProfile = {
  user_id: string;
  company_name: string;
  verification_status: string;
  business_license_path: string | null;
};

type CurrentUserProfile = {
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
  return status;
}

function formatCapacityUnit(unit: string | null) {
  if (!unit) return "DWT";
  if (unit === "piece") return "件";
  if (unit === "other") return "其他";
  return unit;
}

function formatVerificationStatus(status?: string, licensePath?: string | null) {
  if (status === "approved") return "已认证";
  if (status === "pending" && licensePath) return "证照已提交，待审核";
  if (status === "rejected") return "认证驳回";
  if (licensePath) return "证照已提交";
  return "未认证";
}

function getVerificationBadgeClass(status?: string) {
  if (status === "approved") {
    return "rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700";
  }

  if (status === "pending") {
    return "rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700";
  }

  if (status === "rejected") {
    return "rounded-full bg-red-50 px-3 py-1 text-xs text-red-700";
  }

  return "rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600";
}

export default function VesselsPage() {
  const [vesselList, setVesselList] = useState<VesselSupply[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [contactingId, setContactingId] = useState<string | null>(null);

  const [transportTypeFilter, setTransportTypeFilter] = useState("all");
  const [capacityUnitFilter, setCapacityUnitFilter] = useState("all");
  const [minCapacity, setMinCapacity] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [vesselTypeKeyword, setVesselTypeKeyword] = useState("");
  const [cargoKeyword, setCargoKeyword] = useState("");
  const [areaKeyword, setAreaKeyword] = useState("");

  useEffect(() => {
    async function fetchVessels() {
      setLoading(true);
      setErrorMessage("");

      const { data: userData } = await supabase.auth.getUser();
      const loggedIn = !!userData.user;
      setIsLoggedIn(loggedIn);

      const { data, error } = await supabase
        .from("vessel_supply")
        .select(
          "id, publisher_id, transport_type, vessel_type, dwt, capacity_unit, current_port_or_area, current_destination_port, available_start_date, available_end_date, service_area, regular_route, is_ballast_return, is_idle_slot, acceptable_cargo_types, information_expiry_date, status, remark, created_at"
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      const publishedOnly = ((data || []) as VesselSupply[]).filter(
        (item) => item.status === "published"
      );

      if (publishedOnly.length === 0) {
        setVesselList([]);
        setLoading(false);
        return;
      }

      if (!loggedIn) {
        setVesselList(publishedOnly);
        setLoading(false);
        return;
      }

      const publisherIds = Array.from(
        new Set(publishedOnly.map((item) => item.publisher_id).filter(Boolean))
      );

      let profiles: CompanyProfile[] = [];

      if (publisherIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("company_verification")
          .select(
            "user_id, company_name, verification_status, business_license_path"
          )
          .in("user_id", publisherIds);

        if (profileError) {
          console.error(profileError);
        } else {
          profiles = (profileData || []) as CompanyProfile[];
        }
      }

      const profileMap = new Map<string, CompanyProfile>();

      profiles.forEach((profile) => {
        if (!profileMap.has(profile.user_id)) {
          profileMap.set(profile.user_id, profile);
        }
      });

      const merged = publishedOnly.map((vessel) => {
        const profile = profileMap.get(vessel.publisher_id);

        return {
          ...vessel,
          publisher_company_name: profile?.company_name || "未公开企业名称",
          publisher_verification_status: profile?.verification_status || "",
          publisher_business_license_path:
            profile?.business_license_path || null,
        };
      });

      setVesselList(merged);
      setLoading(false);
    }

    fetchVessels();
  }, []);

  const filteredVesselList = vesselList.filter((item) => {
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

    const vesselText = vesselTypeKeyword.trim().toLowerCase();
    const cargoText = cargoKeyword.trim().toLowerCase();
    const areaText = areaKeyword.trim().toLowerCase();

    const matchVesselType =
      vesselText === ""
        ? true
        : item.vessel_type.toLowerCase().includes(vesselText);

    const matchCargo =
      cargoText === ""
        ? true
        : Array.isArray(item.acceptable_cargo_types)
          ? item.acceptable_cargo_types
              .join(" ")
              .toLowerCase()
              .includes(cargoText)
          : false;

    const matchArea =
      areaText === ""
        ? true
        : [
            item.current_port_or_area,
            item.current_destination_port || "",
            item.service_area,
            item.regular_route || "",
            item.remark || "",
            isLoggedIn ? item.publisher_company_name || "" : "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(areaText);

    return (
      matchTransportType &&
      matchCapacityUnit &&
      matchMinCapacity &&
      matchMaxCapacity &&
      matchVesselType &&
      matchCargo &&
      matchArea
    );
  });

  async function checkContactPermission(currentUserId: string) {
    const { data: profileData, error: profileError } = await supabase
      .from("company_verification")
      .select("verification_status, business_license_path, rejected_reason")
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (profileError) {
      alert(`读取企业资料失败：${profileError.message}`);
      return false;
    }

    if (!profileData) {
      alert("未找到企业资料，请先完成注册和企业资料提交。");
      window.location.href = "/register";
      return false;
    }

    const profile = profileData as CurrentUserProfile;

    if (!profile.business_license_path) {
      alert("请先上传营业执照或企业资质文件后再申请联系。");
      return false;
    }

    if (profile.verification_status === "rejected") {
      alert(
        `企业认证已被驳回，暂不能申请联系。驳回原因：${
          profile.rejected_reason || "未填写"
        }`
      );
      return false;
    }

    return true;
  }

  async function handleContact(item: VesselSupply) {
    setContactingId(item.id);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setContactingId(null);
      alert("请先登录后再申请联系。");
      window.location.href = "/login";
      return;
    }

    const currentUserId = userData.user.id;

    if (currentUserId === item.publisher_id) {
      setContactingId(null);
      alert("不能申请联系自己发布的船源。");
      return;
    }

    const allowed = await checkContactPermission(currentUserId);

    if (!allowed) {
      setContactingId(null);
      return;
    }

    const { error } = await supabase.from("contact_request").insert({
      requester_id: currentUserId,
      target_user_id: item.publisher_id,
      cargo_demand_id: null,
      vessel_supply_id: item.id,
      request_type: "cargo_to_vessel",
      request_message: "我对该船源感兴趣，希望获取联系方式。",
      auto_approved: true,
      status: "opened",
      contact_opened_at: new Date().toISOString(),
    });

    setContactingId(null);

    if (error) {
      console.error(error);
      alert(`申请联系失败：${error.message}`);
      return;
    }

    alert("联系申请已提交。");
  }

  function resetFilters() {
    setTransportTypeFilter("all");
    setCapacityUnitFilter("all");
    setMinCapacity("");
    setMaxCapacity("");
    setVesselTypeKeyword("");
    setCargoKeyword("");
    setAreaKeyword("");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="船源大厅"
          description="查看已审核发布的可用船舶与空档船期。支持按船型、可承运货种、区域、备注和运力区间筛选。"
          actionHref="/publish-vessel"
          actionText="发布船源"
        />

        {!isLoggedIn ? (
          <div className="mb-6 rounded-2xl bg-blue-50 p-4 text-sm text-blue-700 ring-1 ring-blue-100">
            当前为游客浏览模式。登录后可查看发布方企业名称和认证状态，并可申请联系。
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-7">
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
            value={vesselTypeKeyword}
            onChange={(event) => setVesselTypeKeyword(event.target.value)}
            className="rounded-xl border px-3 py-2"
            placeholder="搜索船型"
          />

          <input
            value={cargoKeyword}
            onChange={(event) => setCargoKeyword(event.target.value)}
            className="rounded-xl border px-3 py-2"
            placeholder="搜索货种"
          />

          <input
            value={areaKeyword}
            onChange={(event) => setAreaKeyword(event.target.value)}
            className="rounded-xl border px-3 py-2"
            placeholder="关键词搜索"
          />
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            共 {vesselList.length} 条船源，当前显示 {filteredVesselList.length} 条。
            <span className="ml-2">
              运力区间会结合所选运力单位筛选，建议先选择 DWT 或 TEU。
            </span>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          >
            重置筛选
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取船源数据...
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl bg-red-50 p-5 text-red-700 ring-1 ring-red-200">
            数据读取失败：{errorMessage}
          </div>
        ) : vesselList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            暂无已审核通过的船源数据。你可以先发布一条测试船源，并在后台审核通过。
          </div>
        ) : filteredVesselList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            没有符合筛选条件的船源。
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredVesselList.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold">{item.vessel_type}</h2>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                        {formatTransportType(item.transport_type)}
                      </span>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                        {formatStatus(item.status)}
                      </span>

                      {isLoggedIn ? (
                        <span
                          className={getVerificationBadgeClass(
                            item.publisher_verification_status
                          )}
                        >
                          {formatVerificationStatus(
                            item.publisher_verification_status,
                            item.publisher_business_license_path
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

                    {isLoggedIn ? (
                      <p className="mt-2 text-sm text-slate-500">
                        发布方：
                        {item.publisher_company_name || "未公开企业名称"}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-slate-400">
                        登录后可查看发布方企业信息
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleContact(item)}
                    disabled={contactingId === item.id}
                    className="rounded-xl border border-blue-700 px-5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                  >
                    {contactingId === item.id ? "提交中..." : "申请联系"}
                  </button>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-4">
                  <p>
                    运力规模：{item.dwt} {formatCapacityUnit(item.capacity_unit)}
                  </p>
                  <p>可用开始：{item.available_start_date}</p>
                  <p>
                    可承运：
                    {Array.isArray(item.acceptable_cargo_types)
                      ? item.acceptable_cargo_types.join("、")
                      : ""}
                  </p>
                  <p>有效期至：{item.information_expiry_date}</p>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <p>服务区域：{item.service_area}</p>
                  <p>常跑航线：{item.regular_route || "未填写"}</p>
                </div>

                {item.remark ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    <span className="font-medium text-slate-800">备注：</span>
                    {item.remark}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}