"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronRight,
  Clock,
  Code2,
  Copy,
  Database,
  Download,
  Filter,
  Loader2,
  Play,
  Search,
  ShieldCheck,
  Table2,
} from "lucide-react";
import { downloadCsv, formatCurrency, formatDateTime, formatNumber } from "@/lib/format";

type Definition = {
  id: string;
  numero: number;
  titulo: string;
  descripcion: string;
  categoria: "Intermedia" | "Avanzada";
  tecnica: string;
};

type Row = Record<string, string | number | boolean | null>;

type QueryResult = {
  id: string;
  titulo: string;
  sql: string;
  rows: Row[];
  count: number;
  durationMs: number;
  generatedAt: string;
};

type Filters = {
  limit: number;
  q: string;
  categoriaA: string;
  categoriaB: string;
  departamento: string;
  dias: number;
};

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  nombre: "Nombre",
  categoria: "Categoria",
  stock: "Stock",
  stockMinimo: "Stock minimo",
  precio: "Precio",
  promedioStock: "Promedio stock",
  metodoPago: "Metodo de pago",
  transacciones: "Transacciones",
  monto: "Monto",
  email: "Correo",
  compras: "Compras",
  totalGastado: "Total gastado",
  sucursal: "Sucursal",
  ciudad: "Ciudad",
  productosVendidos: "Productos vendidos",
  facturacion: "Facturacion",
  departamento: "Departamento",
  cargo: "Cargo",
  salario: "Salario",
  ventaId: "Venta",
  fecha: "Fecha",
  cliente: "Cliente",
  producto: "Producto",
  cantidad: "Cantidad",
  precioUnitario: "Precio unitario",
  rank: "Rank",
  periodo: "Periodo",
  total: "Total",
  ventas: "Ventas",
  anterior: "Mes anterior",
  crecimientoPct: "Crecimiento",
  gastoTotal: "Gasto total",
};

const CURRENCY_KEYS = new Set([
  "precio",
  "monto",
  "totalGastado",
  "facturacion",
  "salario",
  "ingresos",
  "gastoTotal",
  "precioUnitario",
  "total",
  "anterior",
]);

const NUMBER_KEYS = new Set([
  "stock",
  "stockMinimo",
  "cantidad",
  "compras",
  "transacciones",
  "ventas",
  "productosVendidos",
  "promedioStock",
  "rank",
]);

const DEPARTAMENTOS = [
  "Administracion",
  "Recursos Humanos",
  "Ventas",
  "Caja",
  "Bodega",
  "Marketing",
];

const CATEGORIAS = ["Alimentos", "Cosmética", "Bebidas", "Suplementos", "Limpieza", "Hogar"];

const DEPARTAMENTOS_DB = [
  "Administración",
  "Recursos Humanos",
  "Ventas",
  "Caja",
  "Bodega",
  "Marketing",
];

function defaultsFor(id: string): Filters {
  return {
    limit: id === "transacciones-recientes" ? 50 : 100,
    q: "",
    categoriaA: "Cosmética",
    categoriaB: "Alimentos",
    departamento: "",
    dias: 30,
  };
}

function hasLimit(id: string) {
  return ["inventario-bajo", "facturacion-cliente", "transacciones-recientes"].includes(id);
}

function hasDepartamento(id: string) {
  return ["empleados-sucursal", "ranking-empleados"].includes(id);
}

