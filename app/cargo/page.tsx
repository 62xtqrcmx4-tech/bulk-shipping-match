"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import PageHeader from "../../components/PageHeader";

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

function formatTransportType(type: string) {
  if (type === "domestic") return "内贸";
  if (type === "international") return "外贸";
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

function formatCargoUnit(unit: string) {
  if (unit === "ton") return "吨";
  if (unit === "teu") return "TEU";
  if (unit === "cbm") return "立方米";
  if (unit === "piece") return "件";
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

export default function CargoPage() {
  const [cargoList, setCargoList] = useState<CargoDemand[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [contactingId, setContactingId] = useState<string | null>(null);

  const [transportTypeFilter, setTransportTypeFilter] = useState("all");
  const [cargoTypeFilter, setCargoTypeFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");

  useEffect(() => {
    async function fetchCargo() {
      setLoading(true);
      setErrorMessage("");

      const { data: userData } = await supabase.auth.getUser();
      const loggedIn = !!userData.user;
      setIsLoggedIn(loggedIn);

      const { data, error } = await supabase
        .from("cargo_demand")
        .select(
          "id, publisher_id, transport_type, cargo_type, cargo_quantity, cargo_unit, loading_port, discharge_port, planned_loading_date, expected_vessel_type, information_expiry_date, status, remark, created_at"
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      const publishedOnly = ((data || []) as CargoDemand[]).filter(
        (item) => item.status === "published"
      );

      if (publishedOnly.length === 0) {
        setCargoList([]);
        setLoading(false);
        return;
      }

      if (!loggedIn) {
        setCargoList(publishedOnly);
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

      const merged = publishedOnly.map((cargo) => {
        const profile = profileMap.get(cargo.publisher_id);

        return {
          ...cargo,
          publisher_company_name: profile?.company_name || "未公开企业名称",
          publisher_verification_status: profile?.verification_status || "",
          publisher_business_license_path:
            profile?.business_license_path || null,
        };
      });

      setCargoList(merged);
      setLoading(false);
    }

    fetchCargo();
  }, []);

  const filteredCargoList = cargoList.filter((item) => {
    const matchTransportType =
      transportTypeFilter === "all"
        ? true
        : item.transport_type === transportTypeFilter;

    const matchCargoType =
      cargoTypeFilter === "all" ? true : item.cargo_type === cargoTypeFilter;

    const keywordText = keyword.trim().toLowerCase();

    const matchKeyword =
      keywordText === ""
        ? true
        : [
            item.cargo_type,
            item.loading_port,
            item.discharge_port,
            item.expected_vessel_type,
            item.remark || "",
            isLoggedIn ? item.publisher_company_name || "" : "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(keywordText);

    const minQuantityValue =
      minQuantity.trim() === "" ? null : Number(minQuantity);

    const maxQuantityValue =
      maxQuantity.trim() === "" ? null : Number(maxQuantity);

    const matchMinQuantity =
      minQuantityValue === null ||
      Number.isNaN(minQuantityValue) ||
      item.cargo_quantity >= minQuantityValue;

    const matchMaxQuantity =
      maxQuantityValue === null ||
      Number.isNaN(maxQuantityValue) ||
      item.cargo_quantity <= maxQuantityValue;

    return (
      matchTransportType &&
      matchCargoType &&
      matchKeyword &&
      matchMinQuantity &&
      matchMaxQuantity
    );
  });

  async function handleContact(item: CargoDemand) {
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
      alert("不能申请联系自己发布的货源。");
      return;
    }

    const { error } = await supabase.from("contact_request").insert({
      requester_id: currentUserId,
      target_user_id: item.publisher_id,
      cargo_demand_id: item.id,
      vessel_supply_id: null,
      request_type: "vessel_to_cargo",
      request_message: "我对该货源感兴趣，希望获取联系方式。",
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
    setCargoTypeFilter("all");
    setKeyword("");
    setMinQuantity("");
    setMaxQuantity("");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="货源大厅"
          description="查看已审核发布的大宗散货、集装箱货物及特种货运输需求。支持按货种、港口、船型、备注和货量区间筛选。"
          actionHref="/publish-cargo"
          actionText="发布货源"
        />

        {!isLoggedIn ? (
          <div className="mb-6 rounded-2xl bg-blue-50 p-4 text-sm text-blue-700 ring-1 ring-blue-100">
            当前为游客浏览模式。登录后可查看发布方企业名称和认证状态，并可申请联系。
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-6">
          <select
            value={transportTypeFilter}
            onChange={(event) => setTransportTypeFilter(event.target.value)}
            className="rounded-xl border px-3 py-2"
          >
            <option value="all">全部运输类型</option>
            <option value="domestic">内贸</option>
            <option value="international">外贸</option>
          </select>

          <select
            value={cargoTypeFilter}
            onChange={(event) => setCargoTypeFilter(event.target.value)}
            className="rounded-xl border px-3 py-2"
          >
            <option value="all">全部货种</option>
            <option value="铁矿石">铁矿石</option>
            <option value="煤炭">煤炭</option>
            <option value="粮食">粮食</option>
            <option value="建材">建材</option>
            <option value="集装箱货物">集装箱货物</option>
            <option value="特种货物">特种货物</option>
            <option value="重大件">重大件</option>
            <option value="其他">其他</option>
          </select>

          <input
            value={minQuantity}
            onChange={(event) => setMinQuantity(event.target.value)}
            type="number"
            min="0"
            step="0.01"
            className="rounded-xl border px-3 py-2"
            placeholder="最小货量"
          />

          <input
            value={maxQuantity}
            onChange={(event) => setMaxQuantity(event.target.value)}
            type="number"
            min="0"
            step="0.01"
            className="rounded-xl border px-3 py-2"
            placeholder="最大货量"
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
          共 {cargoList.length} 条货源，当前显示 {filteredCargoList.length} 条。
          <span className="ml-2">
            货量区间按各货源自身单位筛选，请结合单位查看。
          </span>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取货源数据...
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl bg-red-50 p-5 text-red-700 ring-1 ring-red-200">
            数据读取失败：{errorMessage}
          </div>
        ) : cargoList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            暂无已审核通过的货源数据。你可以先发布一条测试货源，并在后台审核通过。
          </div>
        ) : filteredCargoList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            没有符合筛选条件的货源。
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredCargoList.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold">{item.cargo_type}</h2>

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
                    </div>

                    <p className="mt-2 text-slate-600">
                      {item.loading_port} → {item.discharge_port}
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
                    货量：{item.cargo_quantity} {formatCargoUnit(item.cargo_unit)}
                  </p>
                  <p>计划装货：{item.planned_loading_date}</p>
                  <p>期望船型：{item.expected_vessel_type}</p>
                  <p>有效期至：{item.information_expiry_date}</p>
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