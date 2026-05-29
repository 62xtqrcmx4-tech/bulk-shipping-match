"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const DEMO_FEEDBACK_USER_ID = "00000000-0000-0000-0000-000000000002";

type ContactRequest = {
  id: string;
  requester_id: string;
  target_user_id: string;
  cargo_demand_id: string | null;
  vessel_supply_id: string | null;
  request_type: string;
  status: string;
  created_at: string;
};

function formatRequestType(type: string) {
  if (type === "cargo_to_vessel") return "货方联系船源";
  if (type === "vessel_to_cargo") return "船方联系货源";
  return type;
}

export default function FeedbackPage() {
  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchContacts() {
      setLoading(true);

      const { data, error } = await supabase
        .from("contact_request")
        .select(
          "id, requester_id, target_user_id, cargo_demand_id, vessel_supply_id, request_type, status, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        alert(`读取联系记录失败：${error.message}`);
      } else {
        setContacts((data || []) as ContactRequest[]);
      }

      setLoading(false);
    }

    fetchContacts();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedContactId) {
      alert("请选择一条联系记录");
      return;
    }

    setSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const selectedContact = contacts.find((item) => item.id === selectedContactId);

    if (!selectedContact) {
      alert("未找到对应联系记录");
      setSubmitting(false);
      return;
    }

    const contacted = formData.get("contacted") === "yes";
    const responded = formData.get("responded") === "yes";
    const quoted = formData.get("quoted") === "yes";
    const dealReached = formData.get("deal_reached") === "yes";
    const overallRatingRaw = formData.get("overall_rating");

    const payload = {
      contact_request_id: selectedContactId,
      feedback_user_id: DEMO_FEEDBACK_USER_ID,
      target_user_id: selectedContact.target_user_id,
      contacted,
      responded,
      quoted,
      deal_reached: dealReached,
      no_deal_reason: String(formData.get("no_deal_reason") || ""),
      overall_rating: overallRatingRaw ? Number(overallRatingRaw) : null,
      comment: String(formData.get("comment") || ""),
    };

    const { error: feedbackError } = await supabase.from("feedback").insert(payload);

    if (feedbackError) {
      alert(`反馈提交失败：${feedbackError.message}`);
      setSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("contact_request")
      .update({ status: "feedback_submitted" })
      .eq("id", selectedContactId);

    setSubmitting(false);

    if (updateError) {
      alert(`反馈已提交，但联系记录状态更新失败：${updateError.message}`);
      return;
    }

    alert("反馈已提交。");

    event.currentTarget.reset();
    setSelectedContactId("");
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
        
        <h1 className="text-3xl font-bold">填写联系反馈</h1>
        <p className="mt-2 text-slate-500">
          用于记录联系后是否响应、是否报价、是否成交。当前为一期测试版。
        </p>

        {loading ? (
          <div className="mt-8 rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
            正在读取联系记录...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
            <label className="grid gap-2">
              <span className="font-medium">选择联系记录</span>
              <select
                value={selectedContactId}
                onChange={(event) => setSelectedContactId(event.target.value)}
                required
                className="rounded-xl border px-3 py-3"
              >
                <option value="">请选择</option>
                {contacts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatRequestType(item.request_type)}｜{item.id.slice(0, 8)}｜状态：
                    {item.status}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="font-medium">是否取得联系</span>
                <select name="contacted" required className="rounded-xl border px-3 py-3">
                  <option value="yes">是</option>
                  <option value="no">否</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="font-medium">对方是否响应</span>
                <select name="responded" required className="rounded-xl border px-3 py-3">
                  <option value="yes">是</option>
                  <option value="no">否</option>
                </select>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="font-medium">是否报价</span>
                <select name="quoted" className="rounded-xl border px-3 py-3">
                  <option value="yes">是</option>
                  <option value="no">否</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="font-medium">是否成交</span>
                <select name="deal_reached" required className="rounded-xl border px-3 py-3">
                  <option value="no">否</option>
                  <option value="yes">是</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="font-medium">未成交原因</span>
              <input
                name="no_deal_reason"
                className="rounded-xl border px-3 py-3"
                placeholder="例如：价格不合适、船期不匹配、未响应等"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">整体评价，1–5 分</span>
              <select name="overall_rating" className="rounded-xl border px-3 py-3">
                <option value="">暂不评价</option>
                <option value="5">5 分，非常好</option>
                <option value="4">4 分，较好</option>
                <option value="3">3 分，一般</option>
                <option value="2">2 分，较差</option>
                <option value="1">1 分，很差</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="font-medium">备注</span>
              <textarea
                name="comment"
                className="min-h-28 rounded-xl border px-3 py-3"
                placeholder="可填写联系过程、报价情况、成交情况等"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submitting ? "提交中..." : "提交反馈"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}