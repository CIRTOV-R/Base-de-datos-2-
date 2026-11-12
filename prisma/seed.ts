import { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20261111);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const SUCURSALES = [
  { nombre: "EcoMarket San José Centro", ciudad: "San José", direccion: "Av. 2, Calle 9, Barrio Amón", telefono: "2222-1010" },
  { nombre: "EcoMarket Heredia", ciudad: "Heredia", direccion: "250 m norte del Parque Central", telefono: "2266-2020" },
  { nombre: "EcoMarket Cartago", ciudad: "Cartago", direccion: "Frente a la Basílica de los Ángeles", telefono: "2555-3030" },
  { nombre: "EcoMarket Alajuela", ciudad: "Alajuela", direccion: "Plaza Real, local 12", telefono: "2444-4040" },
];

const EMPLEADOS = [
  ["Ana Rodríguez", "Administración", "Gerente General", 2_450_000, 0],
  ["Carlos Méndez", "Administración", "Contador", 1_350_000, 1],
  ["María Jiménez", "Recursos Humanos", "Jefa de RRHH", 1_480_000, 0],
  ["Luis Solano", "Ventas", "Jefe de Ventas", 1_250_000, 2],
  ["Sofía Vargas", "Ventas", "Vendedora Senior", 980_000, 1],
  ["Diego Castro", "Ventas", "Vendedor", 760_000, 3],
  ["Valeria Mora", "Ventas", "Vendedora", 745_000, 0],
  ["Andrés Rojas", "Caja", "Cajero Senior", 720_000, 2],
  ["Paola Chaves", "Caja", "Cajera", 690_000, 1],
  ["Marco Fallas", "Caja", "Cajero", 680_000, 3],
  ["Karla Ureña", "Bodega", "Jefa de Bodega", 1_100_000, 0],
  ["José Araya", "Bodega", "Auxiliar de Bodega", 620_000, 2],
  ["Natalia Rojas", "Marketing", "Coordinadora de Marketing", 1_150_000, 1],
  ["Esteban Quesada", "Marketing", "Diseñador", 850_000, 3],
] as const;

const PRODUCTOS: Array<[string, string, number]> = [
  ["Quinoa orgánica 500 g", "Alimentos", 4800],
  ["Avena integral 1 kg", "Alimentos", 2600],
  ["Arroz integral 2 kg", "Alimentos", 3200],
  ["Lentejas orgánicas 1 kg", "Alimentos", 2400],
  ["Aceite de oliva extra virgen 500 ml", "Alimentos", 8900],
  ["Miel de abeja pura 500 g", "Alimentos", 5600],
  ["Almendras naturales 300 g", "Alimentos", 6200],
  ["Granola artesanal 500 g", "Alimentos", 3900],
  ["Té verde orgánico 20 sobres", "Alimentos", 2800],
  ["Pasta integral 500 g", "Alimentos", 2100],
  ["Jabón de coco artesanal", "Cosmética", 1900],
  ["Crema facial de aloe vera", "Cosmética", 7500],
  ["Shampoo sólido de romero", "Cosmética", 4200],
  ["Aceite de argán 100 ml", "Cosmética", 9800],
  ["Bálsamo labial de cacao", "Cosmética", 1600],
  ["Desodorante natural de lavanda", "Cosmética", 3800],
  ["Mascarilla de arcilla verde", "Cosmética", 3500],
  ["Sérum de vitamina C", "Cosmética", 11500],
  ["Leche de almendra 1 L", "Bebidas", 2400],
  ["Kombucha de jengibre 500 ml", "Bebidas", 3100],
  ["Jugo verde prensado en frío", "Bebidas", 2900],
  ["Agua de coco 500 ml", "Bebidas", 2200],
  ["Café orgánico tostado 500 g", "Bebidas", 6800],
  ["Té de manzanilla 20 sobres", "Bebidas", 2500],
  ["Vitamina C 1000 mg", "Suplementos", 6500],
  ["Omega 3 1000 mg", "Suplementos", 8900],
  ["Proteína vegetal 500 g", "Suplementos", 14500],
  ["Magnesio 300 mg", "Suplementos", 7200],
  ["Colágeno hidrolizado 300 g", "Suplementos", 12800],
  ["Zinc 50 mg", "Suplementos", 5400],
  ["Detergente ecológico 2 L", "Limpieza", 5200],
  ["Jabón lavaplatos biodegradable", "Limpieza", 2300],
  ["Limpiador multiuso 1 L", "Limpieza", 2800],
  ["Bolsas compostables 30 uds", "Limpieza", 1800],
  ["Cepillo de dientes de bambú", "Hogar", 1500],
  ["Toallas de algodón orgánico", "Hogar", 4200],
  ["Vela de soya aromática", "Hogar", 3600],
];

