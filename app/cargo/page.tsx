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
  created_at: string;
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

export default function CargoPage() {
  const [cargoList, setCargoList] = useState<CargoDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [contactingId, setContactingId] = useState<string | null>(null);

  const [transportTypeFilter, setTransportTypeFilter] = useState("all");
  const [cargoTypeFilter, setCargoTypeFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    async function fetchCargo() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("cargo_demand")
        .select(
          "id, publisher_id, transport_type, cargo_type, cargo_quantity, cargo_unit, loading_port, discharge_port, planned_loading_date, expected_vessel_type, information_expiry_date, status, created_at"
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
      } else {
        const publishedOnly = ((data || []) as CargoDemand[]).filter(
          (item) => item.status === "published"
        );

        setCargoList(publishedOnly);
      }

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
          ]
            .join(" ")
            .toLowerCase()
            .includes(keywordText);

    return matchTransportType && matchCargoType && matchKeyword;
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
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="货源大厅"
          description="查看已审核发布的大宗散货运输需求。当前为一期测试版，后续将继续完善筛选、排序与联系方式开放机制。"
          actionHref="/publish-cargo"
          actionText="发布货源"
        />

        <div className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-4">
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
            <option value="其他">其他</option>
          </select>

          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="rounded-xl border px-3 py-2"
            placeholder="搜索货种、港口、船型"
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
                    </div>

                    <p className="mt-2 text-slate-600">
                      {item.loading_port} → {item.discharge_port}
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
                  <p>
                    货量：{item.cargo_quantity}{" "}
                    {item.cargo_unit === "ton" ? "吨" : item.cargo_unit}
                  </p>
                  <p>计划装货：{item.planned_loading_date}</p>
                  <p>期望船型：{item.expected_vessel_type}</p>
                  <p>有效期至：{item.information_expiry_date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}