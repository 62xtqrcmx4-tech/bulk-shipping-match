"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../../lib/supabase";
import PageHeader from "../../components/PageHeader";

const RouteMap = dynamic(() => import("../../components/RouteMap"), {
  ssr: false,
});

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

function runWithTimeout<T>(
  task: () => PromiseLike<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} 请求超时，请检查线上 Supabase 连接或 RLS 策略。`));
    }, timeoutMs);

    Promise.resolve(task()).then(
      (result) => {
        window.clearTimeout(timer);
        resolve(result);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

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

function formatCargoUnit(unit: string) {
  if (unit === "ton") return "吨";
  if (unit === "teu") return "TEU";
  if (unit === "cbm") return "立方米";
  if (unit === "piece") return "件";
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

export default function CargoPage() {
  const [cargoList, setCargoList] = useState<CargoDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserProfile, setCurrentUserProfile] =
    useState<CurrentUserProfile | null>(null);

  const [transportTypeFilter, setTransportTypeFilter] = useState("all");
  const [cargoTypeFilter, setCargoTypeFilter] = useState("all");
  const [publisherVerificationFilter, setPublisherVerificationFilter] =
    useState("all");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [keyword, setKeyword] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function fetchCurrentUserProfile() {
    const userResult = await runWithTimeout(
      () => supabase.auth.getUser(),
      12000,
      "读取当前用户"
    );

    const currentUser = userResult.data.user;

    if (!currentUser) {
      setCurrentUserId("");
      setCurrentUserProfile(null);
      return;
    }

    setCurrentUserId(currentUser.id);

    const profileResult = await runWithTimeout(
      () =>
        supabase
          .from("company_verification")
          .select(
            "user_id, company_name, verification_status, business_license_path, rejected_reason"
          )
          .eq("user_id", currentUser.id)
          .maybeSingle(),
      12000,
      "读取当前用户企业认证"
    );

    if (profileResult.error || !profileResult.data) {
      setCurrentUserProfile(null);
      return;
    }

    setCurrentUserProfile(profileResult.data as CurrentUserProfile);
  }

  async function fetchCargoList() {
    setLoading(true);
    setPageError("");

    try {
      const expireResult = await runWithTimeout(
        () => supabase.rpc("expire_outdated_listings"),
        12000,
        "处理过期货源"
      );

      if (expireResult.error) {
        console.error("过期信息处理失败：", expireResult.error);
      }

      const today = new Date().toISOString().slice(0, 10);

      const cargoResult = await runWithTimeout(
        () =>
          supabase
            .from("cargo_demand")
            .select(
              "id, publisher_id, transport_type, cargo_type, cargo_quantity, cargo_unit, loading_port, discharge_port, planned_loading_date, expected_vessel_type, information_expiry_date, status, remark, created_at"
            )
            .eq("status", "published")
            .gte("information_expiry_date", today)
            .order("created_at", { ascending: false }),
        15000,
        "读取货源列表"
      );

      if (cargoResult.error) {
        throw new Error(`读取货源失败：${cargoResult.error.message}`);
      }

      const cargos = (cargoResult.data || []) as CargoDemand[];

      if (cargos.length === 0) {
        setCargoList([]);
        return;
      }

      const publisherIds = Array.from(
        new Set(cargos.map((item) => item.publisher_id).filter(Boolean))
      );

      let profiles: CompanyProfile[] = [];

      if (publisherIds.length > 0) {
        const profileResult = await runWithTimeout(
          () =>
            supabase
              .from("public_company_profiles")
              .select("user_id, company_name, verification_status")
              .in("user_id", publisherIds),
          15000,
          "读取货源发布方企业信息"
        );

        if (profileResult.error) {
          console.error("读取发布方企业信息失败：", profileResult.error);
        } else {
          profiles = (profileResult.data || []) as CompanyProfile[];
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
          publisher_verification_status: profile?.verification_status || "",
        };
      });

      setCargoList(merged);
    } catch (error) {
      console.error("货源大厅读取失败：", error);

      const message =
        error instanceof Error
          ? error.message
          : "货源大厅读取失败，请稍后重试。";

      setPageError(message);
      setCargoList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function initPage() {
      try {
        await fetchCurrentUserProfile();
      } catch (error) {
        console.error("读取当前用户信息失败：", error);
        setCurrentUserId("");
        setCurrentUserProfile(null);
      }

      await fetchCargoList();
    }

    initPage();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      try {
        await fetchCurrentUserProfile();
      } catch (error) {
        console.error("登录状态变化后读取用户信息失败：", error);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    transportTypeFilter,
    cargoTypeFilter,
    publisherVerificationFilter,
    minQuantity,
    maxQuantity,
    keyword,
    pageSize,
  ]);

  const filteredCargoList = cargoList.filter((item) => {
    const matchTransportType =
      transportTypeFilter === "all"
        ? true
        : item.transport_type === transportTypeFilter;

    const matchCargoType =
      cargoTypeFilter === "all" ? true : item.cargo_type === cargoTypeFilter;

    const currentPublisherStatus = item.publisher_verification_status || "";

    const matchPublisherVerification =
      publisherVerificationFilter === "all"
        ? true
        : publisherVerificationFilter === "unverified"
          ? currentPublisherStatus === ""
          : currentPublisherStatus === publisherVerificationFilter;

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

    const matchSearch = matchKeyword(keyword, [
      item.cargo_type,
      item.loading_port,
      item.discharge_port,
      item.expected_vessel_type,
      item.cargo_quantity,
      item.cargo_unit,
      item.transport_type,
      item.remark,
      item.publisher_company_name,
      item.publisher_verification_status,
    ]);

    return (
      matchTransportType &&
      matchCargoType &&
      matchPublisherVerification &&
      matchMinQuantity &&
      matchMaxQuantity &&
      matchSearch
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredCargoList.length / pageSize));

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCargoList = filteredCargoList.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  function resetFilters() {
    setTransportTypeFilter("all");
    setCargoTypeFilter("all");
    setPublisherVerificationFilter("all");
    setMinQuantity("");
    setMaxQuantity("");
    setKeyword("");
    setCurrentPage(1);
  }

  function validateCanRequestContact(cargo: CargoDemand) {
    if (!currentUserId) {
      alert("请先登录后申请联系。");
      window.location.href = "/login";
      return false;
    }

    if (currentUserId === cargo.publisher_id) {
      alert("不能申请联系自己发布的货源。");
      return false;
    }

    if (cargo.status !== "published") {
      alert("该货源当前不可联系。");
      return false;
    }

    const today = new Date().toISOString().slice(0, 10);

    if (cargo.information_expiry_date < today) {
      alert("该货源已过期，不能申请联系。");
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

  async function requestContact(cargo: CargoDemand) {
    if (!validateCanRequestContact(cargo)) return;

    setRequestingId(cargo.id);

    try {
      const existingResult = await runWithTimeout(
        () =>
          supabase
            .from("contact_request")
            .select("id")
            .eq("requester_id", currentUserId)
            .eq("cargo_demand_id", cargo.id)
            .maybeSingle(),
        12000,
        "检查货源联系申请"
      );

      if (existingResult.error) {
        alert(`检查联系申请失败：${existingResult.error.message}`);
        return;
      }

      if (existingResult.data) {
        alert("你已经申请联系过该货源。");
        return;
      }

      const insertResult = await runWithTimeout(
        () =>
          supabase.from("contact_request").insert({
            requester_id: currentUserId,
            target_user_id: cargo.publisher_id,
            cargo_demand_id: cargo.id,
            vessel_supply_id: null,
            request_type: "vessel_to_cargo",
            status: "opened",
            contact_opened_at: new Date().toISOString(),
          }),
        12000,
        "提交货源联系申请"
      );

      if (insertResult.error) {
        const message = insertResult.error.message || "";

        if (
          message.includes("unique_contact_requester_cargo") ||
          message.includes("duplicate key value")
        ) {
          alert("你已经申请联系过该货源。");
        } else {
          alert(`申请联系失败：${message}`);
        }

        return;
      }

      alert("联系申请已提交。货方将在“我的货源”中看到你的企业联系方式。");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "申请联系失败，请稍后重试。";
      alert(message);
    } finally {
      setRequestingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="货源大厅"
          description="浏览已审核发布且未过期的货源信息。可按货种、运输类型、货量区间、发布方认证状态、港口和备注关键词进行筛选。"
          actionHref="/publish-cargo"
          actionText="发布货源"
        />

        <div className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-8">
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
            className="rounded-xl border px-3 py-2 md:col-span-2"
            placeholder="关键词搜索：港口、货种、船型、备注"
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
          共 {cargoList.length} 条未过期货源，筛选后 {filteredCargoList.length}{" "}
          条，当前第 {safeCurrentPage} / {totalPages} 页。
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取货源信息...
          </div>
        ) : pageError ? (
          <div className="rounded-2xl bg-red-50 p-8 text-center text-red-700 shadow-sm ring-1 ring-red-100">
            <p className="font-semibold">货源信息读取失败</p>
            <p className="mt-2 text-sm">{pageError}</p>
            <button
              onClick={fetchCargoList}
              className="mt-4 rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              重新读取
            </button>
          </div>
        ) : filteredCargoList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            暂无符合条件的未过期货源。
          </div>
        ) : (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="grid gap-5">
              {paginatedCargoList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold">{item.cargo_type}</h2>

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
                      </div>

                      <p className="mt-2 text-slate-600">
                        {item.loading_port} → {item.discharge_port}
                      </p>
                    </div>

                    <button
                      onClick={() => requestContact(item)}
                      disabled={
                        requestingId === item.id ||
                        currentUserId === item.publisher_id
                      }
                      className="shrink-0 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {requestingId === item.id ? "申请中..." : "申请联系"}
                    </button>
                  </div>

                  <div className="mt-5 overflow-x-auto" style={{ width: "100%" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "360px 760px",
                        columnGap: "24px",
                        alignItems: "start",
                        minWidth: "1144px",
                      }}
                    >
                      <div style={{ width: 360 }}>
                        <div className="grid gap-2 text-sm text-slate-600">
                          <p>
                            货量：{item.cargo_quantity}{" "}
                            {formatCargoUnit(item.cargo_unit)}
                          </p>
                          <p>
                            计划装货：
                            {formatDate(item.planned_loading_date)}
                          </p>
                          <p>期望船型：{item.expected_vessel_type}</p>
                          <p>
                            有效期至：
                            {formatDate(item.information_expiry_date)}
                          </p>
                        </div>

                        {currentUserId ? (
                          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                            <p className="font-bold text-slate-800">
                              发布方信息
                            </p>
                            <p className="mt-2">
                              企业名称：
                              {item.publisher_company_name ||
                                "未填写企业名称"}
                            </p>
                            <p className="mt-1">
                              认证状态：
                              {formatVerificationStatus(
                                item.publisher_verification_status
                              )}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
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

                      <div
                        className="rounded-2xl bg-slate-50 p-4"
                        style={{ width: 760 }}
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              航线示意图
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.loading_port} → {item.discharge_port}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
                            高德地图示意
                          </span>
                        </div>

                        <RouteMap
                          loadPort={item.loading_port}
                          dischargePort={item.discharge_port}
                          height={250}
                          fromLabel="装货港"
                          toLabel="卸货港"
                          emptyText="暂未配置该航线的港口坐标，当前无法显示地图"
                        />
                      </div>
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