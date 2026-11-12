"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatNumber } from "@/lib/format";

type Row = Record<string, string | number | boolean | null>;

const COLORS = ["#047857", "#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0"];

export default function DashboardCharts({
  ventasPorMes,
  categorias,
  topProductos,
  metodosPago,
}: {
  ventasPorMes: Row[];
  categorias: Row[];
  topProductos: Row[];
  metodosPago: Row[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const monthly = ventasPorMes.map((r) => ({
    periodo: String(r.periodo),
    total: Number(r.total),
    ventas: Number(r.ventas),
  }));
  const cats = categorias.map((r) => ({
    name: String(r.categoria),
    value: Number(r.ingresos),
  }));
  const productos = topProductos.map((r) => ({
    nombre: String(r.nombre).length > 26 ? `${String(r.nombre).slice(0, 26)}...` : String(r.nombre),
    ingresos: Number(r.ingresos),
  }));
  const totalPagos = metodosPago.reduce((acc, r) => acc + Number(r.transacciones), 0) || 1;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Evolucion de ventas</h2>
              <p className="text-xs text-slate-400">Facturacion mensual en colones</p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-700">
              {formatNumber(monthly.reduce((a, m) => a + m.ventas, 0))} ventas
            </span>
          </div>
          <div className="mt-4 h-64">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ventasFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f1" vertical={false} />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    width={70}
                    tickFormatter={(value) => `₡${Math.round(Number(value) / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number), "Facturacion"]}
                    labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fill="url(#ventasFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full animate-pulse rounded-xl bg-slate-100" />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Ingresos por categoria</h2>
          <p className="text-xs text-slate-400">Participacion en la facturacion</p>
          <div className="mt-2 h-48">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cats}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {cats.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full animate-pulse rounded-xl bg-slate-100" />
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {cats.slice(0, 6).map((c, i) => (
              <div key={c.name} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800">Productos con mayor ingreso</h2>
          <p className="text-xs text-slate-400">Top 6 por facturacion acumulada</p>
          <div className="mt-4 h-60">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productos} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f1" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `₡${Math.round(Number(value) / 1000)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={170}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Bar dataKey="ingresos" fill="#10b981" radius={[0, 8, 8, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full animate-pulse rounded-xl bg-slate-100" />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Metodos de pago</h2>
          <p className="text-xs text-slate-400">Distribucion de transacciones</p>
          <div className="mt-4 space-y-3">
            {metodosPago.map((m, i) => {
              const count = Number(m.transacciones);
              const pct = Math.round((count / totalPagos) * 100);
              return (
                <div key={String(m.metodoPago)}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">{m.metodoPago}</span>
                    <span className="text-slate-400">
                      {count} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            Los metodos con mayor volumen concentran la operacion diaria del supermercado.
          </div>
        </div>
      </div>
    </div>
  );
}
