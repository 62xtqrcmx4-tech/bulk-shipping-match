"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import PageHeader from "../../../components/PageHeader";

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
  rejected_reason: string | null;
  remark: string | null;
};

export default function EditCargoPage() {
  const params = useParams();
  const cargoId = String(params.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cargo, setCargo] = useState<CargoDemand | null>(null);

  const [transportType, setTransportType] = useState("domestic");
  const [cargoType, setCargoType] = useState("");
  const [cargoQuantity, setCargoQuantity] = useState("");
  const [cargoUnit, setCargoUnit] = useState("ton");
  const [loadingPort, setLoadingPort] = useState("");
  const [dischargePort, setDischargePort] = useState("");
  const [plannedLoadingDate, setPlannedLoadingDate] = useState("");
  const [expectedVesselType, setExpectedVesselType] = useState("");
  const [informationExpiryDate, setInformationExpiryDate] = useState("");
  const [remark, setRemark] = useState("");

  async function fetchCargo() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      alert("请先登录后编辑货源。");
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("cargo_demand")
      .select(
        "id, publisher_id, transport_type, cargo_type, cargo_quantity, cargo_unit, loading_port, discharge_port, planned_loading_date, expected_vessel_type, information_expiry_date, status, rejected_reason, remark"
      )
      .eq("id", cargoId)
      .maybeSingle();

    if (error) {
      alert(`读取货源失败：${error.message}`);
      window.location.href = "/my-cargo";
      return;
    }

    if (!data) {
      alert("未找到该货源。");
      window.location.href = "/my-cargo";
      return;
    }

    const currentCargo = data as CargoDemand;

    if (currentCargo.publisher_id !== userData.user.id) {
      alert("只能编辑自己发布的货源。");
      window.location.href = "/my-cargo";
      return;
    }

    if (currentCargo.status === "completed") {
      alert("已完成的货源不能编辑。");
      window.location.href = "/my-cargo";
      return;
    }

    setCargo(currentCargo);
    setTransportType(currentCargo.transport_type || "domestic");
    setCargoType(currentCargo.cargo_type || "");
    setCargoQuantity(String(currentCargo.cargo_quantity || ""));
    setCargoUnit(currentCargo.cargo_unit || "ton");
    setLoadingPort(currentCargo.loading_port || "");
    setDischargePort(currentCargo.discharge_port || "");
    setPlannedLoadingDate(currentCargo.planned_loading_date || "");
    setExpectedVesselType(currentCargo.expected_vessel_type || "");
    setInformationExpiryDate(currentCargo.information_expiry_date || "");
    setRemark(currentCargo.remark || "");

    setLoading(false);
  }

  useEffect(() => {
    if (cargoId) {
      fetchCargo();
    }
  }, [cargoId]);

  function validateForm() {
    if (!cargoType.trim()) {
      alert("请选择或填写货种。");
      return false;
    }

    const quantity = Number(cargoQuantity);

    if (!cargoQuantity.trim() || Number.isNaN(quantity) || quantity <= 0) {
      alert("请输入有效的货量。");
      return false;
    }

    if (!loadingPort.trim()) {
      alert("请输入装货港。");
      return false;
    }

    if (!dischargePort.trim()) {
      alert("请输入卸货港。");
      return false;
    }

    if (!plannedLoadingDate) {
      alert("请选择计划装货日期。");
      return false;
    }

    if (!expectedVesselType.trim()) {
      alert("请输入期望船型。");
      return false;
    }

    if (!informationExpiryDate) {
      alert("请选择信息有效期。");
      return false;
    }

    const today = new Date().toISOString().slice(0, 10);

    if (informationExpiryDate < today) {
      alert("信息有效期不能早于今天。");
      return false;
    }

    return true;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cargo) return;
    if (!validateForm()) return;

    const confirmed = window.confirm(
      "确认提交修改吗？提交后该货源将重新进入待审核状态，审核通过后才会重新展示。"
    );

    if (!confirmed) return;

    setSaving(true);

    const { error } = await supabase
      .from("cargo_demand")
      .update({
        transport_type: transportType,
        cargo_type: cargoType.trim(),
        cargo_quantity: Number(cargoQuantity),
        cargo_unit: cargoUnit,
        loading_port: loadingPort.trim(),
        discharge_port: dischargePort.trim(),
        planned_loading_date: plannedLoadingDate,
        expected_vessel_type: expectedVesselType.trim(),
        information_expiry_date: informationExpiryDate,
        remark: remark.trim() || null,
        status: "pending",
        rejected_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cargo.id)
      .eq("publisher_id", cargo.publisher_id);

    setSaving(false);

    if (error) {
      alert(`提交修改失败：${error.message}`);
      return;
    }

    alert("货源修改已提交，等待管理员重新审核。");
    window.location.href = "/my-cargo";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取货源信息...
          </div>
        </div>
      </main>
    );
  }

  if (!cargo) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            未找到货源。
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="编辑货源"
          description="修改货源信息后将重新提交审核。审核通过后，该货源才会重新出现在货源大厅。"
        />

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          {cargo.status === "rejected" && cargo.rejected_reason ? (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              <span className="font-semibold">上次审核未通过原因：</span>
              {cargo.rejected_reason}
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">运输类型</span>
              <select
                value={transportType}
                onChange={(event) => setTransportType(event.target.value)}
                className="rounded-xl border px-3 py-3"
              >
                <option value="domestic">内贸</option>
                <option value="international">外贸</option>
                <option value="both">均可</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">货种</span>
              <select
                value={cargoType}
                onChange={(event) => setCargoType(event.target.value)}
                className="rounded-xl border px-3 py-3"
              >
                <option value="">请选择货种</option>
                <option value="铁矿石">铁矿石</option>
                <option value="煤炭">煤炭</option>
                <option value="粮食">粮食</option>
                <option value="建材">建材</option>
                <option value="集装箱货物">集装箱货物</option>
                <option value="特种货物">特种货物</option>
                <option value="重大件">重大件</option>
                <option value="其他">其他</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">货量</span>
              <input
                value={cargoQuantity}
                onChange={(event) => setCargoQuantity(event.target.value)}
                type="number"
                min="0"
                step="0.01"
                className="rounded-xl border px-3 py-3"
                placeholder="请输入货量"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">货量单位</span>
              <select
                value={cargoUnit}
                onChange={(event) => setCargoUnit(event.target.value)}
                className="rounded-xl border px-3 py-3"
              >
                <option value="ton">吨</option>
                <option value="teu">TEU</option>
                <option value="cbm">立方米</option>
                <option value="piece">件</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">装货港</span>
              <input
                value={loadingPort}
                onChange={(event) => setLoadingPort(event.target.value)}
                className="rounded-xl border px-3 py-3"
                placeholder="例如：大连港"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">卸货港</span>
              <input
                value={dischargePort}
                onChange={(event) => setDischargePort(event.target.value)}
                className="rounded-xl border px-3 py-3"
                placeholder="例如：上海港"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">计划装货日期</span>
              <input
                value={plannedLoadingDate}
                onChange={(event) => setPlannedLoadingDate(event.target.value)}
                type="date"
                className="rounded-xl border px-3 py-3"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">信息有效期</span>
              <input
                value={informationExpiryDate}
                onChange={(event) =>
                  setInformationExpiryDate(event.target.value)
                }
                type="date"
                className="rounded-xl border px-3 py-3"
              />
            </label>

            <label className="grid gap-2 text-sm md:col-span-2">
              <span className="font-medium text-slate-700">期望船型</span>
              <input
                value={expectedVesselType}
                onChange={(event) => setExpectedVesselType(event.target.value)}
                className="rounded-xl border px-3 py-3"
                placeholder="例如：5万吨级散货船、集装箱船、多用途船"
              />
            </label>

            <label className="grid gap-2 text-sm md:col-span-2">
              <span className="font-medium text-slate-700">备注</span>
              <textarea
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                className="min-h-28 rounded-xl border px-3 py-3"
                placeholder="可填写装卸要求、时间要求、货物特性等补充说明"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t pt-5">
            <a
              href="/my-cargo"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              取消
            </a>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? "提交中..." : "提交修改并重新审核"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}