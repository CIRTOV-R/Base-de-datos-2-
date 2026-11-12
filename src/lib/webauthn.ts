import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/security";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function rpConfig() {
  const url = new URL(appUrl());
  return {
    rpID: url.hostname,
    origin: url.origin,
    rpName: process.env.WEBAUTHN_RP_NAME || "EcoMarket Vital",
  };
}

function parseTransports(value: string | null): AuthenticatorTransportFuture[] | undefined {
  if (!value) return undefined;
  const parts = value.split(",").filter(Boolean);
  return parts.length ? (parts as AuthenticatorTransportFuture[]) : undefined;
}

async function saveChallenge(usuarioId: string, tipo: string, challenge: string) {
  await prisma.webAuthnChallenge.deleteMany({ where: { usuarioId, tipo } });
  await prisma.webAuthnChallenge.create({
    data: {
      usuarioId,
      tipo,
      challenge,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });
}

async function consumeChallenge(usuarioId: string, tipo: string): Promise<string | null> {
  const row = await prisma.webAuthnChallenge.findFirst({
    where: { usuarioId, tipo, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  await prisma.webAuthnChallenge.delete({ where: { id: row.id } }).catch(() => undefined);
  return row.challenge;
}

export async function registrationOptionsFor(user: {
  id: string;
  email: string;
  nombre: string;
}) {
  const { rpID, rpName } = rpConfig();
  const existing = await prisma.webAuthnCredential.findMany({ where: { usuarioId: user.id } });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new Uint8Array(Buffer.from(user.id)),
    userName: user.email,
    userDisplayName: user.nombre,
    attestationType: "none",
    excludeCredentials: existing.map((cred) => ({
      id: cred.credentialId,
      transports: parseTransports(cred.transports),
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
  });

  await saveChallenge(user.id, "registration", options.challenge);
  return options;
}

export async function verifyRegistration(
  usuarioId: string,
  response: RegistrationResponseJSON,
  deviceName?: string
) {
  const { rpID, origin } = rpConfig();
  const expectedChallenge = await consumeChallenge(usuarioId, "registration");
  if (!expectedChallenge) return { verified: false as const, error: "Desafio expirado" };

  const result = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });

  if (!result.verified) return { verified: false as const, error: "Registro no verificado" };

  const { credential, credentialDeviceType, credentialBackedUp } = result.registrationInfo;

  await prisma.webAuthnCredential.create({
    data: {
      usuarioId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports?.join(",") ?? null,
      deviceType: deviceName?.slice(0, 80) || credentialDeviceType,
      backedUp: credentialBackedUp,
    },
  });

  return { verified: true as const };
}

export async function authenticationOptionsFor(usuarioId: string) {
  const { rpID } = rpConfig();
  const credentials = await prisma.webAuthnCredential.findMany({ where: { usuarioId } });
  if (credentials.length === 0) return null;

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: credentials.map((cred) => ({
      id: cred.credentialId,
      transports: parseTransports(cred.transports),
    })),
    userVerification: "preferred",
  });

  await saveChallenge(usuarioId, "authentication", options.challenge);
  return options;
}

export async function verifyAuthentication(
  usuarioId: string,
  response: AuthenticationResponseJSON
) {
  const { rpID, origin } = rpConfig();
  const expectedChallenge = await consumeChallenge(usuarioId, "authentication");
  if (!expectedChallenge) return { verified: false as const, error: "Desafio expirado" };

  const credential = await prisma.webAuthnCredential.findUnique({
    where: { credentialId: response.id },
  });
  if (!credential || credential.usuarioId !== usuarioId) {
    return { verified: false as const, error: "Credencial desconocida" };
  }

  const result = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.credentialId,
      publicKey: new Uint8Array(credential.publicKey),
      counter: credential.counter,
      transports: parseTransports(credential.transports),
    },
    requireUserVerification: false,
  });

  if (!result.verified) return { verified: false as const, error: "Autenticacion no verificada" };

  await prisma.webAuthnCredential.update({
    where: { id: credential.id },
    data: { counter: result.authenticationInfo.newCounter },
  });

  return { verified: true as const };
}
