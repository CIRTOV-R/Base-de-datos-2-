import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "eco_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const MFA_PENDING_TTL_MS = 10 * 60 * 1000;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const ATTEMPT_WINDOW_MINUTES = 15;

export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function constantEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function hmac(value: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET || "dev-secret").update(value).digest("base64url");
}

export function signValue(value: string): string {
  const payload = Buffer.from(value).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export function verifySignedValue(signed: string): string | null {
  const [payload, signature] = signed.split(".");
  if (!payload || !signature) return null;
  if (!constantEqual(signature, hmac(payload))) return null;
  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

export function getUserAgent(req: Request): string {
  return (req.headers.get("user-agent") || "desconocido").slice(0, 255);
}

export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const allowed = new Set<string>([appUrl()]);
  try {
    allowed.add(new URL(req.url).origin);
  } catch {
    /* ignore */
  }
  return allowed.has(origin);
}

export function isJsonRequest(req: Request): boolean {
  return (req.headers.get("content-type") || "").includes("application/json");
}

export function passwordPolicyErrors(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 10) errors.push("Debe tener al menos 10 caracteres.");
  if (!/[A-Z]/.test(password)) errors.push("Debe incluir una letra mayuscula.");
  if (!/[a-z]/.test(password)) errors.push("Debe incluir una letra minuscula.");
  if (!/[0-9]/.test(password)) errors.push("Debe incluir un numero.");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Debe incluir un caracter especial.");
  return errors;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
