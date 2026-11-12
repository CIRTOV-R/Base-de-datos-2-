# Informe tecnico - EcoMarket Vital

## 1. Introduccion

EcoMarket Vital es una cadena de supermercados que necesitaba centralizar la operacion de sus sucursales, ordenar la informacion de ventas, inventario, clientes y empleados, y entregar reportes confiables a distintos perfiles de usuario. El resultado de este proyecto es una aplicacion web full stack que cubre ese requerimiento sobre una base de datos relacional PostgreSQL.

La solucion incluye tres componentes principales:

1. Un modelo de datos normalizado para la operacion comercial.
2. Un conjunto de 10 consultas SQL de complejidad intermedia y avanzada, ejecutables desde formularios web.
3. Un modulo de seguridad con autenticacion multifactor, biometria, inicio de sesion federado, control de acceso por roles y bitacora de auditoria.

## 2. Objetivos

### Objetivo general

Desarrollar un sistema de gestion que permita consultar y analizar la informacion comercial de EcoMarket Vital de forma segura, trazable y accesible segun el rol del usuario.

### Objetivos especificos

- Disenar el modelo entidad-relacion para sucursales, empleados, productos, clientes, ventas y detalle de ventas.
- Implementar 10 consultas SQL que cubran joins, agregaciones, subconsultas, funciones de ventana y CTE.
- Construir formularios que permitan parametrizar y ejecutar cada consulta, con exportacion de resultados.
- Implementar autenticacion robusta: contrasena, MFA TOTP, WebAuthn y SSO con Google.
- Aplicar RBAC y el principio de menor privilegio.
- Registrar las acciones sensibles en una bitacora de auditoria.
- Preparar el despliegue en un entorno serverless (Vercel) con base de datos administrada.

## 3. Alcance

Incluido:

- Panel general con indicadores del negocio.
- Catalogo de consultas y ejecucion con filtros.
- Gestion de usuarios y roles.
- Autenticacion multifactor, biometria, sesiones y auditoria.
- Datos de demostracion reproducibles.

No incluido:

- Facturacion electronica, pasarela de pagos o integracion contable.
- Aplicacion movil nativa.
- Aprovisionamiento automatico de usuarios desde un directorio corporativo.

## 4. Arquitectura

La aplicacion sigue una arquitectura en capas dentro de un monolito modular:

```text
Navegador
  -> Next.js App Router (React Server Components + Client Components)
     -> Route Handlers (/api) para autenticacion, consultas y usuarios
        -> Capa de librerias (sesion, permisos, seguridad, auditoria)
           -> Prisma ORM
              -> PostgreSQL
```

Decisiones relevantes:

- **Next.js 15** permite combinar renderizado en servidor para paginas protegidas con componentes cliente para formularios interactivos.
- **Prisma** aporta tipado fuerte y consultas parametrizadas; las consultas analiticas usan `$queryRaw` con `Prisma.sql` para evitar inyeccion SQL.
- **Sesiones opacas en base de datos** en lugar de JWT: permiten revocacion inmediata y auditoria.
- **Serverless friendly**: todas las rutas declaran `runtime = "nodejs"` y la base es externa, lo que permite desplegar en Vercel.

## 5. Modelo de datos

Tablas de negocio:

| Tabla | Proposito | Campos principales |
| --- | --- | --- |
| `sucursales` | Puntos de venta | nombre, ciudad, direccion, telefono, activa |
| `empleados` | Personal | nombre, departamento, cargo, salario, sucursal_id |
| `productos` | Catalogo | nombre, categoria, precio, stock, stock_minimo |
| `clientes` | Compradores | nombre, email, telefono, ciudad |
| `ventas` | Cabecera de transaccion | cliente_id, sucursal_id, empleado_id, fecha, metodo_pago, total |
| `detalle_ventas` | Lineas de la venta | venta_id, producto_id, cantidad, precio_unitario, descuento |

Tablas de seguridad:

| Tabla | Proposito |
| --- | --- |
| `usuarios` | Cuentas, rol, estado, hash de contrasena, MFA, bloqueo |
| `sesiones` | Sesiones activas con hash de token, expiracion e IP |
| `webauthn_credentials` | Credenciales biometricas (clave publica, contador, dispositivo) |
| `webauthn_challenges` | Desafios temporales de registro y autenticacion |
| `auditoria` | Bitacora de eventos con usuario, accion, detalle, IP y resultado |
| `intentos_login` | Intentos de acceso para limitacion de tasa |

Relaciones principales:

- Un cliente tiene muchas ventas; una venta tiene muchos detalles.
- Un producto aparece en muchos detalles de venta.
- Una sucursal tiene muchos empleados y muchas ventas.
- Un empleado puede registrar muchas ventas.
- Un usuario puede tener muchas sesiones, credenciales WebAuthn y eventos de auditoria.

Se usan indices en claves foraneas, `ventas.fecha`, `auditoria.created_at` y `auditoria.accion` para sostener los reportes y la busqueda.

## 6. Consultas SQL

El catalogo incluye 10 consultas, agrupadas en intermedias y avanzadas. Todas se ejecutan con parametros y devuelven filas serializadas para la interfaz.

