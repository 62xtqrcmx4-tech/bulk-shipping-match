"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
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
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function fetchProfile() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      alert("请先登录后查看我的资料。");
      window.location.href = "/login";
      return;
    }

    setUserId(userData.user.id);
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

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile || !userId) {
      alert("未找到企业资料，无法保存。");
      return;
    }

    setSaving(true);

    const formData = new FormData(event.currentTarget);

    const licenseFile = formData.get("business_license") as File | null;

    let newLicensePath = profile.business_license_path;
    let newLicenseUploadedAt = profile.business_license_uploaded_at;

    if (licenseFile && licenseFile.size > 0) {
      if (licenseFile.size > 10 * 1024 * 1024) {
        alert("营业执照文件不能超过 10MB。");
        setSaving(false);
        return;
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];

      if (!allowedTypes.includes(licenseFile.type)) {
        alert("营业执照仅支持 JPG、PNG、WEBP 或 PDF 文件。");
        setSaving(false);
        return;
      }

      const fileExt = licenseFile.name.split(".").pop() || "file";
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("business-licenses")
        .upload(filePath, licenseFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        alert(`营业执照上传失败：${uploadError.message}`);
        setSaving(false);
        return;
      }

      newLicensePath = filePath;
      newLicenseUploadedAt = new Date().toISOString();
    }

    const payload = {
      user_type: String(formData.get("user_type")),
      company_name: String(formData.get("company_name")),
      unified_social_credit_code: String(
        formData.get("unified_social_credit_code") || ""
      ),
      company_type: String(formData.get("company_type")),
      contact_name: String(formData.get("contact_name")),
      contact_phone: String(formData.get("contact_phone")),
      contact_email: String(formData.get("contact_email") || userEmail),
      main_business: String(formData.get("main_business") || ""),
      business_license_path: newLicensePath,
      business_license_uploaded_at: newLicenseUploadedAt,

      // 用户修改资料或重新上传证照后，重新进入待审核状态
      verification_status: "pending",
      rejected_reason: null,
      verified_at: null,
    };

    const { error } = await supabase
      .from("company_verification")
      .update(payload)
      .eq("id", profile.id);

    setSaving(false);

    if (error) {
      alert(`保存企业资料失败：${error.message}`);
      return;
    }

    alert("企业资料已保存，并重新提交审核。");
    await fetchProfile();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="我的资料"
          description="查看和维护我的企业资料、营业执照上传状态和平台认证状态。"
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
          <form onSubmit={handleSave} className="grid gap-6">
            <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold">
                      {profile.company_name}
                    </h2>

                    <span
                      className={getVerificationBadgeClass(
                        profile.verification_status
                      )}
                    >
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
                  type="button"
                  onClick={viewBusinessLicense}
                  disabled={!profile.business_license_path}
                  className="rounded-xl border border-blue-700 px-5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                >
                  查看当前证照
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
                    请修改企业资料或重新上传营业执照后保存，系统会重新提交审核。
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-xl font-bold">企业基础信息</h3>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="font-medium">用户类型</span>
                  <select
                    name="user_type"
                    required
                    defaultValue={profile.user_type}
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
                    defaultValue={profile.company_type}
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

                <label className="grid gap-2 md:col-span-2">
                  <span className="font-medium">企业名称</span>
                  <input
                    name="company_name"
                    required
                    defaultValue={profile.company_name}
                    className="rounded-xl border px-3 py-3"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="font-medium">统一社会信用代码，可选</span>
                  <input
                    name="unified_social_credit_code"
                    defaultValue={profile.unified_social_credit_code || ""}
                    className="rounded-xl border px-3 py-3"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="font-medium">联系邮箱</span>
                  <input
                    name="contact_email"
                    type="email"
                    required
                    defaultValue={profile.contact_email || userEmail}
                    className="rounded-xl border px-3 py-3"
                  />
                </label>

                <label className="grid gap-2 md:col-span-2">
                  <span className="font-medium">主营业务，可选</span>
                  <textarea
                    name="main_business"
                    defaultValue={profile.main_business || ""}
                    className="min-h-24 rounded-xl border px-3 py-3"
                    placeholder="例如：铁矿石贸易、沿海散货运输、煤炭物流等"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-xl font-bold">联系人信息</h3>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="font-medium">联系人</span>
                  <input
                    name="contact_name"
                    required
                    defaultValue={profile.contact_name}
                    className="rounded-xl border px-3 py-3"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="font-medium">联系电话</span>
                  <input
                    name="contact_phone"
                    required
                    defaultValue={profile.contact_phone}
                    className="rounded-xl border px-3 py-3"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-xl font-bold">证照信息</h3>

              <div className="mt-5 grid gap-4 text-sm text-slate-700 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">当前证照文件状态</p>
                  <p className="mt-1 font-medium">
                    {profile.business_license_path ? "已上传" : "未上传"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-500">当前证照上传时间</p>
                  <p className="mt-1 font-medium">
                    {formatDate(profile.business_license_uploaded_at)}
                  </p>
                </div>
              </div>

              {profile.business_license_path ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">当前证照路径：</span>
                  {profile.business_license_path}
                </div>
              ) : null}

              <label className="mt-5 grid gap-2">
                <span className="font-medium">
                  重新上传营业执照 / 企业资质文件，可选
                </span>
                <input
                  name="business_license"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  className="rounded-xl border bg-white px-3 py-3"
                />
                <span className="text-sm text-slate-500">
                  支持 JPG、PNG、WEBP、PDF，文件大小不超过 10MB。重新上传后，企业认证状态将变为“待审核”。
                </span>
              </label>
            </section>

            <div className="flex flex-wrap justify-end gap-3">
              <a
                href="/"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                返回首页
              </a>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? "保存中..." : "保存并重新提交审核"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}