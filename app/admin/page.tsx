"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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
  created_at: string;
};

type VesselSupply = {
  id: string;
  transport_type: string;
  vessel_type: string;
  dwt: number;
  current_port_or_area: string;
  available_start_date: string;
  acceptable_cargo_types: string[];
  information_expiry_date: string;
  status: string;
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
  if (status === "closed") return "已关闭";
  if (status === "expired") return "已过期";
  if (status === "rejected") return "审核未通过";
  return status;
}

export default function AdminPage() {
  const [cargoList, setCargoList] = useState<CargoDemand[]>([]);
  const [vesselList, setVesselList] = useState<VesselSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);

    const { data: cargoData, error: cargoError } = await supabase
      .from("cargo_demand")
      .select(
        "id, transport_type, cargo_type, cargo_quantity, cargo_unit, loading_port, discharge_port, planned_loading_date, expected_vessel_type, information_expiry_date, status, created_at"
      )
      .order("created_at", { ascending: false });

    const { data: vesselData, error: vesselError } = await supabase
      .from("vessel_supply")
      .select(
        "id, transport_type, vessel_type, dwt, current_port_or_area, available_start_date, acceptable_cargo_types, information_expiry_date, status, created_at"
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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">后台审核</h1>
            <p className="mt-2 text-slate-500">
              测试版后台：用于审核货源和船源信息。正式上线前需要增加管理员登录权限。
            </p>
          </div>

          <div className="flex gap-3">
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
                              {item.cargo_unit === "ton"
                                ? "吨"
                                : item.cargo_unit}
                            </p>
                            <p>计划装货：{item.planned_loading_date}</p>
                            <p>期望船型：{item.expected_vessel_type}</p>
                            <p>有效期至：{item.information_expiry_date}</p>
                          </div>
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
                            <p>载重吨：{item.dwt} DWT</p>
                            <p>可用开始：{item.available_start_date}</p>
                            <p>
                              可承运：
                              {Array.isArray(item.acceptable_cargo_types)
                                ? item.acceptable_cargo_types.join("、")
                                : ""}
                            </p>
                            <p>有效期至：{item.information_expiry_date}</p>
                          </div>
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