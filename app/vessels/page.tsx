"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const DEMO_REQUESTER_ID = "00000000-0000-0000-0000-000000000002";

type VesselSupply = {
  id: string;
  publisher_id: string;
  transport_type: string;
  vessel_type: string;
  dwt: number;
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

export default function VesselsPage() {
  const [vesselList, setVesselList] = useState<VesselSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [contactingId, setContactingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVessels() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("vessel_supply")
        .select(
          "id, publisher_id, transport_type, vessel_type, dwt, current_port_or_area, current_destination_port, available_start_date, available_end_date, service_area, regular_route, is_ballast_return, is_idle_slot, acceptable_cargo_types, information_expiry_date, status, created_at"
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setVesselList((data || []) as VesselSupply[]);
      }

      setLoading(false);
    }

    fetchVessels();
  }, []);

  async function handleContact(item: VesselSupply) {
    setContactingId(item.id);

    const { error } = await supabase.from("contact_request").insert({
      requester_id: DEMO_REQUESTER_ID,
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

    alert("联系申请已提交。当前测试版已生成联系记录。");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <a
            href="/"
            className="mb-6 inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
            ← 返回首页
        </a>
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold">船源大厅</h1>
            <p className="mt-2 text-slate-500">
              查看已提交的可用船舶与空档船期。当前为一期测试版，后续将增加审核与筛选功能。
            </p>
          </div>

          <a
            href="/publish-vessel"
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            发布船源
          </a>
        </div>

        <div className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-5">
          <input className="rounded-xl border px-3 py-2" placeholder="船型" />
          <input className="rounded-xl border px-3 py-2" placeholder="当前区域" />
          <input className="rounded-xl border px-3 py-2" placeholder="可承运货种" />
          <select className="rounded-xl border px-3 py-2">
            <option>全部类型</option>
            <option>内贸</option>
            <option>外贸</option>
            <option>均可</option>
          </select>
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">
            筛选
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
            暂无船源数据。你可以先发布一条测试船源。
          </div>
        ) : (
          <div className="grid gap-5">
            {vesselList.map((item) => (
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

                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <p>服务区域：{item.service_area}</p>
                  <p>常跑航线：{item.regular_route || "未填写"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}