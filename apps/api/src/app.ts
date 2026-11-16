import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import { z } from "zod";
import {
  Organization,
  User,
  Session,
  Client,
  Product,
  Invoice,
} from "./models.js";
import { calculate, lineSchema } from "./money.js";
import {
  security,
  clientKey,
  sessionCookie,
  cookieOptions,
} from "./security.js";
const text = z.string().trim().min(1).max(160),
  email = z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase());
const authSchema = z.object({
  email,
  password: z
    .string()
    .min(12)
    .max(72)
    .refine(
      (v) => Buffer.byteLength(v, "utf8") <= 72,
      "La contraseña debe ocupar como máximo 72 bytes",
    ),
});
const clientSchema = z.object({
  name: text,
  email: z.union([email, z.literal("")]).default(""),
  taxId: z.string().max(40).default(""),
  address: z.string().max(300).default(""),
});
const productSchema = z.object({
  name: text,
  priceCents: z.number().int().min(0).max(100000000),
  kind: z.enum(["producto", "servicio"]),
});
const invoiceSchema = z.object({
  clientId: z.string().regex(/^[a-f0-9]{24}$/),
  dueDate: z.iso.date(),
  status: z.enum(["pendiente", "pagada"]).default("pendiente"),
  taxBps: z.number().int().min(0).max(10000),
  lines: z.array(lineSchema).min(1).max(100),
});
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const fail = (status: number, message: string) =>
  Object.assign(new Error(message), { status });
const safeUser = (u: any) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  organization: u.organization,
});
export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use("/api", security);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.get("/api/health", (_req, res) =>
  res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
    status: mongoose.connection.readyState === 1 ? "ok" : "unavailable",
  }),
);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator: clientKey,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Demasiados intentos. Espera 15 minutos." },
});
async function login(res: Response, u: any) {
  const token = randomBytes(32).toString("hex");
  await Session.create({
    token: hash(token),
    user: u._id,
    expires: new Date(Date.now() + 7 * 86400000),
  });
  res.cookie(sessionCookie(), token, {
    ...cookieOptions(),
    maxAge: 7 * 86400000,
  });
  res.json(safeUser(u));
}
app.post("/api/auth/register", limiter, async (req, res) => {
  const data = authSchema
    .extend({ name: text, organizationName: text })
    .parse(req.body);
  if (await User.exists({ email: data.email }))
    throw fail(409, "Este correo ya está registrado");
  const org = await Organization.create({ name: data.organizationName });
  let u;
  try {
    u = await User.create({
      name: data.name,
      email: data.email,
      password: await bcrypt.hash(data.password, 12),
      organization: org._id,
      role: "admin",
    });
  } catch (e) {
    await Organization.deleteOne({ _id: org._id });
    throw e;
  }
  // Session failure must not delete the organization of a successfully created user.
  await login(res, u);
});
const dummyHash = bcrypt.hashSync(randomBytes(32).toString("hex"), 12);
app.post("/api/auth/login", limiter, async (req, res) => {
  const data = authSchema.parse(req.body);
  const u = await User.findOne({ email: data.email }).select("+password");
  const matches = await bcrypt.compare(data.password, u?.password || dummyHash);
  if (!u || !matches) throw fail(401, "Correo o contraseña incorrectos");
  await login(res, u);
});
app.use("/api", async (req, res, next) => {
  try {
    const token = req.cookies[sessionCookie()];
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
      throw fail(401, "Inicia sesión");
    const s = await Session.findOne({
      token: hash(token),
      expires: { $gt: new Date() },
    });
    const u = s && (await User.findById(s.user));
    if (!u) throw fail(401, "Sesión caducada");
    res.locals.user = u;
    next();
  } catch (e) {
    next(e);
  }
});
app.post("/api/auth/logout", async (req, res) => {
  await Session.deleteOne({ token: hash(req.cookies[sessionCookie()]) });
  res.clearCookie(sessionCookie(), cookieOptions()).sendStatus(204);
});
app.get("/api/me", (_req, res) => res.json(safeUser(res.locals.user)));
app.patch("/api/me", async (req, res) => {
  const data = z.object({ name: text }).parse(req.body);
  const u = await User.findByIdAndUpdate(res.locals.user._id, data, {
    returnDocument: "after",
  });
  res.json(safeUser(u));
});
function admin(_req: Request, res: Response, next: NextFunction) {
  next(
    res.locals.user.role === "admin"
      ? undefined
      : fail(403, "Solo administradores"),
  );
}
app.get("/api/settings", async (_req, res) =>
  res.json(await Organization.findById(res.locals.user.organization)),
);
app.patch("/api/settings", admin, async (req, res) => {
  const data = z
    .object({
      name: text,
      taxBps: z.number().int().min(0).max(10000),
      address: z.string().max(300),
    })
    .parse(req.body);
  res.json(
    await Organization.findByIdAndUpdate(res.locals.user.organization, data, {
      returnDocument: "after",
      runValidators: true,
    }),
  );
});
app.get("/api/users", admin, async (_req, res) =>
  res.json(
    await User.find({ organization: res.locals.user.organization }).select(
      "name email role",
    ),
  ),
);
app.post("/api/users", admin, async (req, res) => {
  const data = authSchema
    .extend({ name: text, role: z.enum(["admin", "empleado"]) })
    .parse(req.body);
  const u = await User.create({
    ...data,
    password: await bcrypt.hash(data.password, 12),
    organization: res.locals.user.organization,
  });
  res.status(201).json(safeUser(u));
});
const resources = [
  ["clients", Client, clientSchema],
  ["products", Product, productSchema],
  ["invoices", Invoice, invoiceSchema],
] as const;
app.param("id", (req, _res, next, id) =>
  next(
    mongoose.isValidObjectId(id)
      ? undefined
      : fail(400, "Identificador inválido"),
  ),
);

