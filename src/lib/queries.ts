import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getQueryDefinition } from "@/lib/permissions";

export type QueryFilters = {
  limit?: number;
  q?: string;
  categoriaA?: string;
  categoriaB?: string;
  departamento?: string;
  dias?: number;
};

export type SerializedRow = Record<string, string | number | boolean | null>;

export type QueryExecution = {
  id: string;
  titulo: string;
  sql: string;
  rows: SerializedRow[];
  count: number;
  durationMs: number;
  generatedAt: string;
};

function serializeValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Prisma.Decimal) return Number(value);
  if (Buffer.isBuffer(value)) return value.toString("base64");
  if (Array.isArray(value)) return value.map(serializeValue).join(", ");
  if (typeof value === "object") {
    const maybeDecimal = value as { toNumber?: () => number };
    if (typeof maybeDecimal.toNumber === "function") return maybeDecimal.toNumber();
    return JSON.stringify(value);
  }
  return String(value);
}

function serializeRows(rows: Record<string, unknown>[]): SerializedRow[] {
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, serializeValue(value)]))
  );
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

const SQL_PREVIEWS: Record<string, string> = {
  "inventario-bajo": `SELECT p.id, p.nombre, p.categoria, p.stock, p.stock_minimo, p.precio,
       (SELECT ROUND(AVG(stock), 1) FROM productos) AS "promedioStock"
FROM productos p
WHERE p.stock < (SELECT AVG(stock) FROM productos)
ORDER BY p.stock ASC, p.nombre
LIMIT $1;`,
  "ventas-metodo-pago": `SELECT metodo_pago AS "metodoPago",
       COUNT(*)::int AS transacciones,
       SUM(total) AS monto
FROM ventas
GROUP BY metodo_pago
ORDER BY transacciones DESC;`,
  "facturacion-cliente": `SELECT c.id, c.nombre, c.email,
       COUNT(DISTINCT v.id)::int AS compras,
       COALESCE(SUM(dv.cantidad * dv.precio_unitario - dv.descuento), 0) AS "totalGastado"
FROM clientes c
INNER JOIN ventas v ON v.cliente_id = c.id
INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
WHERE ($1 = '' OR c.nombre ILIKE $1 OR c.email ILIKE $1)
GROUP BY c.id, c.nombre, c.email
ORDER BY "totalGastado" DESC
LIMIT $2;`,
  "ventas-sucursal": `SELECT s.nombre AS sucursal, s.ciudad,
       COALESCE(SUM(dv.cantidad), 0)::int AS "productosVendidos",
       COUNT(DISTINCT v.id)::int AS transacciones,
       COALESCE(SUM(v.total), 0) AS facturacion
FROM sucursales s
INNER JOIN ventas v ON v.sucursal_id = s.id
INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
GROUP BY s.id, s.nombre, s.ciudad
ORDER BY "productosVendidos" DESC;`,
  "empleados-sucursal": `SELECT e.nombre, e.departamento, e.cargo, e.salario,
       s.nombre AS sucursal, s.ciudad
FROM empleados e
INNER JOIN sucursales s ON s.id = e.sucursal_id
WHERE ($1 = '' OR e.departamento = $1)
ORDER BY s.nombre, e.salario DESC;`,
  "transacciones-recientes": `SELECT v.id AS "ventaId", v.fecha, c.nombre AS cliente,
       p.nombre AS producto, dv.cantidad, dv.precio_unitario AS "precioUnitario",
       v.metodo_pago AS "metodoPago"
FROM ventas v
INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
INNER JOIN productos p ON p.id = dv.producto_id
INNER JOIN clientes c ON c.id = v.cliente_id
WHERE v.fecha >= $1
ORDER BY v.fecha DESC, v.id DESC
LIMIT $2;`,
  "ranking-empleados": `SELECT nombre, departamento, salario,
       RANK() OVER (PARTITION BY departamento ORDER BY salario DESC)::int AS rank
FROM empleados
WHERE ($1 = '' OR departamento = $1)
ORDER BY departamento, rank, nombre;`,
  "compra-cruzada": `SELECT c.id, c.nombre, c.email, c.ciudad
FROM clientes c
WHERE EXISTS (
  SELECT 1 FROM ventas v
  INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
  INNER JOIN productos p ON p.id = dv.producto_id
  WHERE v.cliente_id = c.id AND p.categoria = $1
)
AND NOT EXISTS (
  SELECT 1 FROM ventas v
  INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
  INNER JOIN productos p ON p.id = dv.producto_id
  WHERE v.cliente_id = c.id AND p.categoria = $2
)
ORDER BY c.nombre;`,
  "auditoria-mensual": `WITH mensual AS (
  SELECT date_trunc('month', fecha)::date AS mes,
         SUM(total) AS total,
         COUNT(*)::int AS ventas
  FROM ventas
  GROUP BY 1
),
crecimiento AS (
  SELECT mes, total, ventas,
         LAG(total) OVER (ORDER BY mes) AS anterior
  FROM mensual
)
SELECT to_char(mes, 'YYYY-MM') AS periodo, total, ventas, anterior,
       CASE WHEN anterior IS NULL OR anterior = 0 THEN NULL
            ELSE ROUND(((total - anterior) / anterior * 100)::numeric, 2)
       END AS "crecimientoPct"
FROM crecimiento
ORDER BY mes;`,
  "super-compradores": `SELECT c.id, c.nombre, c.email,
       SUM(dv.cantidad * dv.precio_unitario - dv.descuento) AS "gastoTotal",
       COUNT(DISTINCT v.id)::int AS compras
FROM clientes c
INNER JOIN ventas v ON v.cliente_id = c.id
INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
GROUP BY c.id, c.nombre, c.email
HAVING SUM(dv.cantidad * dv.precio_unitario - dv.descuento) > (
  SELECT AVG(gasto) FROM (
    SELECT SUM(dv2.cantidad * dv2.precio_unitario - dv2.descuento) AS gasto
    FROM clientes c2
    INNER JOIN ventas v2 ON v2.cliente_id = c2.id
    INNER JOIN detalle_ventas dv2 ON dv2.venta_id = v2.id
    GROUP BY c2.id
  ) sub
)
ORDER BY "gastoTotal" DESC;`,
};