### 6.1 Inventario bajo (intermedia)

Lista productos cuyo stock esta por debajo del promedio general. Usa una subconsulta escalar dos veces: una para el valor de comparacion y otra para mostrar el promedio.

```sql
SELECT p.id, p.nombre, p.categoria, p.stock, p.stock_minimo, p.precio,
       (SELECT ROUND(AVG(stock), 1) FROM productos) AS "promedioStock"
FROM productos p
WHERE p.stock < (SELECT AVG(stock) FROM productos)
ORDER BY p.stock ASC, p.nombre;
```

### 6.2 Ventas por metodo de pago (intermedia)

Agrupa transacciones por metodo de pago y calcula cantidad y monto recaudado.

```sql
SELECT metodo_pago, COUNT(*)::int AS transacciones, SUM(total) AS monto
FROM ventas
GROUP BY metodo_pago
ORDER BY transacciones DESC;
```

### 6.3 Facturacion por cliente (intermedia)

Requiere tres tablas. Une clientes, ventas y detalle de ventas, agrupa por cliente y calcula el gasto historico y la cantidad de compras. Permite buscar por nombre o correo.

```sql
SELECT c.id, c.nombre, c.email,
       COUNT(DISTINCT v.id)::int AS compras,
       COALESCE(SUM(dv.cantidad * dv.precio_unitario - dv.descuento), 0) AS "totalGastado"
FROM clientes c
INNER JOIN ventas v ON v.cliente_id = c.id
INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
WHERE ($1 = '' OR c.nombre ILIKE $1 OR c.email ILIKE $1)
GROUP BY c.id, c.nombre, c.email
ORDER BY "totalGastado" DESC;
```

### 6.4 Ventas por sucursal (intermedia)

Une sucursales, ventas y detalle de ventas para obtener unidades vendidas, transacciones y facturacion por sucursal y ciudad.

```sql
SELECT s.nombre AS sucursal, s.ciudad,
       COALESCE(SUM(dv.cantidad), 0)::int AS "productosVendidos",
       COUNT(DISTINCT v.id)::int AS transacciones,
       COALESCE(SUM(v.total), 0) AS facturacion
FROM sucursales s
INNER JOIN ventas v ON v.sucursal_id = s.id
INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
GROUP BY s.id, s.nombre, s.ciudad
ORDER BY "productosVendidos" DESC;
```

### 6.5 Empleados y sus sucursales (intermedia)

Une empleados con sucursales y permite filtrar por departamento.

```sql
SELECT e.nombre, e.departamento, e.cargo, e.salario,
       s.nombre AS sucursal, s.ciudad
FROM empleados e
INNER JOIN sucursales s ON s.id = e.sucursal_id
WHERE ($1 = '' OR e.departamento = $1)
ORDER BY s.nombre, e.salario DESC;
```

### 6.6 Detalle de transacciones recientes (intermedia)

Une ventas, detalle, productos y clientes para mostrar las ultimas lineas vendidas en un rango de dias.

```sql
SELECT v.id AS "ventaId", v.fecha, c.nombre AS cliente,
       p.nombre AS producto, dv.cantidad, dv.precio_unitario,
       v.metodo_pago
FROM ventas v
INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
INNER JOIN productos p ON p.id = dv.producto_id
INNER JOIN clientes c ON c.id = v.cliente_id
WHERE v.fecha >= $1
ORDER BY v.fecha DESC, v.id DESC;
```

### 6.7 Ranking de empleados por departamento (avanzada)

Usa la funcion de ventana `RANK()` con `PARTITION BY` para ordenar salarios dentro de cada departamento sin colapsar filas.

```sql
SELECT nombre, departamento, salario,
       RANK() OVER (PARTITION BY departamento ORDER BY salario DESC)::int AS rank
FROM empleados
WHERE ($1 = '' OR departamento = $1)
ORDER BY departamento, rank, nombre;
```

### 6.8 Clientes con compra cruzada (avanzada)

Emplea subconsultas correlacionadas `EXISTS` y `NOT EXISTS` para encontrar clientes que compraron una categoria pero nunca otra.

```sql
SELECT c.id, c.nombre, c.email, c.ciudad
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
ORDER BY c.nombre;
```

### 6.9 Auditoria mensual de crecimiento (avanzada)

Combina una CTE con `LAG()` para comparar cada mes contra el anterior y calcular la variacion porcentual.

```sql
WITH mensual AS (
  SELECT date_trunc('month', fecha)::date AS mes,
         SUM(total) AS total,
         COUNT(*)::int AS ventas
  FROM ventas
  GROUP BY 1
),
crecimiento AS (
  SELECT mes, total, ventas, LAG(total) OVER (ORDER BY mes) AS anterior
  FROM mensual
)
SELECT to_char(mes, 'YYYY-MM') AS periodo, total, ventas, anterior,
       CASE WHEN anterior IS NULL OR anterior = 0 THEN NULL
            ELSE ROUND(((total - anterior) / anterior * 100)::numeric, 2)
       END AS "crecimientoPct"
FROM crecimiento
ORDER BY mes;
```

