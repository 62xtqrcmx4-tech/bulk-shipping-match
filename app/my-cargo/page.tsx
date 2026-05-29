"use client";

import { useEffect, useState } from "react";
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
  requester_company_name?: string;
  requester_contact_name?: string;
};

type CargoDemand = {
  id: string;
  publisher_id: string;
  transport_type: string;
  cargo_type: string;
  cargo_quantity: number;
  cargo_unit: string;
  loading_port: string;
  discharge_port: string;
  planned_loading_date: string;
  expected_vessel_type: string;
  information_expiry_date: string;
  status: string;
  completed_contact_request_id: string | null;
  completed_vessel_user_id: string | null;
  completed_at: string | null;
  completion_note: string | null;
  created_at: string;
  contacts?: ContactRequest[];
};

type CompanyProfile = {
  user_id: string;
  company_name: string;
  contact_name: string;
};

function formatTransportType(type: string) {
  if (type === "domestic") return "内贸";
  if (type === "international") return "外贸";
  return type;
}

function formatStatus(status: string) {
  if (status === "pending") return "待审核";
  if (status === "published") return "可联系";
  if (status === "completed") return "已完成";
  if (status === "closed") return "已关闭";
  if (status === "expired") return "已过期";
  if (status === "rejected") return "审核未通过";
  if (status === "draft") return "草稿";
  return status;
}

function formatDate(value: string | null) {
  if (!value) return "未记录";
  return new Date(value).toLocaleString("zh-CN");
}

function getContactDisplayName(contact: ContactRequest) {
  const company = contact.requester_company_name || "未知船方公司";
  const person = contact.requester_contact_name || "未填写联系人";
  return `${company}｜${person}`;
}

