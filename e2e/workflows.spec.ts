import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
test("registro, clientes, catálogo, factura, PDF y perfil", async ({
  page,
}) => {
  const suffix = Date.now();
  const email = `test${suffix}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("response", (res) => {
    if (res.status() >= 500)
      browserErrors.push(`${res.status()} ${new URL(res.url()).pathname}`);
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Crear una organización" }).click();
  await page.getByLabel("Tu nombre").fill("Alex Pruebas");
  await page
    .getByLabel("Empresa", { exact: true })
    .fill(`Empresa E2E ${suffix}`);
  const loginAccessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(loginAccessibility.violations).toEqual([]);
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Crear organización", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hola, Alex 👋" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Cliente E2E");
  await page.getByLabel("Correo", { exact: true }).fill("cliente@example.com");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByRole("cell", { name: "Cliente E2E", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("cell", { name: "Cliente E2E", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar registro" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Cliente actualizado");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByRole("cell", { name: "Cliente actualizado", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Productos y servicios", exact: true })
    .click();
  await page.getByRole("button", { name: "Nuevo producto" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Servicio E2E");
  await page.getByLabel("Precio en céntimos").fill("15000");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByRole("cell", { name: "Servicio E2E", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Facturas", exact: true }).click();
  await page.getByRole("button", { name: "Nueva factura" }).click();
  await page
    .getByRole("combobox", { name: "Cliente", exact: true })
    .selectOption({ label: "Cliente actualizado" });
  await page.getByLabel("Vencimiento", { exact: true }).fill("2026-12-01");
  await page.getByLabel("Descripción").fill("Desarrollo web");
  await page.getByLabel("Unidades").fill("2");
  await page.getByLabel("Céntimos/unidad").fill("15000");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("cell", { name: "363,00 €" })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Descargar PDF" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/NX-.*\.pdf/);
  await page.getByRole("button", { name: "Editar registro" }).click();
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("pagada");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("● Pagada", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Resumen", exact: true }).click();
  await expect(
    page.getByText("363,00 €", { exact: true }).first(),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Cambiar tema" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("link", { name: "Configuración", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Configuración", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Nombre", exact: true })
    .first()
    .fill("Alex Actualizado");
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Alex Actualizado" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "Resumen", exact: true }).click();
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: ".local/dashboard.png", fullPage: true });
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByRole("heading", { name: "Tu espacio de trabajo" }),
  ).toBeVisible();
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hola, Alex 👋" }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});
