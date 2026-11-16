import express from "express";
import request from "supertest";
import { describe, it, expect, afterEach, vi } from "vitest";
import {
  security,
  validateEnvironment,
  clientKey,
  cookieOptions,
  sessionCookie,
} from "./security.js";
const secret = "test-proxy-secret-with-at-least-32-characters";
const origin = "https://nexora-test.example";
afterEach(() => vi.unstubAllEnvs());
function app() {
  const a = express();
  a.use("/api", security);
  a.all("/api/{*path}", (_req, res) => res.json({ ok: true }));
  return a;
}
describe("Frontera de producción", () => {
  it("exige un origen HTTPS exacto, Atlas separado y secreto de proxy", () => {
    const env = {
      NODE_ENV: "production",
      APP_ORIGIN: origin,
      MONGODB_URI: "mongodb+srv://test:demo@cluster.example/nexora_production",
      API_PROXY_SECRET: secret,
    };
    expect(() => validateEnvironment(env)).not.toThrow();
    expect(() =>
      validateEnvironment({
        ...env,
        MONGODB_URI: "mongodb+srv://demo:NEVER-LOG@[invalid/nexora_production",
      }),
    ).toThrow("MONGODB_URI no válida");
    for (const patch of [
      { APP_ORIGIN: "http://localhost:5173" },
      { APP_ORIGIN: origin + "/" },
      { API_PROXY_SECRET: "" },
      { MONGODB_URI: "mongodb://localhost/nexora" },
      { MONGODB_URI: "mongodb+srv://cluster.example/nexora_production_other" },
    ])
      expect(() => validateEnvironment({ ...env, ...patch })).toThrow();
  });
  it("solo deja público el health check y rechaza acceso directo a la API", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_PROXY_SECRET", secret);
    vi.stubEnv("APP_ORIGIN", origin);
    expect((await request(app()).get("/api/health")).status).toBe(200);
    expect((await request(app()).get("/api/me")).status).toBe(403);
    expect(
      (await request(app()).get("/api/me").set("x-nexora-proxy-secret", secret))
        .status,
    ).toBe(400);
    expect(
      (
        await request(app())
          .get("/api/me")
          .set("x-nexora-proxy-secret", secret)
          .set("x-nexora-client-ip", "203.0.113.1")
      ).status,
    ).toBe(200);
  });
  it("bloquea CSRF, preflight y contenido no JSON", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_PROXY_SECRET", secret);
    vi.stubEnv("APP_ORIGIN", origin);
    const send = () =>
      request(app())
        .post("/api/me")
        .set("x-nexora-proxy-secret", secret)
        .set("x-nexora-client-ip", "203.0.113.1");
    expect((await send().send({})).status).toBe(403);
    expect(
      (await send().set("Origin", "https://evil.example").send({})).status,
    ).toBe(403);
    expect(
      (await send().set("Origin", origin).type("form").send("name=x")).status,
    ).toBe(415);
    expect(
      (await send().set("Origin", origin).send({ name: "Demo" })).status,
    ).toBe(200);
  });
  it("usa cookie __Host segura y separa claves por IP autenticada", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(sessionCookie()).toBe("__Host-nexora");
    expect(cookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    const req = (ip: string) =>
      ({
        get: (header: string) =>
          header === "x-nexora-client-ip" ? ip : undefined,
      }) as unknown as express.Request;
    expect(clientKey(req("203.0.113.1"))).not.toBe(
      clientKey(req("203.0.113.2")),
    );
    expect(clientKey(req("2001:db8:1::1"))).toBe(
      clientKey(req("2001:db8:1::2")),
    );
  });
});
