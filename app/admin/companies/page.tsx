"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import PageHeader from "../../../components/PageHeader";

type CompanyVerification = {
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
  is_admin: boolean | null;
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
  return status;
}

function formatDate(value: string | null) {
  if (!value) return "未记录";
  return new Date(value).toLocaleString("zh-CN");
}

function matchKeyword(
  keyword: string,
  values: Array<string | number | null | undefined>
) {
  const text = keyword.trim().toLowerCase();

  if (text === "") return true;

  return values
    .map((value) => String(value || ""))
    .join(" ")
    .toLowerCase()
    .includes(text);
}

export default function AdminCompaniesPage() {
  const [companyList, setCompanyList] = useState<CompanyVerification[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function checkAdminPermission() {
    setCheckingAdmin(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      alert("请先登录后访问后台。");
      window.location.href = "/login";
      return false;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("company_verification")
      .select("is_admin")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (profileError) {
      alert(`读取管理员权限失败：${profileError.message}`);
      window.location.href = "/";
      return false;
    }

    if (!profileData || profileData.is_admin !== true) {
      alert("无权限访问后台。");
      window.location.href = "/";
      return false;
    }

    setIsAdmin(true);
    setCheckingAdmin(false);
    return true;
  }

  async function fetchCompanies() {
    setLoading(true);

    const { data, error } = await supabase
      .from("company_verification")
      .select(
        "id, user_id, user_type, company_name, unified_social_credit_code, company_type, contact_name, contact_phone, contact_email, main_business, business_license_path, business_license_uploaded_at, verification_status, verified_at, rejected_reason, is_admin, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert(`读取企业认证失败：${error.message}`);
    } else {
      setCompanyList((data || []) as CompanyVerification[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    async function initPage() {
      const allowed = await checkAdminPermission();

      if (allowed) {
        await fetchCompanies();
      }
    }

    initPage();
  }, []);

  const filteredCompanyList = companyList.filter((item) => {
    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "admin"
          ? item.is_admin === true
          : item.verification_status === statusFilter;

    const matchSearch = matchKeyword(keyword, [
      item.company_name,
      item.user_type,
      item.company_type,
      item.contact_name,
      item.contact_phone,
      item.contact_email,
      item.unified_social_credit_code,
      item.main_business,
      item.verification_status,
      item.rejected_reason,
      item.created_at,
    ]);

    return matchStatus && matchSearch;
  });

  async function viewBusinessLicense(path: string | null) {
    if (!path) {
      alert("该企业未上传营业执照。");
      return;
    }

    const { data, error } = await supabase.storage
      .from("business-licenses")
      .createSignedUrl(path, 60 * 10);

    if (error || !data?.signedUrl) {
      alert(`生成营业执照查看链接失败：${error?.message || "未知错误"}`);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function approveCompany(id: string) {
    const confirmed = window.confirm("确认通过该企业认证吗？");

    if (!confirmed) return;

    setUpdatingId(id);

    const { error } = await supabase
      .from("company_verification")
      .update({
        verification_status: "approved",
        verified_at: new Date().toISOString(),
        rejected_reason: null,
      })
      .eq("id", id);

    setUpdatingId(null);

    if (error) {
      alert(`企业认证通过失败：${error.message}`);
      return;
    }

    alert("企业认证已通过。");
    await fetchCompanies();
  }

  async function rejectCompany(id: string) {
    const reason = window.prompt("请输入驳回原因：");

    if (reason === null) return;

    if (reason.trim() === "") {
      alert("驳回原因不能为空。");
      return;
    }

    setUpdatingId(id);

    const { error } = await supabase
      .from("company_verification")
      .update({
        verification_status: "rejected",
        rejected_reason: reason.trim(),
        verified_at: null,
      })
      .eq("id", id);

    setUpdatingId(null);

    if (error) {
      alert(`企业认证驳回失败：${error.message}`);
      return;
    }

    alert("企业认证已驳回。");
    await fetchCompanies();
  }

  if (checkingAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在校验管理员权限...
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-8 text-center text-red-600 shadow-sm ring-1 ring-slate-200">
            无权限访问后台。
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="企业认证审核"
          description="审核企业资料、营业执照和认证状态。支持关键词搜索、状态筛选、查看证照、认证通过和认证驳回。"
        />

        <div className="mb-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-[1fr_auto_auto_auto]">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="rounded-xl border px-4 py-3 text-sm"
            placeholder="搜索企业、联系人、电话、邮箱、信用代码、主营业务"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border bg-white px-3 py-3 text-sm"
          >
            <option value="all">全部企业</option>
            <option value="pending">待审核</option>
            <option value="approved">已认证</option>
            <option value="rejected">认证驳回</option>
            <option value="admin">管理员</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setStatusFilter("all");
            }}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            重置筛选
          </button>

          <button
            onClick={fetchCompanies}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            刷新数据
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取企业认证数据...
          </div>
        ) : (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">企业认证列表</h2>
              <p className="mt-1 text-sm text-slate-500">
                共 {companyList.length} 条企业认证记录，当前显示{" "}
                {filteredCompanyList.length} 条
              </p>
            </div>

            {filteredCompanyList.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
                暂无符合条件的企业认证数据
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredCompanyList.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-bold">
                            {item.company_name}
                          </h3>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                            {formatUserType(item.user_type)}
                          </span>

                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                            {formatVerificationStatus(item.verification_status)}
                          </span>

                          {item.is_admin ? (
                            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-700">
                              管理员
                            </span>
                          ) : null}

                          {item.business_license_path ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                              已上传证照
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                              未上传证照
                            </span>
                          )}
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                          <p>企业类型：{item.company_type}</p>
                          <p>联系人：{item.contact_name}</p>
                          <p>联系电话：{item.contact_phone}</p>
                          <p>联系邮箱：{item.contact_email}</p>
                          <p>
                            统一社会信用代码：
                            {item.unified_social_credit_code || "未填写"}
                          </p>
                          <p>提交时间：{formatDate(item.created_at)}</p>
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                          <p>主营业务：{item.main_business || "未填写"}</p>
                          <p>
                            证照上传时间：
                            {formatDate(item.business_license_uploaded_at)}
                          </p>
                        </div>

                        {item.verified_at ? (
                          <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
                            认证通过时间：{formatDate(item.verified_at)}
                          </div>
                        ) : null}

                        {item.rejected_reason ? (
                          <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                            驳回原因：{item.rejected_reason}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            viewBusinessLicense(item.business_license_path)
                          }
                          disabled={!item.business_license_path}
                          className="rounded-xl border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                        >
                          查看证照
                        </button>

                        <button
                          onClick={() => approveCompany(item.id)}
                          disabled={updatingId === item.id}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400"
                        >
                          认证通过
                        </button>

                        <button
                          onClick={() => rejectCompany(item.id)}
                          disabled={updatingId === item.id}
                          className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:bg-slate-400"
                        >
                          认证驳回
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}