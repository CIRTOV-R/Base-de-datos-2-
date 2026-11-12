# Manual de usuario - EcoMarket Vital

## 1. Requisitos

- Navegador moderno (Chrome, Edge, Firefox o Safari).
- Conexion a la aplicacion (`http://localhost:3000` en desarrollo).
- Para biometria: dispositivo con lector de huella, reconocimiento facial o llave de seguridad, y contexto seguro (HTTPS o localhost).

## 2. Inicio de sesion

1. Abrir la aplicacion. Si no hay sesion, se muestra la pantalla de acceso.
2. Escribir el correo y la contrasena.
3. Presionar **Iniciar sesion**.

Cuentas de demostracion (contrasena `EcoMarket#2026`):

| Correo | Rol |
| --- | --- |
| admin@ecomarket.cr | Administrador |
| gerente@ecomarket.cr | Gerente |
| analista@ecomarket.cr | Analista |
| vendedor@ecomarket.cr | Vendedor |
| auditor@ecomarket.cr | Auditor (requiere MFA) |

Si la cuenta tiene MFA o biometria registrada, se solicitara el segundo factor.

## 3. Segundo factor

### 3.1 Codigo TOTP

La cuenta `auditor@ecomarket.cr` tiene MFA activo con el secreto de demostracion `JBSWY3DPEHPK3PXP`.

Opciones para obtener el codigo:

- Usar una aplicacion autenticadora (Google Authenticator, Authy, 1Password) con ese secreto.
- Ejecutar en el proyecto:

```bash
npm run mfa:code
```

El comando muestra un codigo de 6 digitos y los segundos de vigencia.

### 3.2 Codigos de recuperacion

Si no se tiene acceso al autenticador, se puede usar uno de los codigos de recuperacion de demostracion:

- `AUDI-TOR1-2026`
- `AUDI-TOR2-2026`
- `AUDI-TOR3-2026`

Cada codigo se invalida despues de usarse.

### 3.3 Biometria

Si la cuenta tiene una credencial biometrica registrada, en la pantalla de MFA se puede elegir **Usar biometria** y confirmar con huella, rostro o llave de seguridad.

## 4. Navegacion general

El menu lateral muestra solo las secciones permitidas para el rol:

- **Panel general**: indicadores y graficos.
- **Consultas SQL**: catalogo de reportes.
- **Usuarios**: solo Administrador.
- **Auditoria**: Administrador, Gerente y Auditor.
- **Seguridad**: todos los usuarios.

El boton **Salir** cierra la sesion actual.

## 5. Panel general

Muestra:

- Total de ventas, ingresos, clientes y productos.
- Evolucion mensual de ventas.
- Distribucion por metodo de pago.
- Productos con stock bajo.
- Ultimas transacciones.

Los datos se actualizan al recargar la pagina.

## 6. Consultas SQL

1. Abrir **Consultas SQL**.
2. Elegir una consulta del catalogo lateral.
3. Ajustar los filtros disponibles:
   - Busqueda por texto en facturacion por cliente.
   - Departamento en empleados y ranking.
   - Categorias en compra cruzada.
   - Dias y limite en transacciones recientes.
   - Limite de filas en las demas consultas.
4. Presionar **Ejecutar consulta**.
5. Revisar la tabla de resultados, el tiempo de ejecucion y el SQL utilizado.

Funciones adicionales:

- **Copiar SQL**: copia la sentencia al portapapeles.
- **Exportar CSV**: descarga los resultados (segun permisos del rol).
- **Ver SQL**: muestra la consulta con los parametros.

### Consultas disponibles

1. Inventario bajo.
2. Ventas por metodo de pago.
3. Facturacion por cliente.
4. Ventas por sucursal.
5. Empleados y sus sucursales.
6. Detalle de transacciones recientes.
7. Ranking de empleados por departamento.
8. Clientes con compra cruzada.
9. Auditoria mensual de crecimiento.
10. Super compradores.

Si el rol no tiene permiso, la consulta no aparece o la ejecucion se rechaza con un mensaje.

