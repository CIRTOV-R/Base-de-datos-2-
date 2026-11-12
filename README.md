# EcoMarket Vital

Sistema de gestion para una cadena de supermercados con base de datos PostgreSQL, 10 consultas SQL de nivel intermedio y avanzado, formularios para ejecutarlas y un modulo de seguridad con autenticacion multifactor, biometria, RBAC, SSO y bitacora de auditoria.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- PostgreSQL 18 + Prisma ORM
- Tailwind CSS 4
- Recharts (visualizacion)
- SimpleWebAuthn (biometria / passkeys)
- otplib + qrcode (MFA TOTP)
- bcryptjs, Zod

## Funcionalidades

- Panel general con indicadores, ventas por mes, metodos de pago y stock bajo.
- Catalogo de 10 consultas SQL con filtros dinamicos, visualizacion del SQL, copia y exportacion CSV.
- Seguridad:
  - Login con contrasena y bloqueo por intentos fallidos (5 intentos / 15 minutos).
  - MFA TOTP con codigos de recuperacion de un solo uso.
  - WebAuthn: registro e inicio de sesion con huella, rostro o passkey.
  - SSO con Google (opcional, requiere credenciales OAuth).
  - RBAC con cinco roles y principio de menor privilegio.
  - Sesiones opacas en base de datos, cookie HttpOnly, expiracion a 8 horas y revocacion remota.
  - Cambio de contrasena con politica de complejidad.
- Gestion de usuarios (solo Administrador): crear, cambiar rol, activar/desactivar, desbloquear y restablecer contrasena.
- Bitacora de auditoria con filtros, paginacion y resumen de eventos.

## Requisitos

- Node.js 20 o superior
- PostgreSQL 14 o superior
- npm

## Puesta en marcha local

1. Crear la base de datos:

```bash
createdb ecomarket_vital
```

2. Configurar variables de entorno:

```bash
cp .env.example .env
```

Editar `.env` con la cadena de conexion y un secreto propio:

```env
DATABASE_URL="postgresql://usuario:password@127.0.0.1:5432/ecomarket_vital?schema=public"
AUTH_SECRET="genera_un_valor_con_openssl_rand_hex_32"
APP_URL="http://localhost:3000"
WEBAUTHN_RP_NAME="EcoMarket Vital"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

3. Instalar dependencias y preparar la base:

```bash
npm install
npm run db:push
npm run db:seed
```

4. Iniciar la aplicacion:

```bash
npm run dev
```

Abrir http://localhost:3000.

## Credenciales de demostracion

Contrasena para todas las cuentas: `EcoMarket#2026`

| Correo | Rol | MFA |
| --- | --- | --- |
| admin@ecomarket.cr | Administrador | No |
| gerente@ecomarket.cr | Gerente | No |
| analista@ecomarket.cr | Analista | No |
| vendedor@ecomarket.cr | Vendedor | No |
| auditor@ecomarket.cr | Auditor | Si (TOTP) |

Para la cuenta de auditor, el secreto TOTP de demostracion es `JBSWY3DPEHPK3PXP`. Generar un codigo vigente:

```bash
npm run mfa:code
# o indicando el secreto:
npm run mfa:code -- JBSWY3DPEHPK3PXP
```

Codigos de recuperacion de demostracion: `AUDI-TOR1-2026`, `AUDI-TOR2-2026`, `AUDI-TOR3-2026`.

## Scripts

| Comando | Descripcion |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Genera Prisma Client y compila para produccion |
| `npm run start` | Servidor de produccion |
| `npm run typecheck` | Verificacion de tipos |
| `npm run db:push` | Sincroniza el esquema con PostgreSQL |
| `npm run db:seed` | Carga datos de demostracion |
| `npm run db:studio` | Abre Prisma Studio |
| `npm run mfa:code` | Genera un codigo TOTP de demostracion |

## Estructura

```text
prisma/
  schema.prisma      Modelo de datos (negocio + seguridad)
  seed.ts            Datos de demostracion deterministas
src/
  app/
    (app)/           Panel, consultas, usuarios, auditoria, seguridad
    api/             Rutas de autenticacion, consultas y usuarios
    login/           Login, MFA y biometria
  components/        Shell de navegacion
  lib/               Acceso a datos, consultas SQL, seguridad, permisos
  middleware.ts      Proteccion de rutas por cookie de sesion
docs/
  INFORME.md         Informe tecnico
  MANUAL_USUARIO.md  Manual de usuario
```

## Seguridad

- Contrasenas con bcrypt (12 rondas) y politica de complejidad.
- Sesiones con token aleatorio; solo se guarda su hash SHA-256 en la base.
- Verificacion de mismo origen y `Content-Type` JSON en rutas sensibles.
- Bloqueo temporal de cuenta y limitacion de intentos por identificador e IP.
- Toda accion sensible queda registrada en la tabla `auditoria`.
- WebAuthn exige contexto seguro: `localhost` o HTTPS.

## Despliegue en Vercel

1. Crear una base PostgreSQL administrada (Neon, Supabase o Vercel Postgres).
2. Configurar en Vercel las variables `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `WEBAUTHN_RP_NAME` y, si se usa SSO, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
3. Ejecutar una vez contra la base remota:

```bash
DATABASE_URL="postgresql://..." npm run db:push
DATABASE_URL="postgresql://..." npm run db:seed
```

4. Desplegar el proyecto. El comando de build ya ejecuta `prisma generate && next build`.
5. En Google Cloud Console, registrar como URI de redireccion `https://TU_DOMINIO/api/auth/sso/google/callback`.

Notas:

- `APP_URL` debe ser el dominio publico HTTPS para que WebAuthn y el callback de Google funcionen.
- El seed no se ejecuta automaticamente en Vercel; cargarlo manualmente contra la base remota.

## Documentacion

- [Informe tecnico](docs/INFORME.md)
- [Manual de usuario](docs/MANUAL_USUARIO.md)