export default function QueriesExplorer({
  definitions,
  canExport,
  rol,
}: {
  definitions: Definition[];
  canExport: boolean;
  rol: string;
}) {
  const [selectedId, setSelectedId] = useState(definitions[0]?.id ?? "");
  const [filters, setFilters] = useState<Filters>(defaultsFor(selectedId));
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = definitions.find((d) => d.id === selectedId);

  const run = useCallback(async (id: string, f: Filters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/queries/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo ejecutar la consulta.");
        setResult(null);
        return;
      }
      setResult(data);
    } catch {
      setError("Error de conexion al ejecutar la consulta.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const initial = defaultsFor(selectedId);
    setFilters(initial);
    setResult(null);
    setShowSql(false);
    void run(selectedId, initial);
  }, [selectedId, run]);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    void run(selectedId, filters);
  }

  async function copySql() {
    if (!result?.sql) return;
    try {
      await navigator.clipboard.writeText(result.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const intermedia = definitions.filter((d) => d.categoria === "Intermedia");
  const avanzada = definitions.filter((d) => d.categoria === "Avanzada");

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-600">
            Analitica SQL
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Consultas del negocio</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Explora las consultas implementadas con INNER JOIN, subconsultas correlacionadas, CTE,
            funciones de ventana y agregaciones avanzadas.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-800">
          <ShieldCheck className="h-4 w-4" />
          Rol {rol}: acceso filtrado por PoLP
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Catalogo ({definitions.length})
            </p>
            <Database className="h-4 w-4 text-slate-300" />
          </div>

          <QueryGroup
            title="Intermedias"
            items={intermedia}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <QueryGroup
            title="Avanzadas"
            items={avanzada}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>

        <section className="space-y-4">
          {selected && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                      {selected.numero}
                    </span>
                    <h2 className="text-lg font-semibold text-slate-900">{selected.titulo}</h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        selected.categoria === "Avanzada"
                          ? "bg-violet-50 text-violet-700"
                          : "bg-sky-50 text-sky-700"
                      }`}
                    >
                      {selected.categoria}
                    </span>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm text-slate-500">{selected.descripcion}</p>
                  <p className="mt-1 text-xs text-slate-400">Tecnica: {selected.tecnica}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSql((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    {showSql ? "Ocultar SQL" : "Ver SQL"}
                  </button>
                  {canExport && result && result.rows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => downloadCsv(`${selected.id}.csv`, result.rows)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 hover:bg-brand-100"
                    >
                      <Download className="h-3.5 w-3.5" />
                      CSV
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-end gap-3">
                {selected.id === "facturacion-cliente" && (
                  <label className="min-w-[220px] flex-1">
                    <span className="mb-1 block text-[11px] font-medium text-slate-500">
                      Buscar cliente o correo
                    </span>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        value={filters.q}
                        onChange={(e) => update("q", e.target.value)}
                        placeholder="Ej. Maria o maria@..."
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                      />
                    </div>
                  </label>
                )}

                {hasDepartamento(selected.id) && (
                  <label>
                    <span className="mb-1 block text-[11px] font-medium text-slate-500">
                      Departamento
                    </span>
                    <select
                      value={filters.departamento}
                      onChange={(e) => update("departamento", e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                    >
                      <option value="">Todos</option>
                      {DEPARTAMENTOS_DB.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {selected.id === "compra-cruzada" && (
                  <>
                    <label>
                      <span className="mb-1 block text-[11px] font-medium text-slate-500">
                        Compro categoria
                      </span>
                      <select
                        value={filters.categoriaA}
                        onChange={(e) => update("categoriaA", e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                      >
                        {CATEGORIAS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-medium text-slate-500">
                        Nunca compro
                      </span>
                      <select
                        value={filters.categoriaB}
                        onChange={(e) => update("categoriaB", e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                      >
                        {CATEGORIAS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                {selected.id === "transacciones-recientes" && (
                  <label>
                    <span className="mb-1 block text-[11px] font-medium text-slate-500">
                      Ultimos dias
                    </span>
                    <select
                      value={filters.dias}
                      onChange={(e) => update("dias", Number(e.target.value))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                    >
                      {[7, 15, 30, 60, 90, 180, 365].map((d) => (
                        <option key={d} value={d}>
                          {d} dias
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {hasLimit(selected.id) && (
                  <label>
                    <span className="mb-1 block text-[11px] font-medium text-slate-500">
                      Limite de filas
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={filters.limit}
                      onChange={(e) => update("limit", Number(e.target.value))}
                      className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                    />
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Ejecutar
                </button>
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Filter className="h-3 w-3" />
                  Filtros aplicados del lado del servidor
                </span>
              </form>

              {showSql && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      SQL ejecutado
                    </span>
                    <button
                      type="button"
                      onClick={copySql}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
                    >
                      <Copy className="h-3 w-3" />
                      {copied ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                  <pre className="max-h-72 overflow-auto p-4 text-[12px] leading-relaxed text-emerald-200">
                    <code>{result?.sql || "Ejecuta la consulta para ver el SQL."}</code>
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Table2 className="h-4 w-4 text-brand-600" />
                Resultados
                {result && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    {formatNumber(result.count)} filas
                  </span>
                )}
              </div>
              {result && (
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {result.durationMs} ms
                  </span>
                  <span>{formatDateTime(result.generatedAt)}</span>
                </div>
              )}
            </div>

            <div className="max-h-[560px] overflow-auto">
              {error && (
                <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {!error && loading && (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ejecutando consulta...
                </div>
              )}

              {!error && !loading && result && result.rows.length === 0 && (
                <div className="py-16 text-center text-sm text-slate-400">
                  La consulta no devolvio filas con los filtros seleccionados.
                </div>
              )}

              {!error && !loading && result && result.rows.length > 0 && (
                <table className="data-table">
                  <thead>
                    <tr>
                      {Object.keys(result.rows[0]).map((key) => (
                        <th key={key}>{COLUMN_LABELS[key] ?? key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, index) => (
                      <tr key={index}>
                        {Object.entries(row).map(([key, value]) => (
                          <td key={key}>{renderCell(key, value)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {!error && !loading && !result && (
                <div className="py-16 text-center text-sm text-slate-400">
                  Selecciona una consulta y presiona Ejecutar.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function QueryGroup({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  items: Definition[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => {
          const active = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition ${
                active ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-slate-50"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                  active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {item.numero}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-xs font-semibold ${
                    active ? "text-brand-800" : "text-slate-700"
                  }`}
                >
                  {item.titulo}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                  {item.tecnica}
                </span>
              </span>
              <ChevronRight
                className={`mt-1 h-3.5 w-3.5 shrink-0 ${
                  active ? "text-brand-500" : "text-slate-300"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function renderCell(key: string, value: Row[string]) {
  if (value === null || value === undefined) {
    return <span className="text-slate-300">—</span>;
  }

  if (key === "crecimientoPct") {
    const n = Number(value);
    const positive = n >= 0;
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
        }`}
      >
        {positive ? "+" : ""}
        {n.toFixed(2)}%
      </span>
    );
  }

  if (key === "rank") {
    const n = Number(value);
    return (
      <span
        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
          n === 1
            ? "bg-amber-100 text-amber-700"
            : n === 2
              ? "bg-slate-200 text-slate-700"
              : n === 3
                ? "bg-orange-100 text-orange-700"
                : "bg-slate-100 text-slate-500"
        }`}
      >
        {n}
      </span>
    );
  }

  if (key === "fecha") {
    return <span className="text-xs text-slate-500">{formatDateTime(value)}</span>;
  }

  if (CURRENCY_KEYS.has(key)) {
    return <span className="font-medium text-slate-800">{formatCurrency(value)}</span>;
  }

  if (NUMBER_KEYS.has(key)) {
    return <span className="tabular-nums">{formatNumber(value)}</span>;
  }

  if (key === "id" || key === "ventaId") {
    return <span className="font-mono text-xs text-slate-500">#{String(value).padStart(5, "0")}</span>;
  }

  if (key === "metodoPago" || key === "categoria") {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
        {String(value)}
      </span>
    );
  }

  return <span>{String(value)}</span>;
}