### 6.10 Super compradores (avanzada)

Usa `HAVING` con una subconsulta de promedio para listar clientes cuyo gasto supera el gasto promedio de todos los clientes.

```sql
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
ORDER BY "gastoTotal" DESC;
```

## 7. Seguridad

### 7.1 Autenticacion

Flujo con contrasena:

1. El usuario envia correo y contrasena por JSON.
2. Se valida origen y tipo de contenido.
3. Se consulta la limitacion de tasa por correo e IP.
4. Se verifica el hash bcrypt.
5. Si la cuenta tiene MFA o credenciales WebAuthn, se crea una sesion pendiente y se redirige al segundo factor.
6. Al superar el segundo factor, la sesion se marca como verificada y se registra el ingreso.

### 7.2 MFA TOTP

- Se genera un secreto Base32 por usuario y se entrega un codigo QR.
- La activacion exige un codigo valido.
- Se generan codigos de recuperacion de un solo uso, almacenados como hash SHA-256.
- La desactivacion exige contrasena y un codigo vigente.

### 7.3 WebAuthn

- Registro: se generan opciones con desafio temporal, se valida la atestacion y se guarda la clave publica.
- Inicio de sesion: se generan opciones para las credenciales del usuario, se valida la firma y se actualiza el contador anti-replay.
- Requiere contexto seguro (HTTPS o localhost) y un autenticador compatible.

### 7.4 SSO con Google

- Flujo OAuth 2.0 con `state` firmado para prevenir CSRF.
- Se valida el correo verificado y se vincula o crea la cuenta.
- Si no hay credenciales configuradas, la interfaz informa que el metodo no esta disponible.

### 7.5 Sesiones

- Token aleatorio de alta entropia; en base solo se guarda su hash SHA-256.
- Cookie `HttpOnly`, `SameSite=Lax` y `Secure` en produccion.
- Expiracion de 8 horas para sesiones verificadas y 10 minutos para sesiones pendientes de MFA.
- Revocacion individual y masiva desde el centro de seguridad.

### 7.6 Control de acceso (RBAC y PoLP)

| Permiso | Admin | Gerente | Analista | Vendedor | Auditor |
| --- | --- | --- | --- | --- | --- |
| Panel general | Si | Si | Si | Si | Si |
| Consultas analiticas | Si | Si | Si | No | Si |
| Transacciones recientes | Si | Si | Si | Si | Si |
| Ranking y empleados | Si | Si | No | No | Si |
| Gestion de usuarios | Si | No | No | No | No |
| Auditoria | Si | Si | No | No | Si |
| Exportar reportes | Si | Si | Si | No | No |

El principio de menor privilegio se aplica en tres capas: navegacion (menu filtrado), servidor (verificacion de permisos en cada pagina y ruta) y base de datos (consultas parametrizadas y sin acceso directo del cliente).

### 7.7 Auditoria y limitacion de intentos

- Cada login, cambio de MFA, alta de usuario, cambio de rol, restablecimiento de contrasena y ejecucion de consulta queda registrado.
- Se guarda usuario, correo, accion, detalle, IP, agente de usuario, resultado y fecha.
- La limitacion de intentos combina ventana temporal y bloqueo temporal de la cuenta.

## 8. Pruebas realizadas

- `npx tsc --noEmit`: sin errores de tipos.
- `npm run build`: compilacion de produccion exitosa con 27 rutas.
- Inicio de sesion con contrasena: correcto para los cinco roles.
- MFA TOTP con la cuenta auditor: desafio, codigo valido y acceso a auditoria.
- RBAC: el vendedor recibe 403 al intentar una consulta analitica y es redirigido al panel al abrir usuarios.
- Consultas: ejecucion correcta de inventario bajo con resultados y SQL mostrado.
- Paginas protegidas: panel, consultas, usuarios, auditoria y seguridad responden 200 con sesion valida.

## 9. Despliegue

La aplicacion esta preparada para Vercel:

- Build: `prisma generate && next build`.
- Base de datos PostgreSQL administrada externa (Neon, Supabase o Vercel Postgres).
- Variables: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `WEBAUTHN_RP_NAME`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- Migracion inicial con `npm run db:push` y carga de datos con `npm run db:seed` contra la base remota.
- WebAuthn y el callback de Google requieren el dominio publico HTTPS en `APP_URL`.

## 10. Conclusiones y recomendaciones

El sistema cumple con los objetivos planteados: modela la operacion comercial, expone consultas SQL de distinta complejidad y protege el acceso con mecanismos modernos y trazables. La separacion entre permisos, sesiones y auditoria facilita la evolucion del sistema sin comprometer la seguridad.

Recomendaciones futuras:

- Incorporar migraciones versionadas con Prisma Migrate para produccion.
- Agregar pruebas automatizadas end to end (Playwright) para los flujos de autenticacion.
- Integrar un proveedor de correo para recuperacion de cuenta y alertas de seguridad.
- Anadir monitoreo y alertas sobre eventos fallidos de auditoria.
- Evaluar un almacen de sesiones distribuido si se escala a multiples regiones.
