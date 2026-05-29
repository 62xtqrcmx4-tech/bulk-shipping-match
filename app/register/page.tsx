"use client";

import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";
import PageHeader from "../../components/PageHeader";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const userType = String(formData.get("user_type"));
    const companyName = String(formData.get("company_name"));
    const companyType = String(formData.get("company_type"));
    const contactName = String(formData.get("contact_name"));
    const contactPhone = String(formData.get("contact_phone"));
    const contactEmail = email;
    const unifiedSocialCreditCode = String(
      formData.get("unified_social_credit_code") || ""
    );
    const mainBusiness = String(formData.get("main_business") || "");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      alert(`注册失败：${error.message}`);
      return;
    }

    const userId = data.user?.id;

    if (!userId) {
      setLoading(false);
      alert("注册成功，但未获取到用户 ID。请检查 Supabase 邮箱验证设置。");
      return;
    }

    const { error: profileError } = await supabase
      .from("company_verification")
      .insert({
        user_id: userId,
        user_type: userType,
        company_name: companyName,
        unified_social_credit_code: unifiedSocialCreditCode,
        company_type: companyType,
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        main_business: mainBusiness,
        verification_status: "pending",
      });

    setLoading(false);

    if (profileError) {
      alert(`用户已注册，但企业资料保存失败：${profileError.message}`);
      return;
    }

    alert("注册成功，企业资料已提交审核。请登录。");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="注册账号"
          description="请填写账号和企业认证基础信息。当前为一期测试版，注册后企业资料进入待审核状态。"
        />
      </div>

      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <form onSubmit={handleRegister} className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">邮箱</span>
              <input
                name="email"
                required
                type="email"
                className="rounded-xl border px-3 py-3"
                placeholder="用于登录"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">密码</span>
              <input
                name="password"
                required
                type="password"
                minLength={6}
                className="rounded-xl border px-3 py-3"
                placeholder="至少 6 位"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="font-medium">用户类型</span>
              <select
                name="user_type"
                required
                className="rounded-xl border px-3 py-3"
              >
                <option value="cargo_owner">货方</option>
                <option value="vessel_owner">船方</option>
                <option value="broker">经纪 / 服务方</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="font-medium">企业类型</span>
              <select
                name="company_type"
                required
                className="rounded-xl border px-3 py-3"
              >
                <option>货主</option>
                <option>贸易商</option>
                <option>船东</option>
                <option>船代</option>
                <option>航运企业</option>
                <option>物流公司</option>
                <option>经纪人</option>
                <option>其他</option>
              </select>
            </label>
          </div>

          <label className="grid gap-2">
            <span className="font-medium">企业名称</span>
            <input
              name="company_name"
              required
              className="rounded-xl border px-3 py-3"
              placeholder="请输入企业名称"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium">统一社会信用代码，可选</span>
            <input
              name="unified_social_credit_code"
              className="rounded-xl border px-3 py-3"
              placeholder="国内企业建议填写"
            />
          </label>

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
            <span className="font-medium">主营业务，可选</span>
            <textarea
              name="main_business"
              className="min-h-24 rounded-xl border px-3 py-3"
              placeholder="例如：铁矿石贸易、沿海散货运输、煤炭物流等"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "注册中..." : "注册并提交认证"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          已有账号？{" "}
          <a href="/login" className="font-medium text-blue-700">
            去登录
          </a>
        </p>
      </div>
    </main>
  );
}