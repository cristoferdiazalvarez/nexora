import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { app } from "./app.js";
import { calculate } from "./money.js";
import { Session, Organization, User } from "./models.js";
let mongo: MongoMemoryServer;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 120000);
afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
const account = (email: string) => ({
  email,
  password: "Testing-password-123!",
  name: "Demo",
  organizationName: "Demo company",
});
describe("Importes", () => {
  it("redondea impuestos en céntimos", () =>
    expect(
      calculate([{ name: "Servicio", quantity: 3, priceCents: 999 }], 2100),
    ).toEqual({ subtotalCents: 2997, taxCents: 629, totalCents: 3626 }));
  it("rechaza desbordamiento", () =>
    expect(() =>
      calculate(
        [{ name: "X", quantity: Number.MAX_SAFE_INTEGER, priceCents: 100 }],
        2100,
      ),
    ).toThrow());
});
describe("API multitenant", () => {
  it("no revela cuerpos JSON inválidos ni acepta cookies malformadas", async () => {
    const invalid = await request(app)
      .post("/api/auth/login")
      .type("json")
      .send('{"password":"NEVER-ECHO-THIS",');
    expect(invalid.status).toBe(400);
    expect(invalid.body.message).toBe("JSON no válido");
    expect(invalid.text).not.toContain("NEVER-ECHO-THIS");
    expect(
      (await request(app).get("/api/me").set("Cookie", "session=j:[]")).status,
    ).toBe(401);
  });
  it("conserva cuenta y organización si falla la creación de sesión", async () => {
    vi.spyOn(Session, "create").mockRejectedValueOnce(
      new Error("session unavailable"),
    );
    expect(
      (
        await request(app)
          .post("/api/auth/register")
          .send(account("session-failure@example.com"))
      ).status,
    ).toBe(500);
    const user = await User.findOne({ email: "session-failure@example.com" });
    expect(user).not.toBeNull();
    expect(await Organization.exists({ _id: user!.organization })).toBeTruthy();
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .send(account("session-failure@example.com"))
      ).status,
    ).toBe(200);
  });
  it("emite y revoca cookies de producción, limita login y rechaza sesiones caducadas", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "https://nexora-test.example");
    vi.stubEnv(
      "API_PROXY_SECRET",
      "test-proxy-secret-with-more-than-32-characters",
    );
    const headers = {
      Origin: "https://nexora-test.example",
      "x-nexora-proxy-secret": process.env.API_PROXY_SECRET!,
      "x-nexora-client-ip": "203.0.113.42",
    };
    const registered = await request(app)
      .post("/api/auth/register")
      .set(headers)
      .send(account("secure@example.com"));
    expect(registered.status).toBe(200);
    const cookies = registered.headers["set-cookie"] as unknown as string[];
    expect(cookies[0]).toMatch(/^__Host-nexora=/);
    expect(cookies[0]).toContain("Secure");
    expect(cookies[0]).toContain("HttpOnly");
    expect(cookies[0]).toContain("SameSite=Lax");
    const cookie = cookies[0].split(";")[0];
    expect(
      (await request(app).get("/api/me").set(headers).set("Cookie", cookie))
        .status,
    ).toBe(200);
    await Session.updateMany(
      { user: registered.body.id },
      { expires: new Date(0) },
    );
    expect(
      (await request(app).get("/api/me").set(headers).set("Cookie", cookie))
        .status,
    ).toBe(401);
    for (let n = 0; n < 19; n++)
      expect(
        (await request(app).post("/api/auth/login").set(headers).send({}))
          .status,
      ).toBe(400);
    expect(
      (await request(app).post("/api/auth/login").set(headers).send({})).status,
    ).toBe(429);
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .set({ ...headers, "x-nexora-client-ip": "203.0.113.43" })
          .send({})
      ).status,
    ).toBe(400);
  });
  it("completa CRUD, búsqueda literal, paginación y validación de catálogo", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(account("catalog@example.com"));
    const product = {
      name: "Servicio [especial]",
      kind: "servicio",
      priceCents: 1250,
    };
    const created = await agent
      .post("/api/products")
      .send({ ...product, organization: "000000000000000000000000" });
    expect(created.status).toBe(201);
    expect((await agent.get("/api/products?q=%5Bespecial%5D")).body.total).toBe(
      1,
    );
    expect((await agent.get("/api/products?page=2")).body.items).toHaveLength(
      0,
    );
    expect((await agent.get("/api/products?page=0")).status).toBe(400);
    expect(
      (
        await agent
          .put(`/api/products/${created.body._id}`)
          .send({ ...product, priceCents: 1001 })
      ).body.priceCents,
    ).toBe(1001);
    expect(
      (await agent.post("/api/products").send({ ...product, priceCents: 1.5 }))
        .status,
    ).toBe(400);
    expect(
      (await agent.delete(`/api/products/${created.body._id}`)).status,
    ).toBe(204);
    expect((await agent.get(`/api/products/${created.body._id}`)).status).toBe(
      404,
    );
    expect((await agent.get("/api/products/invalid")).status).toBe(400);
    const settings = await agent
      .patch("/api/settings")
      .send({ name: "Empresa demo", address: "Demo", taxBps: 700 });
    expect(settings.body.taxBps).toBe(700);
  });
  it("exige autenticación", async () => {
    expect((await request(app).get("/api/clients")).status).toBe(401);
  });
  it("aísla organizaciones, calcula importes y respeta roles", async () => {
    const a = request.agent(app),
      b = request.agent(app),
      employee = request.agent(app);
    expect(
      (await a.post("/api/auth/register").send(account("a@example.com")))
        .status,
    ).toBe(200);
    expect(
      (await b.post("/api/auth/register").send(account("b@example.com")))
        .status,
    ).toBe(200);
    const c = await a.post("/api/clients").send({ name: "Cliente demo" });
    expect(c.status).toBe(201);
    expect((await b.get(`/api/clients/${c.body._id}`)).status).toBe(404);
    expect(
      (await b.put(`/api/clients/${c.body._id}`).send({ name: "Intrusión" }))
        .status,
    ).toBe(404);
    expect((await b.delete(`/api/clients/${c.body._id}`)).status).toBe(404);
    expect((await b.get("/api/clients")).body.total).toBe(0);
    const payload = {
      clientId: c.body._id,
      dueDate: "2026-12-01",
      taxBps: 2100,
      lines: [{ name: "Desarrollo", quantity: 2, priceCents: 1000 }],
      totalCents: 1,
    };
    expect((await b.post("/api/invoices").send(payload)).status).toBe(400);
    const invoice = await a.post("/api/invoices").send(payload);
    expect(invoice.status).toBe(201);
    expect(invoice.body.totalCents).toBe(2420);
    expect((await b.get(`/api/invoices/${invoice.body._id}/pdf`)).status).toBe(
      404,
    );
    expect(
      (await a.get(`/api/invoices/${invoice.body._id}/pdf`)).headers[
        "content-type"
      ],
    ).toContain("application/pdf");
    expect((await a.delete(`/api/clients/${c.body._id}`)).status).toBe(409);
    expect(
      (
        await a
          .post("/api/users")
          .send({ ...account("employee@example.com"), role: "empleado" })
      ).status,
    ).toBe(201);
    expect(
      (
        await employee
          .post("/api/auth/login")
          .send(account("employee@example.com"))
      ).status,
    ).toBe(200);
    expect((await employee.get("/api/clients")).body.total).toBe(1);
    expect(
      (await employee.post("/api/clients").send({ name: "No permitido" }))
        .status,
    ).toBe(403);
    expect(
      (
        await employee
          .patch("/api/settings")
          .send({ name: "Otra", address: "", taxBps: 0 })
      ).status,
    ).toBe(403);
    expect((await a.get("/api/dashboard")).body.pendingCents).toBe(2420);
    expect((await a.post("/api/auth/logout")).status).toBe(204);
    expect((await a.get("/api/me")).status).toBe(401);
  });
  it("rechaza entradas inválidas y origen externo", async () => {
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: { $ne: null }, password: "x" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .set("Origin", "https://other.example")
          .send(account("a@example.com"))
      ).status,
    ).toBe(403);
  });
});
