import Link from "next/link";
import { Rol, Prisma } from "@prisma/client";
import {
  CheckCircle2,
  Filter,
  ScrollText,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZE = 25;

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole([Rol.ADMIN, Rol.GERENTE, Rol.AUDITOR]);

  const params = await searchParams;
  const q = first(params.q).trim();
  const accion = first(params.accion);
  const resultado = first(params.resultado);
  const desde = first(params.desde);
  const hasta = first(params.hasta);
  const page = Math.max(1, Number.parseInt(first(params.page) || "1", 10) || 1);

  const where: Prisma.AuditoriaWhereInput = {};
  if (accion) where.accion = accion;
  if (resultado === "ok") where.exito = true;
  if (resultado === "fail") where.exito = false;
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { accion: { contains: q, mode: "insensitive" } },
      { detalle: { contains: q, mode: "insensitive" } },
      { ip: { contains: q, mode: "insensitive" } },
    ];
  }
  if (desde || hasta) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = new Date(`${desde}T00:00:00`);
    if (hasta) where.createdAt.lte = new Date(`${hasta}T23:59:59.999`);
  }

  const [total, eventos, acciones, resumen] = await Promise.all([
    prisma.auditoria.count({ where }),
    prisma.auditoria.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { usuario: { select: { nombre: true, rol: true } } },
    }),
    prisma.auditoria.groupBy({
      by: ["accion"],
      _count: { _all: true },
      orderBy: { _count: { accion: "desc" } },
      take: 12,
    }),
    prisma.auditoria.groupBy({
      by: ["exito"],
      _count: { _all: true },
    }),
  ]);

  const exitos = resumen.find((r) => r.exito)?._count._all ?? 0;
  const fallos = resumen.find((r) => !r.exito)?._count._all ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(target: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (accion) sp.set("accion", accion);
    if (resultado) sp.set("resultado", resultado);
    if (desde) sp.set("desde", desde);
    if (hasta) sp.set("hasta", hasta);
    if (target > 1) sp.set("page", String(target));
    const qs = sp.toString();
    return `/auditoria${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-600">Trazabilidad</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Bitacora de auditoria</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Registro inmutable de accesos y acciones sensibles. Permite reconstruir quien hizo que,
          cuando y desde donde, apoyando el cumplimiento y la deteccion de incidentes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<ScrollText className="h-5 w-5" />}
          label="Eventos registrados"
          value={total.toLocaleString("es-CR")}
          tone="brand"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Operaciones exitosas"
          value={exitos.toLocaleString("es-CR")}
          tone="emerald"
        />
        <StatCard
          icon={<ShieldAlert className="h-5 w-5" />}
          label="Intentos fallidos"
          value={fallos.toLocaleString("es-CR")}
          tone="rose"
        />
      </div>

      <form
        method="get"
        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[200px] flex-1">
            <span className="mb-1 block text-[11px] font-medium text-slate-500">Buscar</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="Correo, accion, detalle o IP"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </label>
          <label className="min-w-[170px]">
            <span className="mb-1 block text-[11px] font-medium text-slate-500">Accion</span>
            <select
              name="accion"
              defaultValue={accion}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="">Todas</option>
              {acciones.map((a) => (
                <option key={a.accion} value={a.accion}>
                  {a.accion} ({a._count._all})
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[140px]">
            <span className="mb-1 block text-[11px] font-medium text-slate-500">Resultado</span>
            <select
              name="resultado"
              defaultValue={resultado}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="">Todos</option>
              <option value="ok">Exitoso</option>
              <option value="fail">Fallido</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-medium text-slate-500">Desde</span>
            <input
              type="date"
              name="desde"
              defaultValue={desde}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-medium text-slate-500">Hasta</span>
            <input
              type="date"
              name="hasta"
              defaultValue={hasta}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            <Filter className="h-3.5 w-3.5" />
            Filtrar
          </button>
          <Link
            href="/auditoria"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Limpiar
          </Link>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">
            {total.toLocaleString("es-CR")} evento(s) encontrado(s)
          </h2>
          <span className="text-[11px] text-slate-400">
            Pagina {page} de {totalPages} · {PAGE_SIZE} por pagina
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Usuario</th>
                <th>Accion</th>
                <th>Detalle</th>
                <th>IP</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {eventos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                    No hay eventos que coincidan con los filtros.
                  </td>
                </tr>
              )}
              {eventos.map((evento) => (
                <tr key={evento.id}>
                  <td className="whitespace-nowrap text-[11px] text-slate-500">
                    {formatDateTime(evento.createdAt)}
                  </td>
                  <td>
                    <p className="text-xs font-semibold text-slate-700">
                      {evento.usuario?.nombre ?? evento.email ?? "Anonimo"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {evento.usuario?.rol ?? evento.email ?? "—"}
                    </p>
                  </td>
                  <td>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${actionTone(
                        evento.accion
                      )}`}
                    >
                      {evento.accion}
                    </span>
                  </td>
                  <td className="max-w-xs">
                    <p className="truncate text-[11px] text-slate-600" title={evento.detalle ?? ""}>
                      {evento.detalle ?? "—"}
                    </p>
                  </td>
                  <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">
                    {evento.ip ?? "—"}
                  </td>
                  <td>
                    {evento.exito ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Exitoso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                        <XCircle className="h-3 w-3" />
                        Fallido
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              page <= 1
                ? "pointer-events-none border-slate-100 text-slate-300"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Anterior
          </Link>
          <span className="text-[11px] text-slate-400">
            Mostrando {eventos.length} de {total.toLocaleString("es-CR")}
          </span>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              page >= totalPages
                ? "pointer-events-none border-slate-100 text-slate-300"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Siguiente
          </Link>
        </div>
      </div>
    </div>
  );
}

function actionTone(accion: string): string {
  if (accion.includes("login") || accion.includes("sesion"))
    return "bg-sky-50 text-sky-700";
  if (accion.includes("mfa") || accion.includes("webauthn"))
    return "bg-violet-50 text-violet-700";
  if (accion.includes("usuario") || accion.includes("password"))
    return "bg-amber-50 text-amber-700";
  if (accion.includes("consulta")) return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "brand" | "emerald" | "rose";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  } as const;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-xl font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