async function execute(id: string, filters: QueryFilters): Promise<Record<string, unknown>[]> {
  const limit = clamp(filters.limit, 1, 500, 100);

  switch (id) {
    case "inventario-bajo":
      return prisma.$queryRaw(Prisma.sql`
        SELECT p.id, p.nombre, p.categoria, p.stock,
               p.stock_minimo AS "stockMinimo", p.precio,
               (SELECT ROUND(AVG(stock), 1) FROM productos) AS "promedioStock"
        FROM productos p
        WHERE p.stock < (SELECT AVG(stock) FROM productos)
        ORDER BY p.stock ASC, p.nombre
        LIMIT ${limit}
      `);

    case "ventas-metodo-pago":
      return prisma.$queryRaw(Prisma.sql`
        SELECT metodo_pago AS "metodoPago",
               COUNT(*)::int AS transacciones,
               SUM(total) AS monto
        FROM ventas
        GROUP BY metodo_pago
        ORDER BY transacciones DESC
      `);

    case "facturacion-cliente": {
      const search = `%${(filters.q ?? "").trim()}%`;
      return prisma.$queryRaw(Prisma.sql`
        SELECT c.id, c.nombre, c.email,
               COUNT(DISTINCT v.id)::int AS compras,
               COALESCE(SUM(dv.cantidad * dv.precio_unitario - dv.descuento), 0) AS "totalGastado"
        FROM clientes c
        INNER JOIN ventas v ON v.cliente_id = c.id
        INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
        WHERE (${search} = '%%' OR c.nombre ILIKE ${search} OR c.email ILIKE ${search})
        GROUP BY c.id, c.nombre, c.email
        ORDER BY "totalGastado" DESC
        LIMIT ${limit}
      `);
    }

    case "ventas-sucursal":
      return prisma.$queryRaw(Prisma.sql`
        SELECT s.nombre AS sucursal, s.ciudad,
               COALESCE(SUM(dv.cantidad), 0)::int AS "productosVendidos",
               COUNT(DISTINCT v.id)::int AS transacciones,
               COALESCE(SUM(v.total), 0) AS facturacion
        FROM sucursales s
        INNER JOIN ventas v ON v.sucursal_id = s.id
        INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
        GROUP BY s.id, s.nombre, s.ciudad
        ORDER BY "productosVendidos" DESC
      `);

    case "empleados-sucursal": {
      const departamento = (filters.departamento ?? "").trim();
      return prisma.$queryRaw(Prisma.sql`
        SELECT e.nombre, e.departamento, e.cargo, e.salario,
               s.nombre AS sucursal, s.ciudad
        FROM empleados e
        INNER JOIN sucursales s ON s.id = e.sucursal_id
        WHERE (${departamento} = '' OR e.departamento = ${departamento})
        ORDER BY s.nombre, e.salario DESC
      `);
    }

    case "transacciones-recientes": {
      const dias = clamp(filters.dias, 1, 365, 30);
      const since = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
      return prisma.$queryRaw(Prisma.sql`
        SELECT v.id AS "ventaId", v.fecha, c.nombre AS cliente,
               p.nombre AS producto, dv.cantidad,
               dv.precio_unitario AS "precioUnitario",
               v.metodo_pago AS "metodoPago"
        FROM ventas v
        INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
        INNER JOIN productos p ON p.id = dv.producto_id
        INNER JOIN clientes c ON c.id = v.cliente_id
        WHERE v.fecha >= ${since}
        ORDER BY v.fecha DESC, v.id DESC
        LIMIT ${limit}
      `);
    }

    case "ranking-empleados": {
      const departamento = (filters.departamento ?? "").trim();
      return prisma.$queryRaw(Prisma.sql`
        SELECT nombre, departamento, salario,
               RANK() OVER (PARTITION BY departamento ORDER BY salario DESC)::int AS rank
        FROM empleados
        WHERE (${departamento} = '' OR departamento = ${departamento})
        ORDER BY departamento, rank, nombre
      `);
    }

    case "compra-cruzada": {
      const categoriaA = (filters.categoriaA ?? "Cosmética").trim() || "Cosmética";
      const categoriaB = (filters.categoriaB ?? "Alimentos").trim() || "Alimentos";
      return prisma.$queryRaw(Prisma.sql`
        SELECT c.id, c.nombre, c.email, c.ciudad
        FROM clientes c
        WHERE EXISTS (
          SELECT 1 FROM ventas v
          INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
          INNER JOIN productos p ON p.id = dv.producto_id
          WHERE v.cliente_id = c.id AND p.categoria = ${categoriaA}
        )
        AND NOT EXISTS (
          SELECT 1 FROM ventas v
          INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
          INNER JOIN productos p ON p.id = dv.producto_id
          WHERE v.cliente_id = c.id AND p.categoria = ${categoriaB}
        )
        ORDER BY c.nombre
      `);
    }

    case "auditoria-mensual":
      return prisma.$queryRaw(Prisma.sql`
        WITH mensual AS (
          SELECT date_trunc('month', fecha)::date AS mes,
                 SUM(total) AS total,
                 COUNT(*)::int AS ventas
          FROM ventas
          GROUP BY 1
        ),
        crecimiento AS (
          SELECT mes, total, ventas,
                 LAG(total) OVER (ORDER BY mes) AS anterior
          FROM mensual
        )
        SELECT to_char(mes, 'YYYY-MM') AS periodo, total, ventas, anterior,
               CASE WHEN anterior IS NULL OR anterior = 0 THEN NULL
                    ELSE ROUND(((total - anterior) / anterior * 100)::numeric, 2)
               END AS "crecimientoPct"
        FROM crecimiento
        ORDER BY mes
      `);

    case "super-compradores":
      return prisma.$queryRaw(Prisma.sql`
        SELECT c.id, c.nombre, c.email,
               SUM(dv.cantidad * dv.precio_unitario - dv.descuento) AS "gastoTotal",
               COUNT(DISTINCT v.id)::int AS compras
        FROM clientes c
        INNER JOIN ventas v ON v.cliente_id = c.id
        INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
        GROUP BY c.id, c.nombre, c.email
        HAVING SUM(dv.cantidad * dv.precio_unitario - dv.descuento) > (
          SELECT AVG(gasto) FROM (
            SELECT SUM(dv2.cantidad * dv2.precio_unitario - dv2.descuento) AS gasto
            FROM clientes c2
            INNER JOIN ventas v2 ON v2.cliente_id = c2.id
            INNER JOIN detalle_ventas dv2 ON dv2.venta_id = v2.id
            GROUP BY c2.id
          ) sub
        )
        ORDER BY "gastoTotal" DESC
      `);

    default:
      throw new Error(`Consulta desconocida: ${id}`);
  }
}