const CLIENTES = [
  ["María Fernández", "maria.fernandez@example.com", "San José"],
  ["Jorge Ramírez", "jorge.ramirez@example.com", "Heredia"],
  ["Lucía Alvarado", "lucia.alvarado@example.com", "Cartago"],
  ["Daniela Solís", "daniela.solis@example.com", "Alajuela"],
  ["Roberto Chacón", "roberto.chacon@example.com", "San José"],
  ["Gabriela Núñez", "gabriela.nunez@example.com", "Heredia"],
  ["Mauricio López", "mauricio.lopez@example.com", "Cartago"],
  ["Silvia Cordero", "silvia.cordero@example.com", "Alajuela"],
  ["Andrés Villalobos", "andres.villalobos@example.com", "San José"],
  ["Katherine Rojas", "katherine.rojas@example.com", "Heredia"],
  ["Felipe Sandoval", "felipe.sandoval@example.com", "Cartago"],
  ["Mónica Salazar", "monica.salazar@example.com", "Alajuela"],
  ["Esteban Aguilar", "esteban.aguilar@example.com", "San José"],
  ["Patricia Vega", "patricia.vega@example.com", "Heredia"],
  ["Héctor Campos", "hector.campos@example.com", "Cartago"],
  ["Verónica Blanco", "veronica.blanco@example.com", "Alajuela"],
  ["Ricardo Mora", "ricardo.mora@example.com", "San José"],
  ["Tatiana Castro", "tatiana.castro@example.com", "Heredia"],
  ["Óscar Herrera", "oscar.herrera@example.com", "Cartago"],
  ["Melissa Ríos", "melissa.rios@example.com", "Alajuela"],
  ["Javier Pineda", "javier.pineda@example.com", "San José"],
  ["Carolina Muñoz", "carolina.munoz@example.com", "Heredia"],
  ["Pablo Zúñiga", "pablo.zuniga@example.com", "Cartago"],
  ["Andrea Fonseca", "andrea.fonseca@example.com", "Alajuela"],
  ["Marco Badilla", "marco.badilla@example.com", "San José"],
  ["Natalia Espinoza", "natalia.espinoza@example.com", "Heredia"],
  ["Diego Calderón", "diego.calderon@example.com", "Cartago"],
  ["Isabela Guzmán", "isabela.guzman@example.com", "Alajuela"],
  ["Fernando Arce", "fernando.arce@example.com", "San José"],
  ["Rocío Méndez", "rocio.mendez@example.com", "Heredia"],
] as const;

const METODOS_PAGO = ["Efectivo", "Tarjeta Débito", "Tarjeta Crédito", "SINPE Móvil", "Transferencia"];

