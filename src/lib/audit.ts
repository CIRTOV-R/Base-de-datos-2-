import { prisma } from "@/lib/db";
import { getClientIp, getUserAgent } from "@/lib/security";

export type AuditInput = {
  usuarioId?: string | null;
  email?: string | null;
  accion: string;
  detalle?: string;
  req?: Request;
  exito?: boolean;
};

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditoria.create({
      data: {
        usuarioId: input.usuarioId ?? null,
        email: input.email ?? null,
        accion: input.accion,
        detalle: input.detalle?.slice(0, 500) ?? null,
        ip: input.req ? getClientIp(input.req) : null,
        userAgent: input.req ? getUserAgent(input.req) : null,
        exito: input.exito ?? true,
      },
    });
  } catch (error) {
    console.error("No se pudo registrar la auditoria", error);
  }
}
