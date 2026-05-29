"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import PageHeader from "../../components/PageHeader";

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

    const { data: profileData, error: profileError } = await supabase
      .from("company_verification")
      .select("contact_name, contact_phone, contact_email")
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (profileError) {
      alert(`读取企业资料失败：${profileError.message}`);
      setLoading(false);
      return;
    }

    if (!profileData) {
      alert("未找到企业资料，请先完成注册和企业资料提交。");
      setLoading(false);
      window.location.href = "/register";
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
      alert("请填写可承运货种，例如：铁矿石、煤炭、集装箱货物。");
      setLoading(false);
      return;
    }

    const capacityValue = Number(formData.get("capacity_value"));

    if (!capacityValue || capacityValue <= 0) {
      alert("请填写正确的运力规模。");
      setLoading(false);
      return;
    }

    const payload = {
      publisher_id: currentUserId,

      transport_type: String(formData.get("transport_type")),
      vessel_name: String(formData.get("vessel_name") || ""),
      mmsi: String(formData.get("mmsi") || ""),
      imo: String(formData.get("imo") || ""),

      vessel_type: String(formData.get("vessel_type")),

      // 数据库字段暂时仍用 dwt 存储“运力规模数值”
      dwt: capacityValue,
      capacity_unit: String(formData.get("capacity_unit")),

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

      remark: String(formData.get("remark") || ""),

      contact_name: profileData.contact_name,
      contact_phone: profileData.contact_phone,
      contact_email: profileData.contact_email || userData.user.email || "",

      information_expiry_date: String(formData.get("information_expiry_date")),

      status: "pending",
    };

    const { error } = await supabase.from("vessel_supply").insert(payload);

    setLoading(false);

    if (error) {
      console.error(error);
      alert(`发布船源失败：${error.message}`);
      return;
    }

    alert("船源已提交，等待平台审核。");
    window.location.href = "/vessels";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="发布船源"
          description="请填写可用船舶或空档船期。提交后需平台审核，通过后进入船源大厅。"
        />
      </div>

      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">运输类型</span>
              <select
                name="transport_type"
                required
                className="rounded-xl border px-3 py-3"
              >
                <option value="domestic">内贸</option>
                <option value="international">外贸</option>
                <option value="both">均可</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="font-medium">船型</span>
              <select
                name="vessel_type"
                required
                className="rounded-xl border px-3 py-3"
              >
                <option>散货船</option>
                <option>集装箱船</option>
                <option>多用途船</option>
                <option>件杂货船</option>
                <option>重大件船</option>
                <option>甲板船</option>
                <option>江海直达船</option>
                <option>其他</option>
              </select>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">运力规模</span>
              <input
                name="capacity_value"
                required
                type="number"
                min="1"
                step="1"
                className="rounded-xl border px-3 py-3"
                placeholder="例如：57000 或 1800"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">运力单位</span>
              <select
                name="capacity_unit"
                required
                className="rounded-xl border px-3 py-3"
              >
                <option value="DWT">DWT，载重吨</option>
                <option value="TEU">TEU，标准箱</option>
                <option value="CBM">CBM，立方米</option>
                <option value="piece">件</option>
                <option value="other">其他</option>
              </select>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">当前港 / 当前区域</span>
              <input
                name="current_port_or_area"
                required
                className="rounded-xl border px-3 py-3"
                placeholder="例如：华东沿海、宁波舟山港"
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

          <label className="grid gap-2">
            <span className="font-medium">信息有效期至</span>
            <input
              name="information_expiry_date"
              required
              type="date"
              className="rounded-xl border px-3 py-3"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium">可承运货种</span>
            <input
              name="acceptable_cargo_types"
              required
              className="rounded-xl border px-3 py-3"
              placeholder="例如：铁矿石、煤炭、粮食、集装箱货物、重大件"
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
                placeholder="例如：吨价、航次租金、日租金、TEU 运价"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">报价区间，可选</span>
              <input
                name="quotation_range"
                className="rounded-xl border px-3 py-3"
                placeholder="例如：面议、80-100元/吨、800-1000元/TEU"
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

          <label className="grid gap-2">
            <span className="font-medium">备注 / 可承接特殊要求，可选</span>
            <textarea
              name="remark"
              className="min-h-28 rounded-xl border px-3 py-3"
              placeholder="例如：可接集装箱、可接重大件、可接袋装粮、支持甲板货、可配吊装、可接需绑扎货物等"
            />
            <span className="text-sm text-slate-500">
              备注内容将支持关键词检索，适合填写可承接的特殊货物、装卸条件、绑扎能力、航线偏好等信息。
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "提交中..." : "提交船源"}
          </button>
        </form>
      </div>
    </main>
  );
}