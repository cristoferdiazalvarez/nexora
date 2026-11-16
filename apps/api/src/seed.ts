import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { Organization, User, Client, Product, Invoice } from "./models.js";
import { calculate } from "./money.js";
await mongoose.connect(process.env.MONGODB_URI!);
if (await User.exists({ email: "admin@nexora.example" }))
  throw new Error("La demo ya existe; no se han alterado datos");
const org = await Organization.create({
  name: "Estudio Horizonte · Demo",
  address: "Dirección de ejemplo",
  taxBps: 2100,
});
const password = randomBytes(18).toString("base64url");
await User.create({
  organization: org._id,
  name: "Alex Demo",
  email: "admin@nexora.example",
  password: await bcrypt.hash(password, 12),
  role: "admin",
});
const names = [
  "Estudio Órbita",
  "Proyecto Aurora",
  "Taller Prisma",
  "Agencia Lumen",
  "Equipo Atlas",
  "Colectivo Sur",
  "Laboratorio Nube",
  "Grupo Cobalto",
  "Estudio Vértice",
  "Proyecto Brisa",
  "Taller Índigo",
  "Agencia Norte",
];
const clients = await Client.insertMany(
  names.map((name, n) => ({
    organization: org._id,
    name,
    email: `equipo${n + 1}@example.com`,
    taxId: `DEMO-${n + 1}`,
    address: "Dirección ficticia · Demo",
  })),
);
await Product.insertMany(
  [
    { name: "Desarrollo web", priceCents: 150000, kind: "servicio" },
    { name: "Mantenimiento mensual", priceCents: 25000, kind: "servicio" },
    { name: "Auditoría técnica", priceCents: 60000, kind: "servicio" },
  ].map((p) => ({ ...p, organization: org._id })),
);
for (let n = 0; n < 18; n++) {
  const date = new Date();
  date.setMonth(date.getMonth() - (n % 6));
  const lines = [
    {
      name: "Servicios de desarrollo · Demo",
      quantity: 1,
      priceCents: 45000 + n * 7500,
    },
  ];
  const c = clients[n % clients.length];
  await Invoice.create({
    organization: org._id,
    number: `NX-DEMO-${String(n + 1).padStart(3, "0")}`,
    clientId: c._id,
    clientName: c.name,
    issuerName: org.name,
    issuerAddress: org.address,
    clientAddress: c.address,
    clientTaxId: c.taxId,
    lines,
    taxBps: 2100,
    ...calculate(lines, 2100),
    status: n % 4 === 0 ? "pendiente" : "pagada",
    dueDate: new Date(date.getTime() + 30 * 86400000)
      .toISOString()
      .slice(0, 10),
    createdAt: date,
  });
}
console.log("Demo creada. Correo: admin@nexora.example");
console.log(`Contraseña generada (guárdala localmente): ${password}`);
await mongoose.disconnect();
