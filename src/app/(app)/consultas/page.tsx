import { redirect } from "next/navigation";
import { QUERY_CATALOG, can } from "@/lib/permissions";
import { requireSession } from "@/lib/session";
import QueriesExplorer from "./queries-explorer";

export default async function ConsultasPage() {
  const sesion = await requireSession();

  const definitions = QUERY_CATALOG.filter((q) => can(sesion.usuario.rol, q.permiso)).map((q) => ({
    id: q.id,
    numero: q.numero,
    titulo: q.titulo,
    descripcion: q.descripcion,
    categoria: q.categoria,
    tecnica: q.tecnica,
  }));

  if (definitions.length === 0) redirect("/dashboard?denied=1");

  return (
    <QueriesExplorer
      definitions={definitions}
      canExport={can(sesion.usuario.rol, "reportes.export")}
      rol={sesion.usuario.rol}
    />
  );
}
