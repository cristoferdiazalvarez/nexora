import { createProxy } from "../scripts/proxy.js";
// This server-only function keeps cookies on the frontend origin and the API secret off the client.
export default createProxy({
  upstream: process.env.API_ORIGIN,
  secret: process.env.API_PROXY_SECRET,
  origin: process.env.APP_ORIGIN,
  production: true,
  rewritePath: true,
});
