import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { Request, Response, NextFunction } from "express";
import { ipKeyGenerator } from "express-rate-limit";
export const production = () => process.env.NODE_ENV === "production";
export const sessionCookie = () => (production() ? "__Host-nexora" : "session");
export const cookieOptions = () => ({
  httpOnly: true,
  secure: production(),
  sameSite: "lax" as const,
  path: "/",
});
function matchesSecret(received: string, expected: string) {
  const a = Buffer.from(received),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function security(req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET" && req.path === "/health") return next();
  if (production()) {
    const expected = process.env.API_PROXY_SECRET;
    if (!expected || expected.length < 32)
      return res.status(503).json({ message: "Servicio sin configurar" });
    if (!matchesSecret(req.get("x-nexora-proxy-secret") || "", expected))
      return res.status(403).json({ message: "Acceso no permitido" });
    if (!isIP(req.get("x-nexora-client-ip") || ""))
      return res.status(400).json({ message: "Origen de solicitud inválido" });
  }
  if (req.method === "OPTIONS")
    return res
      .status(405)
      .json({ message: "Acceso entre orígenes no permitido" });
  const mutating = !["GET", "HEAD"].includes(req.method);
  const origin = req.get("origin");
  if (
    mutating &&
    ((origin && origin !== process.env.APP_ORIGIN) || (production() && !origin))
  ) {
    return res.status(403).json({ message: "Origen no permitido" });
  }
  if (
    mutating &&
    (Number(req.get("content-length")) > 0 || req.get("transfer-encoding")) &&
    !req.is("application/json")
  ) {
    return res.status(415).json({ message: "Se requiere application/json" });
  }
  next();
}
export function clientKey(req: Request) {
  const ip = production() ? req.get("x-nexora-client-ip") : req.ip;
  return ipKeyGenerator(ip || "127.0.0.1");
}
export function validateEnvironment(env: NodeJS.ProcessEnv) {
  const origin = new URL(env.APP_ORIGIN || "");
  if (origin.origin !== env.APP_ORIGIN || origin.username || origin.password)
    throw new Error(
      "APP_ORIGIN debe ser un origen exacto, sin ruta ni credenciales",
    );
  if (!env.MONGODB_URI) throw new Error("Falta MONGODB_URI");
  if (env.NODE_ENV === "production") {
    if (origin.protocol !== "https:")
      throw new Error("APP_ORIGIN debe usar HTTPS");
    if (!env.API_PROXY_SECRET || env.API_PROXY_SECRET.length < 32)
      throw new Error("Falta API_PROXY_SECRET seguro");
    if (
      !env.MONGODB_URI.startsWith("mongodb+srv://") ||
      new URL(env.MONGODB_URI).pathname !== "/nexora_production"
    )
      throw new Error(
        "Producción requiere Atlas y base nexora_production separada",
      );
  }
}