for (const [path, Model, schema] of resources) {
  const model = Model as mongoose.Model<any>;
  app.get(`/api/${path}`, async (req, res) => {
    const query = z
      .object({
        q: z.string().max(100).default(""),
        page: z.coerce.number().int().min(1).max(100000).default(1),
        status: z.enum(["pendiente", "pagada"]).optional(),
      })
      .parse(req.query);
    const filter: any = { organization: res.locals.user.organization };
    if (query.q)
      filter[path === "invoices" ? "clientName" : "name"] = {
        $regex: query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    if (path === "invoices" && query.status) filter.status = query.status;
    const [items, total] = await Promise.all([
      model
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((query.page - 1) * 10)
        .limit(10),
      model.countDocuments(filter),
    ]);
    res.json({ items, total, page: query.page });
  });
  app.get(`/api/${path}/:id`, async (req, res) => {
    const item = await model.findOne({
      _id: req.params.id,
      organization: res.locals.user.organization,
    });
    if (!item) throw fail(404, "Registro no encontrado");
    res.json(item);
  });
  async function payload(req: Request, res: Response) {
    const data: any = schema.parse(req.body);
    if (path === "invoices") {
      const c = await Client.findOne({
        _id: data.clientId,
        organization: res.locals.user.organization,
      });
      if (!c) throw fail(400, "Cliente no válido");
      const org = await Organization.findById(res.locals.user.organization);
      Object.assign(data, calculate(data.lines, data.taxBps), {
        clientName: c.name,
        clientAddress: c.address,
        clientTaxId: c.taxId,
        issuerName: org?.name,
        issuerAddress: org?.address,
      });
    }
    return data;
  }
  app.post(`/api/${path}`, admin, async (req, res) => {
    const data = await payload(req, res);
    res.status(201).json(
      await model.create({
        ...data,
        organization: res.locals.user.organization,
        ...(path === "invoices"
          ? { number: `NX-${randomBytes(8).toString("hex").toUpperCase()}` }
          : {}),
      }),
    );
  });
  app.put(`/api/${path}/:id`, admin, async (req, res) => {
    const data = await payload(req, res);
    const item = await model.findOneAndUpdate(
      { _id: req.params.id, organization: res.locals.user.organization },
      data,
      { returnDocument: "after", runValidators: true },
    );
    if (!item) throw fail(404, "Registro no encontrado");
    res.json(item);
  });
  app.delete(`/api/${path}/:id`, admin, async (req, res) => {
    const scope = { organization: res.locals.user.organization };
    if (
      path === "clients" &&
      (await Invoice.exists({ ...scope, clientId: req.params.id }))
    )
      throw fail(409, "El cliente tiene facturas; no se puede eliminar");
    const item = await model.findOneAndDelete({ ...scope, _id: req.params.id });
    if (!item) throw fail(404, "Registro no encontrado");
    res.sendStatus(204);
  });
}
app.get("/api/invoices/:id/pdf", async (req, res) => {
  const i = await Invoice.findOne({
    _id: req.params.id,
    organization: res.locals.user.organization,
  });
  if (!i) throw fail(404, "Factura no encontrada");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${i.number}.pdf"`,
  );
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  const money = (v: number) => `${(v / 100).toFixed(2)} EUR`;
  doc.fontSize(24).text("NEXORA · FACTURA").moveDown();
  doc
    .fontSize(12)
    .text(i.issuerName || "")
    .text(i.issuerAddress || "")
    .moveDown()
    .text(i.number)
    .text(`Cliente: ${i.clientName}`)
    .text(i.clientAddress || "")
    .text(i.clientTaxId || "")
    .text(`Vencimiento: ${i.dueDate}`)
    .text(`Estado: ${i.status}`)
    .moveDown();
  for (const l of i.lines)
    doc.text(
      `${l.name} | ${l.quantity} x ${money(l.priceCents!)} = ${money(l.quantity! * l.priceCents!)}`,
    );
  doc
    .moveDown()
    .text(`Base: ${money(i.subtotalCents!)}`)
    .text(`Impuesto (${i.taxBps! / 100}%): ${money(i.taxCents!)}`)
    .text(`TOTAL: ${money(i.totalCents!)}`);
  doc.end();
});
app.get("/api/dashboard", async (_req, res) => {
  const scope = { organization: res.locals.user.organization };
  const now = new Date();
  const monthKeys = Array.from({ length: 6 }, (_, n) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + n, 1))
      .toISOString()
      .slice(0, 7),
  );
  const [summary, monthly, clients, products, recent] = await Promise.all([
    Invoice.aggregate([
      { $match: scope },
      {
        $group: {
          _id: null,
          invoices: { $sum: 1 },
          revenueCents: {
            $sum: { $cond: [{ $eq: ["$status", "pagada"] }, "$totalCents", 0] },
          },
          pendingCents: {
            $sum: {
              $cond: [{ $eq: ["$status", "pendiente"] }, "$totalCents", 0],
            },
          },
        },
      },
    ]),
    Invoice.aggregate([
      {
        $match: {
          ...scope,
          status: "pagada",
          createdAt: { $gte: new Date(monthKeys[0] + "-01T00:00:00Z") },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          ingresos: { $sum: "$totalCents" },
        },
      },
    ]),
    Client.countDocuments(scope),
    Product.countDocuments(scope),
    Invoice.find(scope)
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .select("number clientName dueDate totalCents status createdAt"),
  ]);
  const totals = summary[0] || {
    invoices: 0,
    revenueCents: 0,
    pendingCents: 0,
  };
  res.json({
    invoices: totals.invoices,
    revenueCents: totals.revenueCents,
    pendingCents: totals.pendingCents,
    clients,
    products,
    recent,
    months: monthKeys.map((month) => ({
      month,
      ingresos: (monthly.find((m) => m._id === month)?.ingresos || 0) / 100,
    })),
  });
});
app.use("/api", (_req, res) =>
  res.status(404).json({ message: "Ruta no encontrada" }),
);
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;
  const status =
    err instanceof z.ZodError || err instanceof RangeError
      ? 400
      : err.code === 11000
        ? 409
        : err.status || 500;
  if (status === 500) console.error("API error:", err.name);
  res.status(status).json({
    message:
      err.type === "entity.parse.failed"
        ? "JSON no válido"
        : status === 413
          ? "Solicitud demasiado grande"
          : err instanceof z.ZodError
            ? err.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("; ")
            : status === 500
              ? "Error interno"
              : status === 409
                ? "Registro duplicado o relacionado"
                : err.message,
  });
});
