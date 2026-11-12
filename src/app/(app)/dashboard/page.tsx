import Link from "next/link";
import {
  ArrowUpRight,
  BadgeDollarSign,
  Boxes,
  CircleAlert,
  ReceiptText,
  ShoppingBasket,
  TrendingUp,
  Users,
} from "lucide-react";
import { requireSession } from "@/lib/session";
import { getDashboardData } from "@/lib/queries";
import { can } from "@/lib/permissions";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import DashboardCharts from "./charts";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await requireSession();
  const params = await searchParams;
  const denied = params.denied === "1";
  const data = await getDashboardData();

  const kpis = [
    {
      label: "Facturacion historica",
      value: formatCurrency(data.kpis.facturacion),
      hint: `${formatNumber(data.kpis.ventas)} ventas registradas`,
      icon: BadgeDollarSign,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Ticket promedio",
      value: formatCurrency(data.kpis.ticketPromedio),
      hint: `${formatNumber(data.kpis.ventasHoy)} ventas hoy`,
      icon: ReceiptText,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "Clientes fidelizados",
      value: formatNumber(data.kpis.clientes),
      hint: `${formatNumber(data.kpis.empleados)} colaboradores`,
      icon: Users,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      label: "Stock critico",
      value: formatNumber(data.kpis.stockBajo),
      hint: `de ${formatNumber(data.kpis.productos)} productos`,
      icon: CircleAlert,
      tone: "bg-amber-50 text-amber-700",
    },
  ];

  const puedeConsultar = can(sesion.usuario.rol, "consulta.transacciones");

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-600">
            Panel general
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Hola, {sesion.usuario.nombre.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Resumen operativo de EcoMarket Vital al {formatDateTime(new Date())}.
          </p>
        </div>
        <div className="flex gap-2">
          {puedeConsultar && (
            <Link
              href="/consultas"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
            >
              <TrendingUp className="h-4 w-4" />
              Explorar consultas
            </Link>
          )}
          <Link
            href="/seguridad"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Seguridad
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {denied && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Tu rol no tiene permisos para acceder a esa seccion. Se aplico el principio de menor
          privilegio.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {kpi.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{kpi.value}</p>
                </div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400">{kpi.hint}</p>
            </div>
          );
        })}
      </div>

      <DashboardCharts
        ventasPorMes={data.ventasPorMes}
        categorias={data.categorias}
        topProductos={data.topProductos}
        metodosPago={data.metodosPago}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Ultimas transacciones</h2>
              <p className="text-xs text-slate-400">Actividad reciente del comercio</p>
            </div>
            {puedeConsultar && (
              <Link href="/consultas" className="text-xs font-semibold text-brand-700 hover:underline">
                Ver detalle
              </Link>
            )}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Cliente</th>
                  <th>Sucursal</th>
                  <th>Metodo</th>
                  <th className="text-right">Total</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data.ultimasVentas.map((venta) => (
                  <tr key={String(venta.id)}>
                    <td className="font-mono text-xs">#{String(venta.id).padStart(5, "0")}</td>
                    <td>{venta.cliente}</td>
                    <td className="max-w-[180px] truncate">{venta.sucursal}</td>
                    <td>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {venta.metodoPago}
                      </span>
                    </td>
                    <td className="text-right font-semibold text-slate-800">
                      {formatCurrency(venta.total)}
                    </td>
                    <td className="text-xs text-slate-500">{formatDateTime(venta.fecha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShoppingBasket className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-800">Stock critico</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">Productos por debajo del minimo</p>
          <div className="mt-4 space-y-3">
            {data.stockCritico.length === 0 && (
              <p className="rounded-xl bg-emerald-50 px-3 py-6 text-center text-xs text-emerald-700">
                Todo el inventario esta por encima del minimo.
              </p>
            )}
            {data.stockCritico.map((p) => (
              <div key={String(p.nombre)} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">{p.nombre}</p>
                  <p className="text-[11px] text-slate-400">Minimo: {p.stockMinimo}</p>
                </div>
                <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                  {p.stock}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <Boxes className="h-4 w-4 text-brand-600" />
              Inventario total
            </div>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {formatNumber(data.kpis.productos)} productos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
