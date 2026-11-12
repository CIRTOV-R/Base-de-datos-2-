import { authenticator } from "otplib";
import { sha256Hex } from "@/lib/security";

authenticator.options = { window: 1 };

export const TOTP_ISSUER = "EcoMarket Vital";

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function totpUri(email: string, secret: string): string {
  return authenticator.keyuri(email, TOTP_ISSUER, secret);
}

export function verifyTotp(secret: string, token: string): boolean {
  const clean = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  try {
    return authenticator.verify({ token: clean, secret });
  } catch {
    return false;
  }
}

export function generateRecoveryCodes(count = 8): string[] {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let code = "";
    for (let j = 0; j < 10; j++) {
      if (j === 5) code += "-";
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    codes.push(code);
  }
  return codes;
}

export function hashRecoveryCodes(codes: string[]): string[] {
  return codes.map((c) => sha256Hex(c.trim().toUpperCase()));
}

export function consumeRecoveryCode(
  hashedCodes: string[],
  code: string
): { ok: boolean; remaining: string[] } {
  const hash = sha256Hex(code.trim().toUpperCase());
  const index = hashedCodes.indexOf(hash);
  if (index === -1) return { ok: false, remaining: hashedCodes };
  return { ok: true, remaining: hashedCodes.filter((_, i) => i !== index) };
}