async function main() {
  console.log("🌱 Limpiando datos existentes...");
  await prisma.$transaction([
    prisma.detalleVenta.deleteMany(),
    prisma.venta.deleteMany(),
    prisma.empleado.deleteMany(),
    prisma.producto.deleteMany(),
    prisma.cliente.deleteMany(),
    prisma.sucursal.deleteMany(),
    prisma.auditoria.deleteMany(),
    prisma.sesion.deleteMany(),
    prisma.webAuthnChallenge.deleteMany(),
    prisma.webAuthnCredential.deleteMany(),
    prisma.intentoLogin.deleteMany(),
    prisma.usuario.deleteMany(),
  ]);

  console.log("🏬 Sucursales...");
  const sucursales = [];
  for (const s of SUCURSALES) {
    sucursales.push(await prisma.sucursal.create({ data: s }));
  }

  console.log("👥 Empleados...");
  const empleados = [];
  for (const [nombre, departamento, cargo, salario, sucursalIdx] of EMPLEADOS) {
    empleados.push(
      await prisma.empleado.create({
        data: {
          nombre,
          email: `${nombre.toLowerCase().replace(/[^a-z]+/g, ".")}@ecomarket.cr`,
          departamento,
          cargo,
          salario,
          sucursalId: sucursales[sucursalIdx].id,
          fechaIngreso: new Date(2019 + randInt(0, 6), randInt(0, 11), randInt(1, 27)),
        },
      })
    );
  }

  console.log("📦 Productos...");
  const productos = [];
  for (const [nombre, categoria, precio] of PRODUCTOS) {
    const stock = rnd() < 0.22 ? randInt(0, 12) : randInt(18, 140);
    productos.push(
      await prisma.producto.create({
        data: {
          nombre,
          categoria,
          precio,
          costo: round(precio * (0.55 + rnd() * 0.15), 0),
          stock,
          stockMinimo: randInt(5, 15),
          unidad: categoria === "Bebidas" ? "botella" : "unidad",
        },
      })
    );
  }

  console.log("🧑‍🤝‍🧑 Clientes...");
  const clientes = [];
  for (const [nombre, email, ciudad] of CLIENTES) {
    clientes.push(
      await prisma.cliente.create({
        data: {
          nombre,
          email,
          ciudad,
          telefono: `8${randInt(100, 999)}-${randInt(1000, 9999)}`,
          fechaRegistro: new Date(2023, randInt(0, 11), randInt(1, 28)),
        },
      })
    );
  }

  console.log("💳 Usuarios del sistema...");
  const passwordHash = await bcrypt.hash("EcoMarket#2026", 12);
  const usuarios = [
    { nombre: "Ana Rodríguez", email: "admin@ecomarket.cr", rol: Rol.ADMIN, mfa: false },
    { nombre: "Carlos Méndez", email: "gerente@ecomarket.cr", rol: Rol.GERENTE, mfa: false },
    { nombre: "María Jiménez", email: "analista@ecomarket.cr", rol: Rol.ANALISTA, mfa: false },
    { nombre: "Luis Solano", email: "vendedor@ecomarket.cr", rol: Rol.VENDEDOR, mfa: false },
    { nombre: "Sofía Vargas", email: "auditor@ecomarket.cr", rol: Rol.AUDITOR, mfa: true },
  ];

  for (const u of usuarios) {
    await prisma.usuario.create({
      data: {
        nombre: u.nombre,
        email: u.email,
        passwordHash,
        rol: u.rol,
        mfaEnabled: u.mfa,
        mfaSecret: u.mfa ? "JBSWY3DPEHPK3PXP" : null,
        mfaRecoveryCodes: u.mfa
          ? ["AUDI-TOR1-2026", "AUDI-TOR2-2026", "AUDI-TOR3-2026"].map(sha256)
          : [],
        emailVerified: new Date(),
      },
    });
  }

  console.log("🧾 Ventas y detalles...");
  const ventasEmpleados = empleados.filter((e) => ["Ventas", "Caja"].includes(e.departamento));
  const cosmeticos = productos.filter((p) => p.categoria === "Cosmética");
  const alimentos = productos.filter((p) => p.categoria === "Alimentos");
  const otros = productos.filter((p) => !["Cosmética", "Alimentos"].includes(p.categoria));

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 8, 1);
  let ventaCount = 0;
  const clienteTotales = new Map<number, number>();

  for (let mes = 0; mes < 9; mes++) {
    const cantidadVentas = 16 + mes * 4 + randInt(0, 6);
    for (let i = 0; i < cantidadVentas; i++) {
      const fecha = new Date(
        start.getFullYear(),
        start.getMonth() + mes,
        randInt(1, 27),
        randInt(8, 20),
        randInt(0, 59)
      );
      if (fecha > now) fecha.setTime(now.getTime() - randInt(1, 48) * 3600_000);

      const clienteIdx = randInt(0, clientes.length - 1);
      const cliente = clientes[clienteIdx];

      let pool = productos;
      if (clienteIdx < 4) pool = cosmeticos;
      else if (clienteIdx < 8) pool = alimentos;
      else pool = [...alimentos, ...cosmeticos, ...otros];

      const empleado = pick(ventasEmpleados);
      const sucursalId = empleado.sucursalId;
      const metodoPago = pick(METODOS_PAGO);

      const nDetalles = randInt(1, 5);
      const usados = new Set<number>();
      const lineas: Array<{ productoId: number; cantidad: number; precioUnitario: number; descuento: number }> = [];

      for (let d = 0; d < nDetalles; d++) {
        const p = pick(pool);
        if (usados.has(p.id)) continue;
        usados.add(p.id);
        const cantidad = randInt(1, 4);
        const descuento = rnd() < 0.12 ? round(Number(p.precio) * cantidad * 0.05, 0) : 0;
        lineas.push({ productoId: p.id, cantidad, precioUnitario: Number(p.precio), descuento });
      }
      if (lineas.length === 0) continue;

      const subtotal = round(
        lineas.reduce((acc, l) => acc + l.cantidad * l.precioUnitario - l.descuento, 0)
      );
      const impuesto = round(subtotal * 0.13);
      const total = round(subtotal + impuesto);

      const venta = await prisma.venta.create({
        data: {
          clienteId: cliente.id,
          empleadoId: empleado.id,
          sucursalId,
          fecha,
          metodoPago,
          subtotal,
          impuesto,
          total,
          detalles: { create: lineas },
        },
      });
      ventaCount++;
      clienteTotales.set(cliente.id, (clienteTotales.get(cliente.id) ?? 0) + total);
    }
  }

  for (const [clienteId, total] of clienteTotales) {
    await prisma.cliente.update({
      where: { id: clienteId },
      data: { puntosFidelidad: Math.floor(total / 1000) },
    });
  }

  console.log(`✅ Seed completado: ${ventaCount} ventas, ${productos.length} productos, ${clientes.length} clientes.`);
  console.log("🔐 Credenciales: admin@ecomarket.cr / EcoMarket#2026 (y gerente, analista, vendedor, auditor)");
  console.log("🔐 auditor@ecomarket.cr requiere TOTP (secreto JBSWY3DPEHPK3PXP) o código de recuperación AUDI-TOR1-2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
