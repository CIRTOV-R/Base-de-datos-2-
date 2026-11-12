import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canRunQuery, getQueryDefinition } from "@/lib/permissions";
import { runQuery, type QueryFilters } from "@/lib/queries";
import { isJsonRequest, isSameOrigin } from "@/lib/security";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req) || !isJsonRequest(req)) {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  const sesion = await getSession();
  if (!sesion || !sesion.mfaVerified) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const definition = getQueryDefinition(id);
  if (!definition) {
    return NextResponse.json({ error: "Consulta no encontrada." }, { status: 404 });
  }

  if (!canRunQuery(sesion.usuario.rol, id)) {
    await logAudit({
      usuarioId: sesion.usuario.id,
      email: sesion.usuario.email,
      accion: "consulta.denegada",
      detalle: `Rol ${sesion.usuario.rol} intento ejecutar ${id}.`,
      req,
      exito: false,
    });
    return NextResponse.json(
      { error: "Tu rol no tiene permiso para ejecutar esta consulta." },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const filters: QueryFilters = {
    limit: body.limit === undefined ? undefined : Number(body.limit),
    q: typeof body.q === "string" ? body.q.slice(0, 120) : undefined,
    categoriaA: typeof body.categoriaA === "string" ? body.categoriaA.slice(0, 60) : undefined,
    categoriaB: typeof body.categoriaB === "string" ? body.categoriaB.slice(0, 60) : undefined,
    departamento:
      typeof body.departamento === "string" ? body.departamento.slice(0, 60) : undefined,
    dias: body.dias === undefined ? undefined : Number(body.dias),
  };

  try {
    const result = await runQuery(id, filters);
    await logAudit({
      usuarioId: sesion.usuario.id,
      email: sesion.usuario.email,
      accion: "consulta.ejecutada",
      detalle: `${definition.titulo}: ${result.count} filas en ${result.durationMs} ms.`,
      req,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error ejecutando consulta", error);
    return NextResponse.json(
      { error: "No se pudo ejecutar la consulta. Revisa los filtros e intenta de nuevo." },
      { status: 500 }
    );
  }
}
