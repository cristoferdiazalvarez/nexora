# Estado de NEXORA — 16 de noviembre de 2026

## Avance verificado del despliegue (2026-11-16T14:40:08+00:00)

- **Acceso resuelto:** autorizadas y verificadas las CLI oficiales de Vercel, Render y Atlas mediante OAuth de navegador. Las herramientas MCP de ChatGPT no se comparten con esta sesión; las CLI son el acceso efectivo. No se han mostrado ni solicitado tokens.
- **Vercel:** equipo `team_RFmdLv4e0loTRKHyBvaMkwg4`, plan Hobby comprobado; creado únicamente el proyecto `nexora` (`prj_zXL4sOLxdNqp3FUYTd5TtCelQjTZ`), Node 24, Vite y build del monorepo. Dominio reservado: `https://nexora-eta-steel.vercel.app`. **Todavía no desplegado ni verificado como aplicación.**
- **Atlas:** creado proyecto independiente `NEXORA` (`6afb12b6dd7784eb4af5e761`) y cluster `nexora-production` (`6afb1316a081cca2efd70a0a`), AWS EU_CENTRAL_1, M0, 0,5 GB, MongoDB 8, estado IDLE, backups y PIT desactivados. `Project 0 / Cluster0` no se han reutilizado ni modificado. No se ha creado todavía usuario de aplicación ni abierto acceso de red.
- **Render:** OAuth verificado y seleccionado el único workspace disponible (`tea-dbd1p1vavr4c7395fcj0`, My Workspace). Sus dos servicios anteriores se han consultado sin cambios. El Blueprint NEXORA ha sido validado por Render. **No se ha creado la API.**
- **Comprobación pendiente de Render:** la API pública no expone saldo de horas Free ni métodos de pago. Se abrió Billing → Monthly Included Usage y se solicitaron horas restantes/usadas de 750 y ausencia de método de pago. El dato recibido, Credit Balance $0.00, es saldo de crédito y no responde a esas dos comprobaciones. La creación de API espera únicamente esa información para evitar cargos o afectar la cuota de servicios existentes.
- Exclusiones de `.env`, `.local`, `.vercel` y archivos generados preparadas para el upload. Los cambios anteriores de documentación se conservan debajo como historial; este apartado los actualiza.
- No se han activado suscripciones, tarjetas ni recursos de pago. La app pública, los secretos de producción, sus pruebas y la tarjeta de portfolio continúan pendientes de completar la API.

## Historial anterior a la autorización CLI


## Preparación completada y comprobada localmente

- Auditoría del repositorio, README y aplicación real. Ningún otro proyecto local modificado.
- Proxy Vercel de servidor con upstream por entorno, secreto privado, filtrado de encabezados y transmisión de cookie/PDF. Sin dominio de ejemplo en la configuración ejecutable.
- API endurecida: validación de entorno, cookie __Host segura, CSRF/origen exacto, acceso directo a Render bloqueado salvo health, rate limit por IP autenticada, errores sin cuerpos y compensación de registro corregida.
- Cálculo intermedio BigInt y dashboard agregado en MongoDB.
- `npm run lint`: aprobado, incluyendo TypeScript en web, API, función y scripts.
- `npm test`: **20 pruebas aprobadas** de unidad/integración y seguridad/proxy con MongoDB temporal. No son pruebas de un despliegue remoto.
- `npm run build`: aprobado; frontend y API compilados.
- `npm run test:e2e`: **2 flujos aprobados** contra el build local: navegador/axe en claro, oscuro y móvil, persistencia, login/logout; HTTP con CRUD, filtros, paginación, importes, PDF, dos organizaciones y empleado.
- `npm run screenshots`: cuatro imágenes reales del build con datos ficticios y manifiesto SHA-256.
- Auditoría npm: cero vulnerabilidades reportadas en la revisión. Escáner de publicación aprobado, `.env` y `.local` excluidos.
- GitHub Actions ampliado para unidad/integración y navegador con MongoDB y Chromium. Primera CI remota: unidad, lint y build aprobados; E2E detectó contraste durante la transición de un toast. Corrección aplicada: colores accesibles propios de notificaciones, mensajes expandidos y pruebas con movimiento reducido, sin excluir reglas axe. La CI del commit de corrección `e7b34480f4a479e85a72f1e4878291d1e67b09f9` ha terminado con éxito: https://github.com/cristoferdiazalvarez/nexora/actions/runs/43867473883 .

## Servicios y publicación

- Repositorio nuevo y público confirmado: https://github.com/cristoferdiazalvarez/nexora . Código publicado en `main`; commit inicial `b020e52966eb09be38a668013ada0ebbe59fc8f2`.
- GitHub: sesión existente comprobada, sin mostrar ni guardar tokens.
- Vercel, Render y MongoDB Atlas: comprobación actual sin conectores disponibles ni CLI (`vercel`, `render`, `atlas`) instalada. Las herramientas de nube disponibles son para Azure; no se pudo consultar la sesión, plan, cuotas o recursos de estas cuentas. El usuario indica Vercel Hobby, acceso al workspace de Render y Atlas `Project 0 / Cluster0` Free en AWS `EU_WEST_3`; no se verificó directamente y esos recursos de Atlas quedan explícitamente fuera de alcance. No se abrió OAuth ni se intentó evitar el bloqueo de interacción del navegador. Falta el acceso oficial a cada cuenta para consultar cuotas y gestionar solo recursos nuevos de NEXORA.
- **No hay demo pública de NEXORA ni resultados de producción.** No se han creado proyectos/servicios/clusters remotos ni habilitado facturación.
- No se ha añadido la tarjeta al portfolio: depende de verificar la aplicación pública.
- Portfolio existente: https://developer-portfolio-plum-mu.vercel.app responde HTTP 200 por HTTPS. Código y despliegue intactos. Comprobadas ambas páginas ES/EN en Chrome a 1440 y 390 píxeles, sin errores JavaScript ni overflow.

## Continuación pendiente

1. Autorizar Vercel, Render y Atlas desde sus conexiones oficiales, limitando el acceso al proyecto/servicio/cluster nuevos de NEXORA; confirmar que cada cuenta permite el plan gratuito sin tarjeta, trial convertible ni facturación.
2. Crear únicamente recursos NEXORA: Vercel Hobby, Render free y Atlas Free/M0 con base `nexora_production`; sin backups opcionales ni addons de pago.
3. Configurar variables privadas y allowlist Atlas limitada a la salida de Render.
4. Desplegar, ejecutar las pruebas sobre HTTPS público y comprobar cookies, SPA, persistencia, errores y permisos reales.
5. Solo después añadir la tarjeta al portfolio y volver a verificar los proyectos existentes.

[Plan de despliegue](docs/DEPLOYMENT.md) · [Auditoría y límites](docs/SECURITY.md) · [Arranque](README.md).

La verificación remota de GitHub Actions usa Node 24, MongoDB y Chromium en un runner Linux estándar. **CI aprobada no equivale a despliegue en producción.** La documentación posterior no cambia el código probado. Servidores locales de verificación cerrados al finalizar; los datos demo quedan conservados.