## 7. Centro de seguridad

Disponible en **Seguridad** para todos los usuarios.

### 7.1 Activar MFA

1. En la tarjeta **Autenticacion multifactor**, presionar **Configurar autenticador**.
2. Escanear el codigo QR con la aplicacion autenticadora.
3. Si no se puede escanear, copiar la clave manual.
4. Escribir el codigo de 6 digitos y presionar **Activar MFA**.
5. Guardar o descargar los codigos de recuperacion. Se muestran una sola vez.

### 7.2 Desactivar MFA

1. Presionar **Desactivar MFA**.
2. Confirmar con la contrasena y un codigo vigente.

### 7.3 Registrar biometria

1. En **Biometria y passkeys**, escribir un nombre para el dispositivo.
2. Presionar **Registrar biometria**.
3. Confirmar con el autenticador del dispositivo.
4. La credencial aparece en la lista y puede eliminarse con el icono de papelera.

### 7.4 Cambiar contrasena

1. En la tarjeta **Contrasena**, escribir la contrasena actual y la nueva dos veces.
2. Presionar **Cambiar contrasena**.

La nueva contrasena debe tener al menos 10 caracteres, una mayuscula, una minuscula, un numero y un caracter especial. Al cambiarla se cierran las demas sesiones.

### 7.5 Gestionar sesiones

- La lista muestra sesion actual y sesiones remotas con IP, navegador y fechas.
- **Revocar** cierra una sesion puntual.
- **Cerrar las demas sesiones** cierra todas excepto la actual.

## 8. Gestion de usuarios (Administrador)

1. Abrir **Usuarios**.
2. Para crear una cuenta, completar nombre, correo, rol y contrasena temporal, y presionar **Crear usuario**.
3. Para cambiar el rol, usar el selector en la columna **Rol**.
4. Para activar o desactivar una cuenta, presionar el estado en la columna **Estado**.
5. Si la cuenta esta bloqueada por intentos fallidos, usar el icono de candado para desbloquear.
6. Para restablecer la contrasena, usar el icono de llave, escribir la nueva contrasena y confirmar.

Restricciones:

- No se puede cambiar el rol ni desactivar la propia cuenta.
- El restablecimiento de contrasena revoca las sesiones del usuario afectado.

## 9. Auditoria

Disponible para Administrador, Gerente y Auditor.

1. Abrir **Auditoria**.
2. Filtrar por texto (correo, accion, detalle o IP), accion, resultado o rango de fechas.
3. Presionar **Filtrar**.
4. Navegar con **Anterior** y **Siguiente**.

La parte superior resume eventos totales, exitosos y fallidos. Cada fila muestra fecha, usuario, accion, detalle, IP y resultado.

## 10. Mensajes y soluciones frecuentes

| Mensaje o situacion | Causa probable | Solucion |
| --- | --- | --- |
| Correo o contrasena incorrectos | Credenciales invalidas | Verificar datos e intentar de nuevo |
| Demasiados intentos fallidos | Limite de intentos alcanzado | Esperar 15 minutos o pedir desbloqueo al Administrador |
| Tu rol no tiene permiso | RBAC | Usar una cuenta con el rol adecuado |
| MFA no disponible | Secreto o codigo vencido | Generar un codigo vigente o usar codigo de recuperacion |
| Biometria no disponible | Navegador o contexto no seguro | Usar HTTPS o localhost y un dispositivo compatible |
| SSO no configurado | Faltan credenciales OAuth | Usar contrasena o configurar Google SSO |
| La sesion expiro | Pasaron 8 horas | Iniciar sesion nuevamente |

## 11. Buenas practicas

- No compartir contrasenas ni codigos de recuperacion.
- Mantener MFA activo en cuentas con acceso a informacion sensible.
- Revisar periodicamente las sesiones activas y revocar las desconocidas.
- Cerrar sesion al terminar en equipos compartidos.
- Reportar al Administrador cualquier evento extrano en la bitacora.
