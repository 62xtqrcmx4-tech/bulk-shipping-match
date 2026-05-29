"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import PageHeader from "../../components/PageHeader";

export default function PublishCargoPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      alert("请先登录后再发布货源。");
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

    const payload = {
      publisher_id: currentUserId,

      transport_type: String(formData.get("transport_type")),
      cargo_type: String(formData.get("cargo_type")),
      cargo_quantity: Number(formData.get("cargo_quantity")),
      cargo_unit: String(formData.get("cargo_unit")),

      loading_port: String(formData.get("loading_port")),
      discharge_port: String(formData.get("discharge_port")),
      planned_loading_date: String(formData.get("planned_loading_date")),
      expected_vessel_type: String(formData.get("expected_vessel_type")),
      information_expiry_date: String(formData.get("information_expiry_date")),

      remark: String(formData.get("remark") || ""),

      contact_name: profileData.contact_name,
      contact_phone: profileData.contact_phone,
      contact_email: profileData.contact_email || userData.user.email || "",

      status: "pending",
    };

    const { error } = await supabase.from("cargo_demand").insert(payload);

    setLoading(false);

    if (error) {
      console.error(error);
      alert(`发布货源失败：${error.message}`);
      return;
    }

    alert("货源已提交，等待平台审核。");
    window.location.href = "/my-cargo";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="发布货源"
          description="请填写大宗散货、特种货或其他运输需求。提交后需平台审核，通过后进入货源大厅。"
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
                <option>集装箱货物</option>
                <option>特种货物</option>
                <option>重大件</option>
                <option>其他</option>
              </select>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">货量</span>
              <input
                name="cargo_quantity"
                required
                type="number"
                min="0"
                step="0.01"
                className="rounded-xl border px-3 py-3"
                placeholder="例如：50000"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">货量单位</span>
              <select
                name="cargo_unit"
                required
                className="rounded-xl border px-3 py-3"
              >
                <option value="ton">吨</option>
                <option value="teu">TEU</option>
                <option value="cbm">立方米</option>
                <option value="piece">件</option>
              </select>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">装货港 / 起运地</span>
              <input
                name="loading_port"
                required
                className="rounded-xl border px-3 py-3"
                placeholder="例如：日照港"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">卸货港 / 目的地</span>
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
              <span className="font-medium">计划装货日期</span>
              <input
                name="planned_loading_date"
                required
                type="date"
                className="rounded-xl border px-3 py-3"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">信息有效期至</span>
              <input
                name="information_expiry_date"
                required
                type="date"
                className="rounded-xl border px-3 py-3"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="font-medium">期望船型</span>
            <select
              name="expected_vessel_type"
              required
              className="rounded-xl border px-3 py-3"
            >
              <option>散货船</option>
              <option>集装箱船</option>
              <option>多用途船</option>
              <option>件杂货船</option>
              <option>重大件船</option>
              <option>甲板船</option>
              <option>不限</option>
              <option>其他</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="font-medium">备注 / 特殊要求，可选</span>
            <textarea
              name="remark"
              className="min-h-28 rounded-xl border px-3 py-3"
              placeholder="例如：重大件、需吊装、袋装粮、集装箱、危险品、需绑扎、需防潮、可分批装运等"
            />
            <span className="text-sm text-slate-500">
              备注内容将支持关键词检索，适合填写特种货物、装卸要求、绑扎要求、包装形式等信息。
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "提交中..." : "提交货源"}
          </button>
        </form>
      </div>
    </main>
  );
}