"use client";

import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export default function PublishCargoPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const transportTypeText = String(formData.get("transport_type"));
    const transportType =
      transportTypeText === "外贸" ? "international" : "domestic";

    const cargoQuantity = Number(formData.get("cargo_quantity"));

    if (!cargoQuantity || cargoQuantity <= 0) {
      alert("请填写正确的货量");
      setLoading(false);
      return;
    }

    const payload = {
      publisher_id: DEMO_USER_ID,
      transport_type: transportType,
      cargo_type: String(formData.get("cargo_type")),
      cargo_quantity: cargoQuantity,
      cargo_unit: "ton",
      loading_port: String(formData.get("loading_port")),
      discharge_port: String(formData.get("discharge_port")),
      planned_loading_date: String(formData.get("planned_loading_date")),
      expected_vessel_type: String(formData.get("expected_vessel_type")),
      information_expiry_date: String(formData.get("information_expiry_date")),
      operation_requirement: String(formData.get("operation_requirement") || ""),
      contact_name: String(formData.get("contact_name")),
      contact_phone: String(formData.get("contact_phone")),
      contact_email: String(formData.get("contact_email") || ""),
      status: "pending",
    };

    const { error } = await supabase.from("cargo_demand").insert(payload);

    setLoading(false);

    if (error) {
      console.error(error);
      alert(`提交失败：${error.message}`);
      return;
    }

    alert("货源已提交，等待平台审核。");

    event.currentTarget.reset();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto mb-6 max-w-4xl">
            <a
                href="/"
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
                ← 返回首页
            </a>
        </div>
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-bold">发布货源</h1>
        <p className="mt-2 text-slate-500">
          请填写大宗散货运输需求。提交后需平台审核，通过后进入货源大厅。
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">运输类型</span>
              <select
                name="transport_type"
                required
                className="rounded-xl border px-3 py-3"
              >
                <option>内贸</option>
                <option>外贸</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="font-medium">货种</span>
              <select
                name="cargo_type"
                required
                className="rounded-xl border px-3 py-3"
              >
                <option>铁矿石</option>
                <option>煤炭</option>
                <option>粮食</option>
                <option>建材</option>
                <option>其他</option>
              </select>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">货量（吨）</span>
              <input
                name="cargo_quantity"
                required
                type="number"
                min="1"
                className="rounded-xl border px-3 py-3"
                placeholder="例如：50000"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">期望船型</span>
              <input
                name="expected_vessel_type"
                required
                className="rounded-xl border px-3 py-3"
                placeholder="例如：散货船"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">装货港</span>
              <input
                name="loading_port"
                required
                className="rounded-xl border px-3 py-3"
                placeholder="例如：日照港"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">卸货港</span>
              <input
                name="discharge_port"
                required
                className="rounded-xl border px-3 py-3"
                placeholder="例如：马迹山港"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">计划装货时间</span>
              <input
                name="planned_loading_date"
                required
                type="date"
                className="rounded-xl border px-3 py-3"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">信息有效期</span>
              <input
                name="information_expiry_date"
                required
                type="date"
                className="rounded-xl border px-3 py-3"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">联系人</span>
              <input
                name="contact_name"
                required
                className="rounded-xl border px-3 py-3"
                placeholder="例如：张经理"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">联系电话</span>
              <input
                name="contact_phone"
                required
                className="rounded-xl border px-3 py-3"
                placeholder="例如：13800000000"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="font-medium">邮箱，可选</span>
            <input
              name="contact_email"
              type="email"
              className="rounded-xl border px-3 py-3"
              placeholder="例如：contact@example.com"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium">备注要求</span>
            <textarea
              name="operation_requirement"
              className="min-h-28 rounded-xl border px-3 py-3"
              placeholder="可填写吃水限制、装卸效率、价格意向等"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "提交中..." : "提交审核"}
          </button>
        </form>
      </div>
    </main>
  );
}