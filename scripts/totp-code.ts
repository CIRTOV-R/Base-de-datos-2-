import { authenticator } from "otplib";

const secret = process.argv[2] || process.env.MFA_SECRET || "JBSWY3DPEHPK3PXP";

if (!/^[A-Z2-7]+=*$/i.test(secret)) {
  console.error("Secreto TOTP invalido. Debe ser Base32.");
  process.exit(1);
}

const code = authenticator.generate(secret);
const remaining = authenticator.timeRemaining();

console.log(`Secreto: ${secret}`);
console.log(`Codigo:  ${code}`);
console.log(`Valido por: ${remaining} segundos`);
