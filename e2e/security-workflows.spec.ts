import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
test("API pública: CRUD, filtros, paginación, PDF, roles y aislamiento de empresas", async ({
  playwright,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Falta URL de prueba");
  const contexts: APIRequestContext[] = [];
  const context = async () => {
    const ctx = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Origin: baseURL },
    });
    contexts.push(ctx);
    return ctx;
  };
  const suffix = randomBytes(8).toString("hex");
  const password = randomBytes(24).toString("base64url");
  const account = (tag: string) => ({
    email: `qa-${tag}-${suffix}@example.com`,
    password,
    name: "Usuario de pruebas",
    organizationName: `Empresa ficticia ${tag} ${suffix}`,
  });
  try {
    const a = await context(),
      b = await context(),
      employee = await context();
    expect((await a.get("/api/health")).status()).toBe(200);
    expect((await a.get("/api/clients")).status()).toBe(401);
    expect(
      (await a.post("/api/auth/register", { data: account("a") })).status(),
    ).toBe(200);
    expect(
      (await b.post("/api/auth/register", { data: account("b") })).status(),
    ).toBe(200);
    const created = await a.post("/api/clients", {
      data: { name: "Cliente [A] de prueba", email: "cliente@example.com" },
    });
    expect(created.status()).toBe(201);
    const client = await created.json();
    for (const method of ["get", "put", "delete"] as const) {
      const response = await b[method](
        `/api/clients/${client._id}`,
        method === "put" ? { data: { name: "Modificación ajena" } } : {},
      );
      expect(response.status()).toBe(404);
    }
    expect((await (await b.get("/api/clients")).json()).total).toBe(0);
    expect((await (await a.get("/api/clients?q=%5BA%5D")).json()).total).toBe(
      1,
    );
    expect((await (await a.get("/api/clients?q=%2E%2A")).json()).total).toBe(0);
    for (let n = 0; n < 11; n++)
      expect(
        (
          await a.post("/api/clients", {
            data: { name: `Cliente adicional ${n}` },
          })
        ).status(),
      ).toBe(201);
    expect(
      (await (await a.get("/api/clients?page=1")).json()).items,
    ).toHaveLength(10);
    expect(
      (await (await a.get("/api/clients?page=2")).json()).items,
    ).toHaveLength(2);
    const product = {
      name: "Servicio de prueba",
      kind: "servicio",
      priceCents: 999,
    };
    const p = await a.post("/api/products", { data: product });
    expect(p.status()).toBe(201);
    const productId = (await p.json())._id;
    expect((await b.get(`/api/products/${productId}`)).status()).toBe(404);
    expect(
      (
        await a.put(`/api/products/${productId}`, {
          data: { ...product, priceCents: 1001 },
        })
      ).status(),
    ).toBe(200);
    const invoice = {
      clientId: client._id,
      dueDate: "2026-12-01",
      taxBps: 2100,
      lines: [{ name: "Servicio ficticio", quantity: 3, priceCents: 999 }],
    };
    expect((await b.post("/api/invoices", { data: invoice })).status()).toBe(
      400,
    );
    const issued = await a.post("/api/invoices", {
      data: { ...invoice, totalCents: 1 },
    });
    expect(issued.status()).toBe(201);
    const i = await issued.json();
    expect(i.totalCents).toBe(3626);
    const pdf = await a.get(`/api/invoices/${i._id}/pdf`);
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
    expect((await b.get(`/api/invoices/${i._id}/pdf`)).status()).toBe(404);
    expect((await a.delete(`/api/clients/${client._id}`)).status()).toBe(409);
    expect(
      (await (await a.get("/api/invoices?status=pendiente")).json()).total,
    ).toBe(1);
    expect((await (await a.get("/api/dashboard")).json()).pendingCents).toBe(
      3626,
    );
    expect(
      (
        await a.put(`/api/invoices/${i._id}`, {
          data: { ...invoice, status: "pagada" },
        })
      ).status(),
    ).toBe(200);
    expect(
      (await (await a.get("/api/invoices?status=pagada")).json()).total,
    ).toBe(1);
    expect((await (await a.get("/api/dashboard")).json()).revenueCents).toBe(
      3626,
    );
    expect(
      (
        await a.post("/api/users", {
          data: { ...account("employee"), role: "empleado" },
        })
      ).status(),
    ).toBe(201);
    expect(
      (
        await employee.post("/api/auth/login", { data: account("employee") })
      ).status(),
    ).toBe(200);
    expect((await employee.get("/api/clients")).status()).toBe(200);
    expect(
      (
        await employee.post("/api/clients", { data: { name: "No permitido" } })
      ).status(),
    ).toBe(403);
    expect((await employee.delete(`/api/invoices/${i._id}`)).status()).toBe(
      403,
    );
    expect(
      (
        await employee.patch("/api/settings", {
          data: { name: "Cambio", address: "", taxBps: 0 },
        })
      ).status(),
    ).toBe(403);
    expect((await employee.get("/api/users")).status()).toBe(403);
    expect((await a.delete(`/api/invoices/${i._id}`)).status()).toBe(204);
    expect((await a.delete(`/api/products/${productId}`)).status()).toBe(204);
    expect((await a.delete(`/api/clients/${client._id}`)).status()).toBe(204);
    expect((await a.post("/api/auth/logout")).status()).toBe(204);
    expect((await a.get("/api/me")).status()).toBe(401);
  } finally {
    for (const c of contexts) await c.dispose();
  }
});
