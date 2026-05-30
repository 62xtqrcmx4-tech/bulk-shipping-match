"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import PageHeader from "../../components/PageHeader";

type CargoDemand = {
  id: string;
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
};

type VesselSupply = {
  id: string;
  transport_type: string;
  vessel_type: string;
  dwt: number;
  capacity_unit: string | null;
  current_port_or_area: string;
  available_start_date: string;
  acceptable_cargo_types: string[];
  information_expiry_date: string;
  status: string;
  remark: string | null;
  created_at: string;
};

type CompanyVerification = {
  id: string;
  user_id: string;
  user_type: string;
  company_name: string;
  unified_social_credit_code: string | null;
  company_type: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  main_business: string | null;
  business_license_path: string | null;
  business_license_uploaded_at: string | null;
  verification_status: string;
  verified_at: string | null;
  rejected_reason: string | null;
  created_at: string;
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

function formatUserType(type: string) {
  if (type === "cargo_owner") return "货方";
  if (type === "vessel_owner") return "船方";
  if (type === "broker") return "经纪 / 服务方";
  return type;
}

function formatVerificationStatus(status: string) {
  if (status === "pending") return "待审核";
  if (status === "approved") return "已认证";
  if (status === "rejected") return "认证驳回";
  return status;
}

function formatDate(value: string | null) {
  if (!value) return "未记录";
  return new Date(value).toLocaleString("zh-CN");
}

export default function AdminPage() {
  const [cargoList, setCargoList] = useState<CargoDemand[]>([]);
  const [vesselList, setVesselList] = useState<VesselSupply[]>([]);
  const [companyList, setCompanyList] = useState<CompanyVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);

    const { data: cargoData, error: cargoError } = await supabase
      .from("cargo_demand")
      .select(
        "id, transport_type, cargo_type, cargo_quantity, cargo_unit, loading_port, discharge_port, planned_loading_date, expected_vessel_type, information_expiry_date, status, remark, created_at"
      )
      .order("created_at", { ascending: false });

    const { data: vesselData, error: vesselError } = await supabase
      .from("vessel_supply")
      .select(
        "id, transport_type, vessel_type, dwt, capacity_unit, current_port_or_area, available_start_date, acceptable_cargo_types, information_expiry_date, status, remark, created_at"
      )
      .order("created_at", { ascending: false });

    const { data: companyData, error: companyError } = await supabase
      .from("company_verification")
      .select(
        "id, user_id, user_type, company_name, unified_social_credit_code, company_type, contact_name, contact_phone, contact_email, main_business, business_license_path, business_license_uploaded_at, verification_status, verified_at, rejected_reason, created_at"
      )
      .order("created_at", { ascending: false });

    if (cargoError) {
      alert(`读取货源失败：${cargoError.message}`);
    } else {
      setCargoList((cargoData || []) as CargoDemand[]);
    }

    if (vesselError) {
      alert(`读取船源失败：${vesselError.message}`);
    } else {
      setVesselList((vesselData || []) as VesselSupply[]);
    }

    if (companyError) {
      alert(`读取企业认证失败：${companyError.message}`);
    } else {
      setCompanyList((companyData || []) as CompanyVerification[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function updateCargoStatus(id: string, status: string) {
    setUpdatingId(id);

    const { error } = await supabase
      .from("cargo_demand")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    setUpdatingId(null);

    if (error) {
      alert(`更新货源状态失败：${error.message}`);
      return;
    }

    await fetchData();
  }

  async function updateVesselStatus(id: string, status: string) {
    setUpdatingId(id);

    const { error } = await supabase
      .from("vessel_supply")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    setUpdatingId(null);

    if (error) {
      alert(`更新船源状态失败：${error.message}`);
      return;
    }

    await fetchData();
  }

  async function viewBusinessLicense(path: string | null) {
    if (!path) {
      alert("该企业未上传营业执照。");
      return;
    }

    const { data, error } = await supabase.storage
      .from("business-licenses")
      .createSignedUrl(path, 60 * 10);

    if (error || !data?.signedUrl) {
      alert(`生成营业执照查看链接失败：${error?.message || "未知错误"}`);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function approveCompany(id: string) {
    const confirmed = window.confirm("确认通过该企业认证吗？");

    if (!confirmed) return;

    setUpdatingId(id);

    const { error } = await supabase
      .from("company_verification")
      .update({
        verification_status: "approved",
        verified_at: new Date().toISOString(),
        rejected_reason: null,
      })
      .eq("id", id);

    setUpdatingId(null);

    if (error) {
      alert(`企业认证通过失败：${error.message}`);
      return;
    }

    alert("企业认证已通过。");
    await fetchData();
  }

  async function rejectCompany(id: string) {
    const reason = window.prompt("请输入驳回原因：");

    if (reason === null) return;

    if (reason.trim() === "") {
      alert("驳回原因不能为空。");
      return;
    }

    setUpdatingId(id);

    const { error } = await supabase
      .from("company_verification")
      .update({
        verification_status: "rejected",
        rejected_reason: reason.trim(),
        verified_at: null,
      })
      .eq("id", id);

    setUpdatingId(null);

    if (error) {
      alert(`企业认证驳回失败：${error.message}`);
      return;
    }

    alert("企业认证已驳回。");
    await fetchData();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="后台审核"
          description="测试版后台：用于审核货源、船源和企业认证信息。正式上线前需要增加管理员登录权限。"
        />

        <div className="mb-6 flex flex-wrap gap-3">
          <a
            href="/cargo"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            货源大厅
          </a>
          <a
            href="/vessels"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            船源大厅
          </a>
          <button
            onClick={fetchData}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            刷新数据
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取审核数据...
          </div>
        ) : (
          <div className="grid gap-8">
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">企业认证审核</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    共 {companyList.length} 条企业认证记录
                  </p>
                </div>
              </div>

              {companyList.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                  暂无企业认证数据
                </div>
              ) : (
                <div className="grid gap-4">
                  {companyList.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-bold">
                              {item.company_name}
                            </h3>

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                              {formatUserType(item.user_type)}
                            </span>

                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                              {formatVerificationStatus(
                                item.verification_status
                              )}
                            </span>

                            {item.business_license_path ? (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                                已上传证照
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                                未上传证照
                              </span>
                            )}
                          </div>

                          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                            <p>企业类型：{item.company_type}</p>
                            <p>联系人：{item.contact_name}</p>
                            <p>联系电话：{item.contact_phone}</p>
                            <p>联系邮箱：{item.contact_email}</p>
                            <p>
                              统一社会信用代码：
                              {item.unified_social_credit_code || "未填写"}
                            </p>
                            <p>提交时间：{formatDate(item.created_at)}</p>
                          </div>

                          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                            <p>主营业务：{item.main_business || "未填写"}</p>
                            <p>
                              证照上传时间：
                              {formatDate(item.business_license_uploaded_at)}
                            </p>
                          </div>

                          {item.business_license_path ? (
                            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                              <span className="font-medium text-slate-800">
                                营业执照路径：
                              </span>
                              {item.business_license_path}
                            </div>
                          ) : null}

                          {item.verified_at ? (
                            <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
                              <span className="font-medium">认证通过时间：</span>
                              {formatDate(item.verified_at)}
                            </div>
                          ) : null}

                          {item.rejected_reason ? (
                            <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                              <span className="font-medium">驳回原因：</span>
                              {item.rejected_reason}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              viewBusinessLicense(item.business_license_path)
                            }
                            disabled={!item.business_license_path}
                            className="rounded-xl border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                          >
                            查看证照
                          </button>

                          <button
                            onClick={() => approveCompany(item.id)}
                            disabled={updatingId === item.id}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400"
                          >
                            认证通过
                          </button>

                          <button
                            onClick={() => rejectCompany(item.id)}
                            disabled={updatingId === item.id}
                            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:bg-slate-400"
                          >
                            认证驳回
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">货源审核</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    共 {cargoList.length} 条货源
                  </p>
                </div>
              </div>

              {cargoList.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                  暂无货源数据
                </div>
              ) : (
                <div className="grid gap-4">
                  {cargoList.map((item) => (
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

                          {item.remark ? (
                            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                              <span className="font-medium text-slate-800">
                                备注：
                              </span>
                              {item.remark}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              updateCargoStatus(item.id, "published")
                            }
                            disabled={updatingId === item.id}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400"
                          >
                            通过
                          </button>
                          <button
                            onClick={() =>
                              updateCargoStatus(item.id, "rejected")
                            }
                            disabled={updatingId === item.id}
                            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:bg-slate-400"
                          >
                            驳回
                          </button>
                          <button
                            onClick={() => updateCargoStatus(item.id, "closed")}
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

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">船源审核</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    共 {vesselList.length} 条船源
                  </p>
                </div>
              </div>

              {vesselList.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                  暂无船源数据
                </div>
              ) : (
                <div className="grid gap-4">
                  {vesselList.map((item) => (
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
                          </div>

                          <p className="mt-2 text-sm text-slate-600">
                            当前港/区域：{item.current_port_or_area}
                          </p>

                          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-4">
                            <p>
                              运力规模：{item.dwt}{" "}
                              {formatCapacityUnit(item.capacity_unit)}
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

                          {item.remark ? (
                            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                              <span className="font-medium text-slate-800">
                                备注：
                              </span>
                              {item.remark}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              updateVesselStatus(item.id, "published")
                            }
                            disabled={updatingId === item.id}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400"
                          >
                            通过
                          </button>
                          <button
                            onClick={() =>
                              updateVesselStatus(item.id, "rejected")
                            }
                            disabled={updatingId === item.id}
                            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:bg-slate-400"
                          >
                            驳回
                          </button>
                          <button
                            onClick={() =>
                              updateVesselStatus(item.id, "closed")
                            }
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
          </div>
        )}
      </div>
    </main>
  );
}