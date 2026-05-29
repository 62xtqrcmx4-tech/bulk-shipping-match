"use client";

import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";



export default function PublishVesselPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
    alert("请先登录后再发布船源。");
    setLoading(false);
    window.location.href = "/login";
    return;
    }

    const currentUserId = userData.user.id;

    const transportTypeText = String(formData.get("transport_type"));
    const transportType =
      transportTypeText === "外贸"
        ? "international"
        : transportTypeText === "均可"
          ? "both"
          : "domestic";

    const dwt = Number(formData.get("dwt"));

    if (!dwt || dwt <= 0) {
      alert("请填写正确的载重吨");
      setLoading(false);
      return;
    }

    const acceptableCargoTypesText = String(
      formData.get("acceptable_cargo_types") || ""
    );

    const acceptableCargoTypes = acceptableCargoTypesText
      .split(/[，,、\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (acceptableCargoTypes.length === 0) {
      alert("请填写可承运货种，例如：铁矿石、煤炭");
      setLoading(false);
      return;
    }

    const payload = {
      publisher_id: currentUserId,
      transport_type: transportType,
      vessel_name: String(formData.get("vessel_name") || ""),
      mmsi: String(formData.get("mmsi") || ""),
      imo: String(formData.get("imo") || ""),
      vessel_type: String(formData.get("vessel_type")),
      dwt,
      current_port_or_area: String(formData.get("current_port_or_area")),
      current_destination_port: String(
        formData.get("current_destination_port") || ""
      ),
      available_start_date: String(formData.get("available_start_date")),
      available_end_date:
        String(formData.get("available_end_date") || "") || null,
      service_area: String(formData.get("service_area")),
      regular_route: String(formData.get("regular_route") || ""),
      is_ballast_return: formData.get("is_ballast_return") === "on",
      is_idle_slot: formData.get("is_idle_slot") === "on",
      acceptable_cargo_types: acceptableCargoTypes,
      quotation_type: String(formData.get("quotation_type") || ""),
      quotation_range: String(formData.get("quotation_range") || ""),
      contact_name: String(formData.get("contact_name")),
      contact_phone: String(formData.get("contact_phone")),
      contact_email: String(formData.get("contact_email") || ""),
      information_expiry_date: String(formData.get("information_expiry_date")),
      status: "pending",
    };

    const { error } = await supabase.from("vessel_supply").insert(payload);

    setLoading(false);

    if (error) {
      console.error(error);
      alert(`提交失败：${error.message}`);
      return;
    }

    alert("船源已提交，等待平台审核。");

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
        <h1 className="text-3xl font-bold">发布船源</h1>
        <p className="mt-2 text-slate-500">
          请填写可用船舶或空档船期。提交后需平台审核，通过后进入船源大厅。
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
                <option>均可</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="font-medium">船型</span>
              <input
                name="vessel_type"
                required
                className="rounded-xl border px-3 py-3"
                placeholder="例如：散货船"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">载重吨 DWT</span>
              <input
                name="dwt"
                required
                type="number"
                min="1"
                className="rounded-xl border px-3 py-3"
                placeholder="例如：57000"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">当前港 / 当前区域</span>
              <input
                name="current_port_or_area"
                required
                className="rounded-xl border px-3 py-3"
                placeholder="例如：华东沿海、宁波舟山港"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">可用开始时间</span>
              <input
                name="available_start_date"
                required
                type="date"
                className="rounded-xl border px-3 py-3"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">可用结束时间，可选</span>
              <input
                name="available_end_date"
                type="date"
                className="rounded-xl border px-3 py-3"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">信息有效期</span>
              <input
                name="information_expiry_date"
                required
                type="date"
                className="rounded-xl border px-3 py-3"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">当前目的港，可选</span>
              <input
                name="current_destination_port"
                className="rounded-xl border px-3 py-3"
                placeholder="例如：日照港"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="font-medium">可承运货种</span>
            <input
              name="acceptable_cargo_types"
              required
              className="rounded-xl border px-3 py-3"
              placeholder="例如：铁矿石、煤炭、粮食"
            />
            <span className="text-sm text-slate-500">
              多个货种可用逗号、顿号或空格分隔。
            </span>
          </label>

          <label className="grid gap-2">
            <span className="font-medium">服务区域</span>
            <input
              name="service_area"
              required
              className="rounded-xl border px-3 py-3"
              placeholder="例如：沿海、长江中下游、东南亚航线"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium">常跑航线，可选</span>
            <input
              name="regular_route"
              className="rounded-xl border px-3 py-3"
              placeholder="例如：北方港—长江口、东南亚—中国南方港口"
            />
          </label>

          <div className="grid gap-5 md:grid-cols-3">
            <label className="grid gap-2">
              <span className="font-medium">船名，可选</span>
              <input
                name="vessel_name"
                className="rounded-xl border px-3 py-3"
                placeholder="后台审核用"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">MMSI，可选</span>
              <input
                name="mmsi"
                className="rounded-xl border px-3 py-3"
                placeholder="例如：412xxxxxx"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">IMO，可选</span>
              <input
                name="imo"
                className="rounded-xl border px-3 py-3"
                placeholder="外贸船建议填写"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">报价方式，可选</span>
              <input
                name="quotation_type"
                className="rounded-xl border px-3 py-3"
                placeholder="例如：吨价、航次租金、日租金"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">报价区间，可选</span>
              <input
                name="quotation_range"
                className="rounded-xl border px-3 py-3"
                placeholder="例如：面议、80-100元/吨"
              />
            </label>
          </div>

          <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
            <label className="flex items-center gap-3">
              <input name="is_ballast_return" type="checkbox" />
              <span>返程空载</span>
            </label>

            <label className="flex items-center gap-3">
              <input name="is_idle_slot" type="checkbox" />
              <span>空档船期</span>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">联系人</span>
              <input
                name="contact_name"
                required
                className="rounded-xl border px-3 py-3"
                placeholder="例如：李经理"
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