export default function MyCargoPage() {
  const [cargoList, setCargoList] = useState<CargoDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [cargoTypeFilter, setCargoTypeFilter] = useState("all");
  const [contactFilter, setContactFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  const [selectedContactByCargo, setSelectedContactByCargo] = useState<
    Record<string, string>
  >({});

  const [completionNoteByCargo, setCompletionNoteByCargo] = useState<
    Record<string, string>
  >({});

  async function fetchMyCargo() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      alert("请先登录后查看我发布的货源。");
      window.location.href = "/login";
      return;
    }

    const userId = userData.user.id;

    const { data: cargoData, error: cargoError } = await supabase
      .from("cargo_demand")
      .select(
        "id, publisher_id, transport_type, cargo_type, cargo_quantity, cargo_unit, loading_port, discharge_port, planned_loading_date, expected_vessel_type, information_expiry_date, status, completed_contact_request_id, completed_vessel_user_id, completed_at, completion_note, created_at"
      )
      .eq("publisher_id", userId)
      .order("created_at", { ascending: false });

    if (cargoError) {
      alert(`读取我的货源失败：${cargoError.message}`);
      setLoading(false);
      return;
    }

    const cargos = (cargoData || []) as CargoDemand[];

    if (cargos.length === 0) {
      setCargoList([]);
      setLoading(false);
      return;
    }

    const cargoIds = cargos.map((item) => item.id);

    const { data: contactData, error: contactError } = await supabase
      .from("contact_request")
      .select(
        "id, requester_id, target_user_id, cargo_demand_id, vessel_supply_id, request_type, status, created_at"
      )
      .in("cargo_demand_id", cargoIds)
      .order("created_at", { ascending: false });

    if (contactError) {
      alert(`读取订单联系记录失败：${contactError.message}`);
      setCargoList(cargos);
      setLoading(false);
      return;
    }

    const contacts = (contactData || []) as ContactRequest[];

    const requesterIds = Array.from(
      new Set(contacts.map((item) => item.requester_id).filter(Boolean))
    );

    let profiles: CompanyProfile[] = [];

    if (requesterIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from("company_verification")
        .select("user_id, company_name, contact_name")
        .in("user_id", requesterIds);

      if (!profileError) {
        profiles = (profileData || []) as CompanyProfile[];
      }
    }

    const profileMap = new Map<string, CompanyProfile>();

    profiles.forEach((profile) => {
      if (!profileMap.has(profile.user_id)) {
        profileMap.set(profile.user_id, profile);
      }
    });

    const contactsWithProfiles = contacts.map((contact) => {
      const profile = profileMap.get(contact.requester_id);

      return {
        ...contact,
        requester_company_name: profile?.company_name || "",
        requester_contact_name: profile?.contact_name || "",
      };
    });

    const merged = cargos.map((cargo) => ({
      ...cargo,
      contacts: contactsWithProfiles.filter(
        (contact) => contact.cargo_demand_id === cargo.id
      ),
    }));

    setCargoList(merged);
    setLoading(false);
  }

  useEffect(() => {
    fetchMyCargo();
  }, []);

  const filteredCargoList = cargoList.filter((item) => {
    const contacts = item.contacts || [];

    const matchStatus =
      statusFilter === "all" ? true : item.status === statusFilter;

    const matchCargoType =
      cargoTypeFilter === "all" ? true : item.cargo_type === cargoTypeFilter;

    const keywordText = keyword.trim().toLowerCase();

    const matchKeyword =
      keywordText === ""
        ? true
        : [
            item.cargo_type,
            item.loading_port,
            item.discharge_port,
            item.expected_vessel_type,
          ]
            .join(" ")
            .toLowerCase()
            .includes(keywordText);

    const matchContact =
      contactFilter === "all"
        ? true
        : contactFilter === "has_contact"
          ? contacts.length > 0
          : contacts.length === 0;

    return matchStatus && matchCargoType && matchKeyword && matchContact;
  });

  async function completeCargo(cargo: CargoDemand) {
    const selectedContactId = selectedContactByCargo[cargo.id];

    if (!selectedContactId) {
      alert("请先选择完成该订单的船方。");
      return;
    }

    const contacts = cargo.contacts || [];
    const selectedContact = contacts.find((item) => item.id === selectedContactId);

    if (!selectedContact) {
      alert("未找到对应船方联系记录。");
      return;
    }

    const confirmed = window.confirm(
      `确认将该订单标记为已完成？\n\n成交船方：${getContactDisplayName(
        selectedContact
      )}`
    );

    if (!confirmed) return;

    setUpdatingId(cargo.id);

    const { error } = await supabase
      .from("cargo_demand")
      .update({
        status: "completed",
        completed_contact_request_id: selectedContact.id,
        completed_vessel_user_id: selectedContact.requester_id,
        completed_at: new Date().toISOString(),
        completion_note: completionNoteByCargo[cargo.id] || "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", cargo.id);

    setUpdatingId(null);

    if (error) {
      alert(`标记订单完成失败：${error.message}`);
      return;
    }

    alert("订单已标记为完成。");
    await fetchMyCargo();
  }

  async function closeCargo(cargoId: string) {
    const confirmed = window.confirm("确认关闭该订单吗？关闭后前台将不再展示。");

    if (!confirmed) return;

    setUpdatingId(cargoId);

    const { error } = await supabase
      .from("cargo_demand")
      .update({
        status: "closed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", cargoId);

    setUpdatingId(null);

    if (error) {
      alert(`关闭订单失败：${error.message}`);
      return;
    }

    alert("订单已关闭。");
    await fetchMyCargo();
  }

  function resetFilters() {
    setStatusFilter("all");
    setCargoTypeFilter("all");
    setContactFilter("all");
    setKeyword("");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="我发布的货源"
          description="管理我发布的货源订单，查看联系过该订单的船方，并标记订单完成或关闭。"
          actionHref="/publish-cargo"
          actionText="发布货源"
        />

        <div className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-5">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border px-3 py-2"
          >
            <option value="all">全部状态</option>
            <option value="pending">待审核</option>
            <option value="published">可联系</option>
            <option value="completed">已完成</option>
            <option value="closed">已关闭</option>
            <option value="rejected">审核未通过</option>
            <option value="expired">已过期</option>
          </select>

          <select
            value={cargoTypeFilter}
            onChange={(event) => setCargoTypeFilter(event.target.value)}
            className="rounded-xl border px-3 py-2"
          >
            <option value="all">全部货种</option>
            <option value="铁矿石">铁矿石</option>
            <option value="煤炭">煤炭</option>
            <option value="粮食">粮食</option>
            <option value="建材">建材</option>
            <option value="其他">其他</option>
          </select>

          <select
            value={contactFilter}
            onChange={(event) => setContactFilter(event.target.value)}
            className="rounded-xl border px-3 py-2"
          >
            <option value="all">全部联系状态</option>
            <option value="has_contact">已有船方联系</option>
            <option value="no_contact">暂无船方联系</option>
          </select>

          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="rounded-xl border px-3 py-2"
            placeholder="搜索货种、港口、船型"
          />

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl bg-slate-900 px-4 py-2 text-white"
          >
            重置筛选
          </button>
        </div>

        <div className="mb-4 text-sm text-slate-500">
          共 {cargoList.length} 条订单，当前显示 {filteredCargoList.length} 条。
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取我的货源...
          </div>
        ) : cargoList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            暂无我发布的货源。你可以先发布一条货源。
          </div>
        ) : filteredCargoList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            没有符合筛选条件的订单。
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredCargoList.map((item) => {
              const contacts = item.contacts || [];
              const canComplete =
                item.status !== "completed" &&
                item.status !== "closed" &&
                contacts.length > 0;

              const completedContact = contacts.find(
                (contact) => contact.id === item.completed_contact_request_id
              );

              return (
                <div
                  key={item.id}
                  className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold">{item.cargo_type}</h2>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                          {formatTransportType(item.transport_type)}
                        </span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                          {formatStatus(item.status)}
                        </span>
                      </div>

                      <p className="mt-2 text-slate-600">
                        {item.loading_port} → {item.discharge_port}
                      </p>

                      <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-4">
                        <p>
                          货量：{item.cargo_quantity}{" "}
                          {item.cargo_unit === "ton" ? "吨" : item.cargo_unit}
                        </p>
                        <p>计划装货：{item.planned_loading_date}</p>
                        <p>期望船型：{item.expected_vessel_type}</p>
                        <p>有效期至：{item.information_expiry_date}</p>
                      </div>

                      {item.status === "completed" ? (
                        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
                          <p>订单已完成：{formatDate(item.completed_at)}</p>
                          <p>
                            成交船方：
                            {completedContact
                              ? getContactDisplayName(completedContact)
                              : "未识别"}
                          </p>
                          <p>完成备注：{item.completion_note || "无"}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => closeCargo(item.id)}
                        disabled={updatingId === item.id || item.status === "closed"}
                        className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        关闭订单
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 border-t pt-5">
                    <h3 className="font-bold">联系过该订单的船方</h3>

                    {contacts.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">
                        暂无船方联系该订单。
                      </p>
                    ) : (
                      <div className="mt-3 grid gap-3">
                        {contacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-medium">
                                  {getContactDisplayName(contact)}
                                </p>
                                <p className="mt-1 text-slate-500">
                                  联系时间：{formatDate(contact.created_at)}｜状态：
                                  {contact.status}
                                </p>
                              </div>

                              <a
                                href={`/feedback?contactId=${contact.id}`}
                                className="rounded-xl border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                              >
                                评价该船方
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {canComplete ? (
                    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                      <h3 className="font-bold text-emerald-900">
                        标记订单完成
                      </h3>
                      <p className="mt-1 text-sm text-emerald-700">
                        请选择最终完成该订单的船方，系统将把该货源标记为已完成。
                      </p>

                      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                        <select
                          value={selectedContactByCargo[item.id] || ""}
                          onChange={(event) =>
                            setSelectedContactByCargo((prev) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))
                          }
                          className="rounded-xl border px-3 py-3"
                        >
                          <option value="">请选择成交船方</option>
                          {contacts.map((contact) => (
                            <option key={contact.id} value={contact.id}>
                              {getContactDisplayName(contact)}
                            </option>
                          ))}
                        </select>

                        <input
                          value={completionNoteByCargo[item.id] || ""}
                          onChange={(event) =>
                            setCompletionNoteByCargo((prev) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))
                          }
                          className="rounded-xl border px-3 py-3"
                          placeholder="完成备注，可选"
                        />

                        <button
                          onClick={() => completeCargo(item)}
                          disabled={updatingId === item.id}
                          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          确认完成
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}