import { createServer, type Server } from "node:http";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import request from "supertest";
import { createProxy } from "./proxy.js";
let upstream: Server;
let upstreamUrl: string;
const secret = "proxy-test-secret-with-at-least-32-characters";
const origin = "https://nexora-test.example";
beforeAll(async () => {
  upstream = createServer(async (req, res) => {
    if (req.url?.includes("/redirect")) {
      res.writeHead(302, { Location: "https://untrusted.example" });
      res.end();
      return;
    }
    if (req.url?.includes("/pdf")) {
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="demo.pdf"',
      });
      res.end(Buffer.from("%PDF-1.4\nDemo"));
      return;
    }
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(Buffer.from(c));
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Set-Cookie": [
        "__Host-nexora=test; Path=/; Secure; HttpOnly; SameSite=Lax",
      ],
    });
    res.end(
      JSON.stringify({
        url: req.url,
        body: Buffer.concat(chunks).toString(),
        cookie: req.headers.cookie,
        secret: req.headers["x-nexora-proxy-secret"],
        clientIp: req.headers["x-nexora-client-ip"],
      }),
    );
  });
  await new Promise<void>((resolve) =>
    upstream.listen(0, "127.0.0.1", resolve),
  );
  const address = upstream.address();
  if (!address || typeof address === "string") throw new Error("No hay puerto");
  upstreamUrl = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => upstream.close(() => resolve()));
});
afterEach(() => vi.unstubAllGlobals());
const proxy = () =>
  createServer(
    createProxy({ upstream: upstreamUrl, secret, origin, production: false }),
  );
describe("Proxy seguro de Vercel", () => {
  it("resuelve la ruta reescrita de Vercel y conserva parámetros sin reenviar la clave interna", async () => {
    const rewritten = createServer(
      createProxy({
        upstream: upstreamUrl,
        secret,
        origin,
        production: false,
        rewritePath: true,
      }),
    );
    const res = await request(rewritten).get(
      "/api/index?__nexora_path=clients&q=nombre&page=2",
    );
    expect(res.status).toBe(200);
    expect(res.body.url).toBe("/api/clients?q=nombre&page=2");
    expect(
      (
        await request(
          createServer(
            createProxy({
              upstream: upstreamUrl,
              secret,
              origin,
              production: false,
              rewritePath: true,
            }),
          ),
        ).get("/api/index?__nexora_path=https://evil.example")
      ).status,
    ).toBe(400);
  });
  it("mantiene cuerpo, query y cookies y sobrescribe encabezados manipulados", async () => {
    const res = await request(proxy())
      .post("/api/auth/login?q=hola")
      .set("Origin", origin)
      .set("Cookie", "session=local")
      .set("x-nexora-proxy-secret", "forged")
      .set("x-nexora-client-ip", "forged")
      .send({ email: "test@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.url).toBe("/api/auth/login?q=hola");
    expect(res.body.body).toBe('{"email":"test@example.com"}');
    expect(res.body.secret).toBe(secret);
    expect(res.body.cookie).toBe("session=local");
    expect(res.body.clientIp).not.toBe("forged");
    expect(res.headers["set-cookie"][0]).toContain(
      "Secure; HttpOnly; SameSite=Lax",
    );
    expect(res.headers["cache-control"]).toBe("no-store");
  });
  it("transmite el PDF sin convertirlo a JSON", async () => {
    const res = await request(proxy()).get("/api/invoices/demo/pdf");
    expect(res.status).toBe(200);
    expect(res.body.toString()).toContain("%PDF");
    expect(res.headers["content-disposition"]).toContain("demo.pdf");
  });
  it("rechaza origen externo, ausencia de origen, rutas ambiguas y redirects", async () => {
    expect(
      (
        await request(proxy())
          .post("/api/me")
          .set("Origin", "https://evil.example")
          .send({})
      ).status,
    ).toBe(403);
    expect((await request(proxy()).post("/api/me").send({})).status).toBe(403);
    expect((await request(proxy()).get("/api/%2e%2e/secret")).status).toBe(400);
    expect((await request(proxy()).get("/api/redirect")).status).toBe(502);
    expect((await request(proxy()).options("/api/me")).status).toBe(405);
  });
  it("no acepta HTTP de producción ni solicitudes sin IP de la plataforma", async () => {
    const invalid = createServer(
      createProxy({ upstream: upstreamUrl, secret, origin, production: true }),
    );
    expect((await request(invalid).get("/api/health")).status).toBe(503);
    const production = createServer(
      createProxy({
        upstream: "https://api-test.example",
        secret,
        origin,
        production: true,
      }),
    );
    expect((await request(production).get("/api/health")).status).toBe(400);
  });
  it("no revela configuración ni secretos cuando falla el servidor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("sensitive " + secret)),
    );
    const res = await request(proxy()).get("/api/health");
    expect(res.status).toBe(502);
    expect(res.text).not.toContain(secret);
  });
  it("limita cuerpos y falla cerrado si falta configuración", async () => {
    expect(
      (
        await request(proxy())
          .post("/api/clients")
          .set("Origin", origin)
          .send({ name: "x".repeat(103000) })
      ).status,
    ).toBe(413);
    expect(
      (
        await request(createServer(createProxy({ production: true }))).get(
          "/api/health",
        )
      ).status,
    ).toBe(503);
  });
});
