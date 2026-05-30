"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import PageHeader from "../../components/PageHeader";

type CompanyProfile = {
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
  return status || "未认证";
}

function getVerificationBadgeClass(status: string) {
  if (status === "approved") {
    return "rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700";
  }

  if (status === "pending") {
    return "rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700";
  }

  if (status === "rejected") {
    return "rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700";
  }

  return "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600";
}

function formatDate(value: string | null) {
  if (!value) return "未记录";
  return new Date(value).toLocaleString("zh-CN");
}

export default function MyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchProfile() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      alert("请先登录后查看我的资料。");
      window.location.href = "/login";
      return;
    }

    setUserEmail(userData.user.email || "");

    const { data, error } = await supabase
      .from("company_verification")
      .select(
        "id, user_id, user_type, company_name, unified_social_credit_code, company_type, contact_name, contact_phone, contact_email, main_business, business_license_path, business_license_uploaded_at, verification_status, verified_at, rejected_reason, created_at"
      )
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (error) {
      alert(`读取企业资料失败：${error.message}`);
      setLoading(false);
      return;
    }

    setProfile((data || null) as CompanyProfile | null);
    setLoading(false);
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  async function viewBusinessLicense() {
    if (!profile?.business_license_path) {
      alert("尚未上传营业执照或企业资质文件。");
      return;
    }

    const { data, error } = await supabase.storage
      .from("business-licenses")
      .createSignedUrl(profile.business_license_path, 60 * 10);

    if (error || !data?.signedUrl) {
      alert(`生成证照查看链接失败：${error?.message || "未知错误"}`);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="我的资料"
          description="查看我的企业资料、营业执照上传状态和平台认证状态。"
        />

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取我的资料...
          </div>
        ) : !profile ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold">尚未提交企业资料</h2>
            <p className="mt-3 text-slate-600">
              当前登录账号：{userEmail || "未识别邮箱"}。请重新注册或后续在资料补充页面提交企业资料。
            </p>
            <a
              href="/register"
              className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              去提交企业资料
            </a>
          </div>
        ) : (
          <div className="grid gap-6">
            <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold">
                      {profile.company_name}
                    </h2>

                    <span className={getVerificationBadgeClass(profile.verification_status)}>
                      {formatVerificationStatus(profile.verification_status)}
                    </span>

                    {profile.business_license_path ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        已上传证照
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        未上传证照
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    资料提交时间：{formatDate(profile.created_at)}
                  </p>
                </div>

                <button
                  onClick={viewBusinessLicense}
                  disabled={!profile.business_license_path}
                  className="rounded-xl border border-blue-700 px-5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                >
                  查看营业执照
                </button>
              </div>

              {profile.verification_status === "approved" ? (
                <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
                  企业认证已通过。认证时间：{formatDate(profile.verified_at)}
                </div>
              ) : null}

              {profile.verification_status === "pending" ? (
                <div className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
                  企业资料和证照已提交，平台正在审核中。审核期间仍可发布货源/船源和申请联系，但前台将显示“证照已提交，待审核”。
                </div>
              ) : null}

              {profile.verification_status === "rejected" ? (
                <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-semibold">企业认证已被驳回。</p>
                  <p className="mt-1">
                    驳回原因：{profile.rejected_reason || "未填写"}
                  </p>
                  <p className="mt-1">
                    后续可在资料修改功能上线后重新提交资料和证照。
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-xl font-bold">企业基础信息</h3>

              <div className="mt-5 grid gap-4 text-sm text-slate-700 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">用户类型</p>
                  <p className="mt-1 font-medium">
                    {formatUserType(profile.user_type)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">企业类型</p>
                  <p className="mt-1 font-medium">{profile.company_type}</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">统一社会信用代码</p>
                  <p className="mt-1 font-medium">
                    {profile.unified_social_credit_code || "未填写"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">主营业务</p>
                  <p className="mt-1 font-medium">
                    {profile.main_business || "未填写"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-xl font-bold">联系人信息</h3>

              <div className="mt-5 grid gap-4 text-sm text-slate-700 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">联系人</p>
                  <p className="mt-1 font-medium">{profile.contact_name}</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">联系电话</p>
                  <p className="mt-1 font-medium">{profile.contact_phone}</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">联系邮箱</p>
                  <p className="mt-1 font-medium">{profile.contact_email}</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-xl font-bold">证照信息</h3>

              <div className="mt-5 grid gap-4 text-sm text-slate-700 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">证照文件状态</p>
                  <p className="mt-1 font-medium">
                    {profile.business_license_path ? "已上传" : "未上传"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">证照上传时间</p>
                  <p className="mt-1 font-medium">
                    {formatDate(profile.business_license_uploaded_at)}
                  </p>
                </div>
              </div>

              {profile.business_license_path ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">证照路径：</span>
                  {profile.business_license_path}
                </div>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}