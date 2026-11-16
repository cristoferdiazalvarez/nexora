import { chromium, expect } from "@playwright/test";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const baseURL = process.env.E2E_BASE_URL || "http://localhost:5173";
let password = process.env.SCREENSHOT_PASSWORD;
if (!password && existsSync(".local/demo-access.txt"))
  password = readFileSync(".local/demo-access.txt", "utf8").match(
    /Contraseña generada .*: (.+)/,
  )?.[1];
if (!password)
  throw new Error(
    "Faltan credenciales demo locales: define SCREENSHOT_EMAIL y SCREENSHOT_PASSWORD en un entorno privado.",
  );
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || (existsSync(chrome) ? chrome : undefined),
});
try {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const response = await context.request.post("/api/auth/login", {
    headers: { Origin: baseURL },
    data: {
      email: process.env.SCREENSHOT_EMAIL || "admin@nexora.example",
      password,
    },
  });
  if (!response.ok())
    throw new Error(
      "No se pudo acceder a la demo; no se ha capturado ninguna credencial.",
    );
  const page = await context.newPage();
  mkdirSync("docs/screenshots", { recursive: true });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Hola,/ })).toBeVisible();
  await expect(page.locator(".chart-body svg").first()).toBeVisible();
  const assets: { file: string; sha256: string }[] = [];
  const capture = async (name: string) => {
    const file = `docs/screenshots/${name}.png`;
    await page.screenshot({
      path: file,
      fullPage: true,
      animations: "disabled",
    });
    assets.push({
      file,
      sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
    });
  };
  await capture("dashboard-light");
  await page.getByRole("button", { name: "Cambiar tema" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await capture("dashboard-dark");
  await page.getByRole("button", { name: "Cambiar tema" }).click();
  await page.getByRole("link", { name: "Facturas", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await capture("invoices-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("invoices-mobile");
  writeFileSync(
    "docs/screenshots/manifest.json",
    JSON.stringify(
      {
        source:
          "Capturas reales del build local con datos ficticios del seed, no capturas de un despliegue remoto.",
        generatedAt: new Date().toISOString(),
        assets,
      },
      null,
      2,
    ) + "\n",
  );
  await context.request.post("/api/auth/logout", {
    headers: { Origin: baseURL },
  });
  console.log(
    "Cuatro capturas reales generadas. Ninguna credencial incluida en las imágenes.",
  );
} finally {
  await browser.close();
}
