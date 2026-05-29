"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import PageHeader from "../../components/PageHeader";

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

function formatStatus(status: string) {
  if (status === "opened") return "已开放联系方式";
  if (status === "contacted") return "已联系";
  if (status === "feedback_submitted") return "已反馈";
  if (status === "closed") return "已关闭";
  return status;
}

export default function FeedbackPage() {
  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchContacts() {
      setLoading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        alert("请先登录后再填写反馈。");
        window.location.href = "/login";
        return;
      }

      const userId = userData.user.id;
      setCurrentUserId(userId);

      const { data, error } = await supabase
        .from("contact_request")
        .select(
          "id, requester_id, target_user_id, cargo_demand_id, vessel_supply_id, request_type, status, created_at"
        )
        .or(`requester_id.eq.${userId},target_user_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) {
        alert(`读取联系记录失败：${error.message}`);
        setLoading(false);
        return;
      }

      const allContacts = (data || []) as ContactRequest[];

      const cargoSideCanEvaluate = allContacts.filter((item) => {
        if (item.request_type === "cargo_to_vessel") {
          return item.requester_id === userId;
        }

        if (item.request_type === "vessel_to_cargo") {
          return item.target_user_id === userId;
        }

        return false;
      });

      setContacts(cargoSideCanEvaluate);
      setLoading(false);
    }

    fetchContacts();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUserId) {
      alert("请先登录后再提交反馈。");
      window.location.href = "/login";
      return;
    }

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

    let vesselSideUserId = "";

    if (selectedContact.request_type === "cargo_to_vessel") {
      vesselSideUserId = selectedContact.target_user_id;
    }

    if (selectedContact.request_type === "vessel_to_cargo") {
      vesselSideUserId = selectedContact.requester_id;
    }

    if (!vesselSideUserId) {
      alert("无法识别被评价的船方用户。");
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
      feedback_user_id: currentUserId,
      target_user_id: vesselSideUserId,
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

    setContacts((prev) =>
      prev.map((item) =>
        item.id === selectedContactId
          ? { ...item, status: "feedback_submitted" }
          : item
      )
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="评价船方"
          description="仅货源方可对船方响应、报价和成交情况进行反馈，用于沉淀船方服务质量与平台撮合效果。"
        />
      </div>

      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
            正在读取可评价记录...
          </div>
        ) : contacts.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
            暂无可评价的船方联系记录。货源方在联系船源后，可在此填写反馈。
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-6">
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
                    {formatRequestType(item.request_type)}｜
                    {item.id.slice(0, 8)}｜
                    状态：{formatStatus(item.status)}
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
                <span className="font-medium">船方是否响应</span>
                <select name="responded" required className="rounded-xl border px-3 py-3">
                  <option value="yes">是</option>
                  <option value="no">否</option>
                </select>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="font-medium">船方是否报价</span>
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
                placeholder="例如：价格不合适、船期不匹配、船方未响应等"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">船方整体评价，1–5 分</span>
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
                placeholder="可填写船方响应速度、报价情况、沟通情况、成交情况等"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submitting ? "提交中..." : "提交船方评价"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}