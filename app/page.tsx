"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type CargoDemand = {
  id: string;
  transport_type: string;
  cargo_type: string;
  cargo_quantity: number;
  cargo_unit: string;
  loading_port: string;
  discharge_port: string;
  planned_loading_date: string;
  status: string;
};

type VesselSupply = {
  id: string;
  transport_type: string;
  vessel_type: string;
  dwt: number;
  current_port_or_area: string;
  available_start_date: string;
  acceptable_cargo_types: string[];
  status: string;
};

function formatTransportType(type: string) {
  if (type === "domestic") return "内贸";
  if (type === "international") return "外贸";
  if (type === "both") return "均可";
  return type;
}

function formatCargoUnit(unit: string) {
  if (unit === "ton") return "吨";
  return unit;
}

export default function Home() {
  const [latestCargo, setLatestCargo] = useState<CargoDemand[]>([]);
  const [latestVessels, setLatestVessels] = useState<VesselSupply[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHomeData() {
      setLoading(true);

      const { data: cargoData, error: cargoError } = await supabase
        .from("cargo_demand")
        .select(
          "id, transport_type, cargo_type, cargo_quantity, cargo_unit, loading_port, discharge_port, planned_loading_date, status"
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(3);

      const { data: vesselData, error: vesselError } = await supabase
        .from("vessel_supply")
        .select(
          "id, transport_type, vessel_type, dwt, current_port_or_area, available_start_date, acceptable_cargo_types, status"
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(3);

      if (!cargoError) {
        setLatestCargo((cargoData || []) as CargoDemand[]);
      }

      if (!vesselError) {
        setLatestVessels((vesselData || []) as VesselSupply[]);
      }

      setLoading(false);
    }

    fetchHomeData();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="block">
            <h1 className="text-2xl font-bold tracking-tight">
              大宗散货船货撮合平台
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Bulk Shipping Match Platform
            </p>
          </a>

          <nav className="hidden gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="/cargo" className="hover:text-slate-950">
              货源大厅
            </a>
            <a href="/vessels" className="hover:text-slate-950">
              船源大厅
            </a>
            <a href="/publish-cargo" className="hover:text-slate-950">
              发布货源
            </a>
            <a href="/publish-vessel" className="hover:text-slate-950">
              发布船源
            </a>
            <a href="/contacts" className="hover:text-slate-950">
              联系记录
            </a>
          </nav>

          <button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700">
            登录 / 注册
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            面向内贸与外贸大宗散货运输场景
          </div>

          <h2 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            连接真实货源与可信船源，
            <span className="text-blue-700"> 提升船货对接效率</span>
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            平台面向铁矿石、煤炭、粮食、建材等大宗散货运输需求，
            为货主、贸易商、船东、船代、航运企业和物流服务商提供货源发布、
            船源发布、供需检索、自动开放联系方式与反馈记录服务。
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/publish-cargo"
              className="rounded-xl bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-800"
            >
              发布货源
            </a>
            <a
              href="/publish-vessel"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
            >
              发布船源
            </a>
          </div>

          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">审核制</p>
              <p className="mt-1 text-sm text-slate-500">企业认证注册</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">双向</p>
              <p className="mt-1 text-sm text-slate-500">货找船 / 船找货</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">自动</p>
              <p className="mt-1 text-sm text-slate-500">认证后开放联系</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
          <h3 className="text-lg font-bold">平台一期流程</h3>
          <div className="mt-6 space-y-4">
            {[
              "用户注册并提交企业认证",
              "货方发布货源，船方发布船源",
              "平台审核后进入货源大厅 / 船源大厅",
              "双方均已认证后自动开放联系方式",
              "联系后填写响应、报价、成交反馈",
            ].map((item, index) => (
              <div key={item} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-700">
                  {item}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-bold">最新货源</h3>
            <a href="/cargo" className="text-sm font-medium text-blue-700">
              查看更多
            </a>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              正在读取最新货源...
            </div>
          ) : latestCargo.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              暂无货源数据
            </div>
          ) : (
            <div className="space-y-4">
              {latestCargo.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{item.cargo_type}</p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {formatTransportType(item.transport_type)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    {item.loading_port} → {item.discharge_port}
                  </p>

                  <div className="mt-3 flex justify-between text-sm text-slate-500">
                    <span>
                      {item.cargo_quantity} {formatCargoUnit(item.cargo_unit)}
                    </span>
                    <span>计划装货：{item.planned_loading_date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-bold">最新船源</h3>
            <a href="/vessels" className="text-sm font-medium text-blue-700">
              查看更多
            </a>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              正在读取最新船源...
            </div>
          ) : latestVessels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              暂无船源数据
            </div>
          ) : (
            <div className="space-y-4">
              {latestVessels.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{item.vessel_type}</p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {formatTransportType(item.transport_type)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    {item.current_port_or_area}
                  </p>

                  <div className="mt-3 flex justify-between text-sm text-slate-500">
                    <span>{item.dwt} DWT</span>
                    <span>{item.available_start_date} 起可用</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-sm text-slate-500">
          © 2026 大宗散货船货撮合平台 · 一期试运营版本
        </div>
      </footer>
    </main>
  );
}

function eq(arg0: string, arg1: string) {
  throw new Error("Function not implemented.");
}