export async function runQuery(id: string, filters: QueryFilters = {}): Promise<QueryExecution> {
  const definition = getQueryDefinition(id);
  if (!definition) throw new Error("Consulta no encontrada");

  const started = performance.now();
  const rows = await execute(id, filters);
  const durationMs = Math.round((performance.now() - started) * 100) / 100;

  return {
    id,
    titulo: definition.titulo,
    sql: SQL_PREVIEWS[id],
    rows: serializeRows(rows),
    count: rows.length,
    durationMs,
    generatedAt: new Date().toISOString(),
  };
}

export type DashboardData = {
  kpis: {
    ventas: number;
    facturacion: number;
    clientes: number;
    productos: number;
    stockBajo: number;
    ticketPromedio: number;
    ventasHoy: number;
    empleados: number;
  };
  ventasPorMes: SerializedRow[];
  topProductos: SerializedRow[];
  categorias: SerializedRow[];
  metodosPago: SerializedRow[];
  stockCritico: SerializedRow[];
  ultimasVentas: SerializedRow[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const [kpiRows, ventasPorMes, topProductos, categorias, metodosPago, stockCritico, ultimasVentas] =
    await Promise.all([
      prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
        SELECT
          (SELECT COUNT(*)::int FROM ventas) AS ventas,
          (SELECT COALESCE(SUM(total), 0) FROM ventas) AS facturacion,
          (SELECT COUNT(*)::int FROM clientes) AS clientes,
          (SELECT COUNT(*)::int FROM productos) AS productos,
          (SELECT COUNT(*)::int FROM productos WHERE stock < stock_minimo) AS "stockBajo",
          (SELECT COALESCE(AVG(total), 0) FROM ventas) AS "ticketPromedio",
          (SELECT COUNT(*)::int FROM ventas WHERE fecha::date = CURRENT_DATE) AS "ventasHoy",
          (SELECT COUNT(*)::int FROM empleados) AS empleados
      `),
      prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
        SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS periodo,
               SUM(total) AS total,
               COUNT(*)::int AS ventas
        FROM ventas
        GROUP BY 1
        ORDER BY 1
      `),
      prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
        SELECT p.nombre,
               SUM(dv.cantidad)::int AS unidades,
               SUM(dv.cantidad * dv.precio_unitario) AS ingresos
        FROM detalle_ventas dv
        INNER JOIN productos p ON p.id = dv.producto_id
        GROUP BY p.id, p.nombre
        ORDER BY ingresos DESC
        LIMIT 6
      `),
      prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
        SELECT p.categoria, SUM(dv.cantidad * dv.precio_unitario) AS ingresos
        FROM detalle_ventas dv
        INNER JOIN productos p ON p.id = dv.producto_id
        GROUP BY p.categoria
        ORDER BY ingresos DESC
      `),
      prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
        SELECT metodo_pago AS "metodoPago",
               COUNT(*)::int AS transacciones,
               SUM(total) AS monto
        FROM ventas
        GROUP BY metodo_pago
        ORDER BY transacciones DESC
      `),
      prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
        SELECT nombre, stock, stock_minimo AS "stockMinimo"
        FROM productos
        WHERE stock < stock_minimo
        ORDER BY stock ASC
        LIMIT 6
      `),
      prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
        SELECT v.id, v.fecha, c.nombre AS cliente, s.nombre AS sucursal,
               v.metodo_pago AS "metodoPago", v.total
        FROM ventas v
        INNER JOIN clientes c ON c.id = v.cliente_id
        INNER JOIN sucursales s ON s.id = v.sucursal_id
        ORDER BY v.fecha DESC
        LIMIT 8
      `),
    ]);

  const k = serializeRows(kpiRows)[0] ?? {};
  return {
    kpis: {
      ventas: Number(k.ventas ?? 0),
      facturacion: Number(k.facturacion ?? 0),
      clientes: Number(k.clientes ?? 0),
      productos: Number(k.productos ?? 0),
      stockBajo: Number(k.stockBajo ?? 0),
      ticketPromedio: Number(k.ticketPromedio ?? 0),
      ventasHoy: Number(k.ventasHoy ?? 0),
      empleados: Number(k.empleados ?? 0),
    },
    ventasPorMes: serializeRows(ventasPorMes),
    topProductos: serializeRows(topProductos),
    categorias: serializeRows(categorias),
    metodosPago: serializeRows(metodosPago),
    stockCritico: serializeRows(stockCritico),
    ultimasVentas: serializeRows(ultimasVentas),
  };
}

export function getSqlPreview(id: string): string {
  return SQL_PREVIEWS[id] ?? "";
}
