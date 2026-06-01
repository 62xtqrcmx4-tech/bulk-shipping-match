"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import PageHeader from "../../../components/PageHeader";

type VesselSupply = {
  id: string;
  publisher_id: string;
  transport_type: string;
  vessel_type: string;
  dwt: number;
  capacity_unit: string | null;
  current_port_or_area: string;
  current_destination_port: string | null;
  available_start_date: string;
  available_end_date: string | null;
  service_area: string;
  regular_route: string | null;
  is_ballast_return: boolean;
  is_idle_slot: boolean;
  acceptable_cargo_types: string[];
  information_expiry_date: string;
  status: string;
  rejected_reason: string | null;
  remark: string | null;
};

const cargoTypeOptions = [
  "铁矿石",
  "煤炭",
  "粮食",
  "建材",
  "集装箱货物",
  "特种货物",
  "重大件",
  "其他",
];

export default function EditVesselPage() {
  const params = useParams();
  const vesselId = String(params.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vessel, setVessel] = useState<VesselSupply | null>(null);

  const [transportType, setTransportType] = useState("domestic");
  const [vesselType, setVesselType] = useState("");
  const [dwt, setDwt] = useState("");
  const [capacityUnit, setCapacityUnit] = useState("DWT");
  const [currentPortOrArea, setCurrentPortOrArea] = useState("");
  const [currentDestinationPort, setCurrentDestinationPort] = useState("");
  const [availableStartDate, setAvailableStartDate] = useState("");
  const [availableEndDate, setAvailableEndDate] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [regularRoute, setRegularRoute] = useState("");
  const [isBallastReturn, setIsBallastReturn] = useState(false);
  const [isIdleSlot, setIsIdleSlot] = useState(false);
  const [acceptableCargoTypes, setAcceptableCargoTypes] = useState<string[]>([]);
  const [informationExpiryDate, setInformationExpiryDate] = useState("");
  const [remark, setRemark] = useState("");

  async function fetchVessel() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      alert("请先登录后编辑船源。");
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("vessel_supply")
      .select(
        "id, publisher_id, transport_type, vessel_type, dwt, capacity_unit, current_port_or_area, current_destination_port, available_start_date, available_end_date, service_area, regular_route, is_ballast_return, is_idle_slot, acceptable_cargo_types, information_expiry_date, status, rejected_reason, remark"
      )
      .eq("id", vesselId)
      .maybeSingle();

    if (error) {
      alert(`读取船源失败：${error.message}`);
      window.location.href = "/my-vessels";
      return;
    }

    if (!data) {
      alert("未找到该船源。");
      window.location.href = "/my-vessels";
      return;
    }

    const currentVessel = data as VesselSupply;

    if (currentVessel.publisher_id !== userData.user.id) {
      alert("只能编辑自己发布的船源。");
      window.location.href = "/my-vessels";
      return;
    }

    if (currentVessel.status === "completed") {
      alert("已完成的船源不能编辑。");
      window.location.href = "/my-vessels";
      return;
    }

    setVessel(currentVessel);
    setTransportType(currentVessel.transport_type || "domestic");
    setVesselType(currentVessel.vessel_type || "");
    setDwt(String(currentVessel.dwt || ""));
    setCapacityUnit(currentVessel.capacity_unit || "DWT");
    setCurrentPortOrArea(currentVessel.current_port_or_area || "");
    setCurrentDestinationPort(currentVessel.current_destination_port || "");
    setAvailableStartDate(currentVessel.available_start_date || "");
    setAvailableEndDate(currentVessel.available_end_date || "");
    setServiceArea(currentVessel.service_area || "");
    setRegularRoute(currentVessel.regular_route || "");
    setIsBallastReturn(Boolean(currentVessel.is_ballast_return));
    setIsIdleSlot(Boolean(currentVessel.is_idle_slot));
    setAcceptableCargoTypes(
      Array.isArray(currentVessel.acceptable_cargo_types)
        ? currentVessel.acceptable_cargo_types
        : []
    );
    setInformationExpiryDate(currentVessel.information_expiry_date || "");
    setRemark(currentVessel.remark || "");

    setLoading(false);
  }

  useEffect(() => {
    if (vesselId) {
      fetchVessel();
    }
  }, [vesselId]);

  function toggleCargoType(type: string) {
    setAcceptableCargoTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((item) => item !== type);
      }

      return [...prev, type];
    });
  }

  function validateForm() {
    if (!vesselType.trim()) {
      alert("请选择或填写船型。");
      return false;
    }

    const capacity = Number(dwt);

    if (!dwt.trim() || Number.isNaN(capacity) || capacity <= 0) {
      alert("请输入有效的运力规模。");
      return false;
    }

    if (!capacityUnit.trim()) {
      alert("请选择运力单位。");
      return false;
    }

    if (!currentPortOrArea.trim()) {
      alert("请输入当前港口或所在区域。");
      return false;
    }

    if (!availableStartDate) {
      alert("请选择可用开始日期。");
      return false;
    }

    if (availableEndDate && availableEndDate < availableStartDate) {
      alert("可用结束日期不能早于可用开始日期。");
      return false;
    }

    if (!serviceArea.trim()) {
      alert("请输入服务区域。");
      return false;
    }

    if (acceptableCargoTypes.length === 0) {
      alert("请至少选择一种可承运货种。");
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

    if (!vessel) return;
    if (!validateForm()) return;

    const confirmed = window.confirm(
      "确认提交修改吗？提交后该船源将重新进入待审核状态，审核通过后才会重新展示。"
    );

    if (!confirmed) return;

    setSaving(true);

    const { error } = await supabase
      .from("vessel_supply")
      .update({
        transport_type: transportType,
        vessel_type: vesselType.trim(),
        dwt: Number(dwt),
        capacity_unit: capacityUnit,
        current_port_or_area: currentPortOrArea.trim(),
        current_destination_port: currentDestinationPort.trim() || null,
        available_start_date: availableStartDate,
        available_end_date: availableEndDate || null,
        service_area: serviceArea.trim(),
        regular_route: regularRoute.trim() || null,
        is_ballast_return: isBallastReturn,
        is_idle_slot: isIdleSlot,
        acceptable_cargo_types: acceptableCargoTypes,
        information_expiry_date: informationExpiryDate,
        remark: remark.trim() || null,
        status: "pending",
        rejected_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vessel.id)
      .eq("publisher_id", vessel.publisher_id);

    setSaving(false);

    if (error) {
      alert(`提交修改失败：${error.message}`);
      return;
    }

    alert("船源修改已提交，等待管理员重新审核。");
    window.location.href = "/my-vessels";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            正在读取船源信息...
          </div>
        </div>
      </main>
    );
  }

  if (!vessel) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            未找到船源。
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="编辑船源"
          description="修改船源信息后将重新提交审核。审核通过后，该船源才会重新出现在船源大厅。"
        />

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          {vessel.status === "rejected" && vessel.rejected_reason ? (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              <span className="font-semibold">上次审核未通过原因：</span>
              {vessel.rejected_reason}
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
              <span className="font-medium text-slate-700">船型</span>
              <select
                value={vesselType}
                onChange={(event) => setVesselType(event.target.value)}
                className="rounded-xl border px-3 py-3"
              >
                <option value="">请选择船型</option>
                <option value="散货船">散货船</option>
                <option value="集装箱船">集装箱船</option>
                <option value="多用途船">多用途船</option>
                <option value="重大件船">重大件船</option>
                <option value="杂货船">杂货船</option>
                <option value="其他">其他</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">运力规模</span>
              <input
                value={dwt}
                onChange={(event) => setDwt(event.target.value)}
                type="number"
                min="0"
                step="1"
                className="rounded-xl border px-3 py-3"
                placeholder="例如：50000"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">运力单位</span>
              <select
                value={capacityUnit}
                onChange={(event) => setCapacityUnit(event.target.value)}
                className="rounded-xl border px-3 py-3"
              >
                <option value="DWT">DWT</option>
                <option value="TEU">TEU</option>
                <option value="CBM">CBM</option>
                <option value="piece">件</option>
                <option value="other">其他</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">当前港口 / 区域</span>
              <input
                value={currentPortOrArea}
                onChange={(event) => setCurrentPortOrArea(event.target.value)}
                className="rounded-xl border px-3 py-3"
                placeholder="例如：长江口、上海港、华东区域"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">当前目的港</span>
              <input
                value={currentDestinationPort}
                onChange={(event) =>
                  setCurrentDestinationPort(event.target.value)
                }
                className="rounded-xl border px-3 py-3"
                placeholder="可选，例如：宁波舟山港"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">可用开始日期</span>
              <input
                value={availableStartDate}
                onChange={(event) => setAvailableStartDate(event.target.value)}
                type="date"
                className="rounded-xl border px-3 py-3"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">可用结束日期</span>
              <input
                value={availableEndDate}
                onChange={(event) => setAvailableEndDate(event.target.value)}
                type="date"
                className="rounded-xl border px-3 py-3"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">服务区域</span>
              <input
                value={serviceArea}
                onChange={(event) => setServiceArea(event.target.value)}
                className="rounded-xl border px-3 py-3"
                placeholder="例如：沿海、长江沿线、华东—华南"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">常跑航线</span>
              <input
                value={regularRoute}
                onChange={(event) => setRegularRoute(event.target.value)}
                className="rounded-xl border px-3 py-3"
                placeholder="可选，例如：北方港—长江港口"
              />
            </label>

            <label className="grid gap-2 text-sm md:col-span-2">
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

            <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
              <p className="text-sm font-medium text-slate-700">船期状态</p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={isBallastReturn}
                    onChange={(event) =>
                      setIsBallastReturn(event.target.checked)
                    }
                  />
                  返程空载
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={isIdleSlot}
                    onChange={(event) => setIsIdleSlot(event.target.checked)}
                  />
                  空档船期
                </label>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
              <p className="text-sm font-medium text-slate-700">可承运货种</p>

              <div className="mt-3 grid gap-3 md:grid-cols-4">
                {cargoTypeOptions.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={acceptableCargoTypes.includes(type)}
                      onChange={() => toggleCargoType(type)}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            <label className="grid gap-2 text-sm md:col-span-2">
              <span className="font-medium text-slate-700">备注</span>
              <textarea
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                className="min-h-28 rounded-xl border px-3 py-3"
                placeholder="可填写船舶能力、装卸条件、时间要求、特殊说明等"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t pt-5">
            <a
              href="/my-vessels"
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