import { Rol } from "@prisma/client";

export type Permission =
  | "dashboard.view"
  | "consulta.inventario"
  | "consulta.pagos"
  | "consulta.facturacion"
  | "consulta.sucursal"
  | "consulta.empleados"
  | "consulta.transacciones"
  | "consulta.ranking"
  | "consulta.compra-cruzada"
  | "consulta.auditoria-mensual"
  | "consulta.super-compradores"
  | "usuarios.manage"
  | "auditoria.view"
  | "reportes.export";

export const ROLE_LABELS: Record<Rol, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  ANALISTA: "Analista de datos",
  VENDEDOR: "Vendedor",
  AUDITOR: "Auditor",
};

export const ROLE_DESCRIPTIONS: Record<Rol, string> = {
  ADMIN: "Acceso total, gestion de usuarios y configuracion de seguridad.",
  GERENTE: "Consultas del negocio y auditoria. Sin gestion de usuarios.",
  ANALISTA: "Consultas analiticas y exportacion de reportes.",
  VENDEDOR: "Panel y transacciones recientes de su operacion.",
  AUDITOR: "Solo lectura de consultas y bitacora de auditoria.",
};

const TODOS: Rol[] = [Rol.ADMIN, Rol.GERENTE, Rol.ANALISTA, Rol.VENDEDOR, Rol.AUDITOR];
const ANALITICOS: Rol[] = [Rol.ADMIN, Rol.GERENTE, Rol.ANALISTA, Rol.AUDITOR];

export const PERMISSIONS: Record<Permission, Rol[]> = {
  "dashboard.view": TODOS,
  "consulta.inventario": ANALITICOS,
  "consulta.pagos": ANALITICOS,
  "consulta.facturacion": ANALITICOS,
  "consulta.sucursal": ANALITICOS,
  "consulta.empleados": [Rol.ADMIN, Rol.GERENTE, Rol.AUDITOR],
  "consulta.transacciones": TODOS,
  "consulta.ranking": [Rol.ADMIN, Rol.GERENTE, Rol.AUDITOR],
  "consulta.compra-cruzada": ANALITICOS,
  "consulta.auditoria-mensual": ANALITICOS,
  "consulta.super-compradores": ANALITICOS,
  "usuarios.manage": [Rol.ADMIN],
  "auditoria.view": [Rol.ADMIN, Rol.GERENTE, Rol.AUDITOR],
  "reportes.export": [Rol.ADMIN, Rol.GERENTE, Rol.ANALISTA],
};

export function can(rol: Rol | string, permission: Permission): boolean {
  return PERMISSIONS[permission]?.includes(rol as Rol) ?? false;
}

export const QUERY_IDS = [
  "inventario-bajo",
  "ventas-metodo-pago",
  "facturacion-cliente",
  "ventas-sucursal",
  "empleados-sucursal",
  "transacciones-recientes",
  "ranking-empleados",
  "compra-cruzada",
  "auditoria-mensual",
  "super-compradores",
] as const;

export type QueryId = (typeof QUERY_IDS)[number];

export type QueryDefinition = {
  id: QueryId;
  numero: number;
  titulo: string;
  descripcion: string;
  categoria: "Intermedia" | "Avanzada";
  permiso: Permission;
  tecnica: string;
};

export const QUERY_CATALOG: QueryDefinition[] = [
  {
    id: "inventario-bajo",
    numero: 1,
    titulo: "Inventario bajo",
    descripcion: "Productos con stock inferior al promedio general del mercado.",
    categoria: "Intermedia",
    permiso: "consulta.inventario",
    tecnica: "Subconsulta escalar + agregacion AVG",
  },
  {
    id: "ventas-metodo-pago",
    numero: 2,
    titulo: "Ventas por metodo de pago",
    descripcion: "Cantidad de transacciones y monto recaudado por cada metodo de pago.",
    categoria: "Intermedia",
    permiso: "consulta.pagos",
    tecnica: "GROUP BY + COUNT + SUM",
  },
  {
    id: "facturacion-cliente",
    numero: 3,
    titulo: "Facturacion por cliente",
    descripcion: "Total historico gastado por cada cliente y cantidad de compras.",
    categoria: "Intermedia",
    permiso: "consulta.facturacion",
    tecnica: "INNER JOIN (clientes, ventas, detalle_ventas)",
  },
  {
    id: "ventas-sucursal",
    numero: 4,
    titulo: "Ventas por sucursal",
    descripcion: "Unidades vendidas y facturacion por sucursal y ciudad.",
    categoria: "Intermedia",
    permiso: "consulta.sucursal",
    tecnica: "INNER JOIN (sucursales, ventas, detalle_ventas)",
  },
  {
    id: "empleados-sucursal",
    numero: 5,
    titulo: "Empleados y sus sucursales",
    descripcion: "Empleados con departamento, salario y sucursal asignada.",
    categoria: "Intermedia",
    permiso: "consulta.empleados",
    tecnica: "INNER JOIN (empleados, sucursales)",
  },
  {
    id: "transacciones-recientes",
    numero: 6,
    titulo: "Detalle de transacciones recientes",
    descripcion: "Ultimas lineas de venta con producto, cantidad y cliente.",
    categoria: "Intermedia",
    permiso: "consulta.transacciones",
    tecnica: "INNER JOIN (ventas, detalle_ventas, productos)",
  },
  {
    id: "ranking-empleados",
    numero: 7,
    titulo: "Ranking de empleados por departamento",
    descripcion: "Posicion salarial de cada empleado dentro de su departamento.",
    categoria: "Avanzada",
    permiso: "consulta.ranking",
    tecnica: "Funcion de ventana RANK() OVER (PARTITION BY)",
  },
  {
    id: "compra-cruzada",
    numero: 8,
    titulo: "Clientes con compra cruzada",
    descripcion: "Clientes que compraron Cosmetica pero nunca Alimentos.",
    categoria: "Avanzada",
    permiso: "consulta.compra-cruzada",
    tecnica: "Subconsultas correlacionadas EXISTS / NOT EXISTS",
  },
  {
    id: "auditoria-mensual",
    numero: 9,
    titulo: "Auditoria mensual de crecimiento",
    descripcion: "Ventas mes a mes y variacion porcentual contra el mes anterior.",
    categoria: "Avanzada",
    permiso: "consulta.auditoria-mensual",
    tecnica: "CTE + LAG() OVER (ORDER BY)",
  },
  {
    id: "super-compradores",
    numero: 10,
    titulo: "Super compradores",
    descripcion: "Clientes cuyo gasto supera el gasto promedio de todos los clientes.",
    categoria: "Avanzada",
    permiso: "consulta.super-compradores",
    tecnica: "HAVING + subconsulta de promedio",
  },
];

export function getQueryDefinition(id: string): QueryDefinition | undefined {
  return QUERY_CATALOG.find((q) => q.id === id);
}

export function canRunQuery(rol: Rol | string, id: string): boolean {
  const def = getQueryDefinition(id);
  return def ? can(rol, def.permiso) : false;
}
