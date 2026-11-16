import type { IncomingMessage, ServerResponse } from "node:http";
import { isIP } from "node:net";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
export type ProxyConfig = {
  upstream?: string;
  secret?: string;
  origin?: string;
  production: boolean;
  rewritePath?: boolean;
};
export function createProxy(config: ProxyConfig) {
  return async (
    req: IncomingMessage & {
      body?: unknown;
      query?: Record<string, string | string[]>;
    },
    res: ServerResponse,
  ) => {
    const error = (status: number, message: string) => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify({ message }));
    };
    if (
      !config.upstream ||
      !config.secret ||
      config.secret.length < 32 ||
      !config.origin
    )
      return error(503, "Servicio sin configurar");
    let upstream: URL;
    try {
      upstream = new URL(config.upstream);
      if (
        upstream.username ||
        upstream.password ||
        upstream.pathname !== "/" ||
        upstream.search ||
        upstream.hash ||
        (config.production && upstream.protocol !== "https:")
      )
        throw new Error();
    } catch {
      return error(503, "Servicio sin configurar");
    }
    if (
      !["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"].includes(
        req.method || "",
      )
    )
      return error(405, "Método no permitido");
    let raw = req.url || "";
    if (config.rewritePath) {
      const parsed = new URL(raw, "http://internal");
      const route =
        req.query?.__nexora_path ?? parsed.searchParams.get("__nexora_path");
      if (
        typeof route !== "string" ||
        !route ||
        !/^[a-zA-Z0-9/_-]+$/.test(route)
      )
        return error(400, "Ruta inválida");
      parsed.searchParams.delete("__nexora_path");
      raw = "/api/" + route + (parsed.search ? parsed.search : "");
    }
    // Reject ambiguous paths rather than letting URL normalization escape /api.
    if (!/^\/api\/[a-zA-Z0-9/_-]+(?:\?.*)?$/.test(raw))
      return error(400, "Ruta inválida");
    const url = new URL(raw, upstream);
    const incomingOrigin = req.headers.origin;
    if (incomingOrigin && incomingOrigin !== config.origin)
      return error(403, "Origen no permitido");
    const mutating = !["GET", "HEAD"].includes(req.method!);
    if (mutating && incomingOrigin !== config.origin)
      return error(403, "Origen no permitido");
    const clientIp = config.production
      ? req.headers["x-vercel-forwarded-for"]
      : req.socket.remoteAddress;
    if (typeof clientIp !== "string" || !isIP(clientIp))
      return error(400, "Origen de solicitud inválido");
    const headers: Record<string, string> = {
      "x-nexora-proxy-secret": config.secret,
      "x-nexora-client-ip": clientIp,
    };
    // Explicit allowlist prevents forwarding spoofed proxy/host headers.
    for (const key of ["cookie", "content-type", "accept", "origin"]) {
      const value = req.headers[key];
      if (typeof value === "string") headers[key] = value;
    }
    let body: Buffer | undefined;
    try {
      if (mutating) {
        if (req.body !== undefined)
          body = Buffer.isBuffer(req.body)
            ? req.body
            : Buffer.from(
                typeof req.body === "string"
                  ? req.body
                  : JSON.stringify(req.body),
              );
        else {
          const parts: Buffer[] = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 102400) return error(413, "Solicitud demasiado grande");
            parts.push(Buffer.from(chunk));
          }
          body = Buffer.concat(parts);
        }
        if (body.length > 102400)
          return error(413, "Solicitud demasiado grande");
      }
      const result = await fetch(url, {
        method: req.method,
        headers,
        body: body ? new Uint8Array(body) : undefined,
        redirect: "manual",
        signal: AbortSignal.timeout(55000),
      });
      if (result.status >= 300 && result.status < 400)
        return error(502, "Respuesta inesperada del servidor");
      res.statusCode = result.status;
      for (const key of [
        "content-type",
        "content-disposition",
        "retry-after",
        "ratelimit",
        "ratelimit-policy",
        "x-content-type-options",
      ]) {
        const value = result.headers.get(key);
        if (value) res.setHeader(key, value);
      }
      const cookies = result.headers.getSetCookie();
      if (cookies.length) res.setHeader("Set-Cookie", cookies);
      res.setHeader("Cache-Control", "no-store");
      if (!result.body || req.method === "HEAD") {
        res.end();
        return;
      }
      await pipeline(Readable.fromWeb(result.body as never), res);
    } catch {
      return error(
        502,
        "El servidor no está disponible. Inténtalo de nuevo en unos instantes.",
      );
    }
  };
}
