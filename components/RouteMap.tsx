"use client";

import "leaflet/dist/leaflet.css";

import { useEffect } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import { findPortCoordinate } from "../lib/portCoordinates";

type RouteMapProps = {
  loadPort?: string | null;
  dischargePort?: string | null;
  height?: number;
  fromLabel?: string;
  toLabel?: string;
  emptyText?: string;
};

function transformLat(x: number, y: number) {
  let ret =
    -100.0 +
    2.0 * x +
    3.0 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));

  ret +=
    ((20.0 * Math.sin(6.0 * x * Math.PI) +
      20.0 * Math.sin(2.0 * x * Math.PI)) *
      2.0) /
    3.0;

  ret +=
    ((20.0 * Math.sin(y * Math.PI) +
      40.0 * Math.sin((y / 3.0) * Math.PI)) *
      2.0) /
    3.0;

  ret +=
    ((160.0 * Math.sin((y / 12.0) * Math.PI) +
      320 * Math.sin((y * Math.PI) / 30.0)) *
      2.0) /
    3.0;

  return ret;
}

function transformLng(x: number, y: number) {
  let ret =
    300.0 +
    x +
    2.0 * y +
    0.1 * x * x +
    0.1 * x * y +
    0.1 * Math.sqrt(Math.abs(x));

  ret +=
    ((20.0 * Math.sin(6.0 * x * Math.PI) +
      20.0 * Math.sin(2.0 * x * Math.PI)) *
      2.0) /
    3.0;

  ret +=
    ((20.0 * Math.sin(x * Math.PI) +
      40.0 * Math.sin((x / 3.0) * Math.PI)) *
      2.0) /
    3.0;

  ret +=
    ((150.0 * Math.sin((x / 12.0) * Math.PI) +
      300.0 * Math.sin((x / 30.0) * Math.PI)) *
      2.0) /
    3.0;

  return ret;
}

function outOfChina(lat: number, lng: number) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function wgs84ToGcj02(lat: number, lng: number): [number, number] {
  if (outOfChina(lat, lng)) return [lat, lng];

  const a = 6378245.0;
  const ee = 0.00669342162296594323;

  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);

  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;

  const sqrtMagic = Math.sqrt(magic);

  dLat =
    (dLat * 180.0) /
    (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);

  dLng =
    (dLng * 180.0) /
    ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);

  return [lat + dLat, lng + dLng];
}

function AmapTileLayer() {
  const map = useMap();

  useEffect(() => {
    const tileLayer = L.tileLayer(
      "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}",
      {
        subdomains: ["1", "2", "3", "4"],
        attribution: "© 高德地图",
        maxZoom: 18,
        minZoom: 3,
      }
    );

    tileLayer.addTo(map);

    return () => {
      tileLayer.removeFrom(map);
    };
  }, [map]);

  return null;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    const timer = window.setTimeout(() => {
      map.invalidateSize();

      if (points.length === 1) {
        map.setView(points[0], 6);
        return;
      }

      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [map, points]);

  return null;
}

export default function RouteMap({
  loadPort,
  dischargePort,
  height = 250,
  fromLabel = "装货港",
  toLabel = "卸货港",
  emptyText = "暂未配置该航线的港口坐标，当前无法显示地图",
}: RouteMapProps) {
  const from = findPortCoordinate(loadPort);
  const to = findPortCoordinate(dischargePort);

  if (!from && !to) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-center text-sm text-slate-500"
        style={{ height, width: "100%" }}
      >
        {emptyText}
      </div>
    );
  }

  const fromPoint = from ? wgs84ToGcj02(from.lat, from.lng) : null;
  const toPoint = to ? wgs84ToGcj02(to.lat, to.lng) : null;

  const points: [number, number][] = [];

  if (fromPoint) points.push(fromPoint);
  if (toPoint) points.push(toPoint);

  const center: [number, number] = points[0] || [35, 105];

  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      style={{ width: "100%" }}
    >
      <MapContainer
        center={center}
        zoom={5}
        style={{ height, width: "100%" }}
        scrollWheelZoom={false}
        attributionControl={true}
      >
        <AmapTileLayer />

        <FitBounds points={points} />

        {from && fromPoint ? (
          <CircleMarker
            center={fromPoint}
            radius={8}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#2563eb",
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div>
                <div className="font-semibold">{fromLabel}</div>
                <div>{from.name}</div>
              </div>
            </Popup>
          </CircleMarker>
        ) : null}

        {to && toPoint ? (
          <CircleMarker
            center={toPoint}
            radius={8}
            pathOptions={{
              color: "#16a34a",
              fillColor: "#16a34a",
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div>
                <div className="font-semibold">{toLabel}</div>
                <div>{to.name}</div>
              </div>
            </Popup>
          </CircleMarker>
        ) : null}

        {fromPoint && toPoint ? (
          <Polyline
            positions={[fromPoint, toPoint]}
            pathOptions={{
              color: "#0f172a",
              weight: 3,
              dashArray: "8 8",
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}