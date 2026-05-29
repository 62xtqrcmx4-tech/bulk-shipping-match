"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type ContactRequest = {
  id: string;
  requester_id: string;
  target_user_id: string;
  cargo_demand_id: string | null;
  vessel_supply_id: string | null;
  request_type: string;
  request_message: string | null;
  auto_approved: boolean;
  status: string;
  contact_opened_at: string | null;
  created_at: string;
};

function formatRequestType(type: string) {
  if (type === "cargo_to_vessel") return "货方联系船源";
  if (type === "vessel_to_cargo") return "船方联系货源";
  return type;
}

function formatStatus(status: string) {
  if (status === "opened") return "已开放联系方式";
  if (status === "contacted") return "已联系";
  if (status === "feedback_submitted") return "已反馈";
  if (status === "closed") return "已关闭";
  return status;
}

function formatDate(value: string | null) {
  if (!value) return "未记录";
  return new Date(value).toLocaleString("zh-CN");
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function fetchContacts() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("contact_request")
        .select(
          "id, requester_id, target_user_id, cargo_demand_id, vessel_supply_id, request_type, request_message, auto_approved, status, contact_opened_at, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setContacts((data || []) as ContactRequest[]);
      }

      setLoading(false);
    }

    fetchContacts();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <a
            href="/"
            className="mb-6 inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
            ← 返回首页
        </a>
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold">联系记录</h1>
            <p className="mt-2 text-slate-500">
              查看平台中已发起的货源与船源联系申请。当前为一期测试版。
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/cargo"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              货源大厅
            </a>
            <a
              href="/vessels"
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              船源大厅
            </a>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取联系记录...
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl bg-red-50 p-5 text-red-700 ring-1 ring-red-200">
            数据读取失败：{errorMessage}
          </div>
        ) : contacts.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            暂无联系申请记录。你可以先在货源大厅或船源大厅点击“申请联系”。
          </div>
        ) : (
          <div className="grid gap-5">
            {contacts.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold">
                        {formatRequestType(item.request_type)}
                      </h2>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                        {formatStatus(item.status)}
                      </span>

                      {item.auto_approved ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                          自动开放
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                          人工审核
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm text-slate-600">
                      申请说明：{item.request_message || "未填写"}
                    </p>
                  </div>

                  <a
                    href={
                      item.cargo_demand_id
                        ? "/cargo"
                        : item.vessel_supply_id
                          ? "/vessels"
                          : "#"
                    }
                    className="rounded-xl border border-blue-700 px-5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    查看来源
                  </a>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <p>申请方 ID：{item.requester_id}</p>
                  <p>目标用户 ID：{item.target_user_id}</p>
                  <p>关联货源 ID：{item.cargo_demand_id || "无"}</p>
                  <p>关联船源 ID：{item.vessel_supply_id || "无"}</p>
                  <p>申请时间：{formatDate(item.created_at)}</p>
                  <p>开放时间：{formatDate(item.contact_opened_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}