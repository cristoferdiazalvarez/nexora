# Estado de NEXORA — 16 de noviembre de 2026

## Preparación completada y comprobada localmente

- Auditoría del repositorio, README y aplicación real. Ningún otro proyecto local modificado.
- Proxy Vercel de servidor con upstream por entorno, secreto privado, filtrado de encabezados y transmisión de cookie/PDF. Sin dominio de ejemplo en la configuración ejecutable.
- API endurecida: validación de entorno, cookie __Host segura, CSRF/origen exacto, acceso directo a Render bloqueado salvo health, rate limit por IP autenticada, errores sin cuerpos y compensación de registro corregida.
- Cálculo intermedio BigInt y dashboard agregado en MongoDB.
- `npm run lint`: aprobado, incluyendo TypeScript en web, API, función y scripts.
- `npm test`: **19 pruebas aprobadas** de unidad/integración y seguridad/proxy con MongoDB temporal. No son pruebas de un despliegue remoto.
- `npm run build`: aprobado; frontend y API compilados.
- `npm run test:e2e`: **2 flujos aprobados** contra el build local: navegador/axe en claro, oscuro y móvil, persistencia, login/logout; HTTP con CRUD, filtros, paginación, importes, PDF, dos organizaciones y empleado.
- `npm run screenshots`: cuatro imágenes reales del build con datos ficticios y manifiesto SHA-256.
- Auditoría npm: cero vulnerabilidades reportadas en la revisión. Escáner de publicación aprobado, `.env` y `.local` excluidos.
- GitHub Actions ampliado para unidad/integración y navegador con MongoDB y Chromium. Resultado remoto se registrará después del push.

## Servicios y publicación

- Repositorio nuevo y público confirmado: https://github.com/cristoferdiazalvarez/nexora . Código pendiente de push final revisado.
- GitHub: sesión existente comprobada, sin mostrar ni guardar tokens.
- Vercel, Render y MongoDB Atlas: conexiones no disponibles en la comprobación inicial; el usuario ha indicado que va a conectar los tres. Eso no confirma todavía una conexión completada.
- **No hay demo pública de NEXORA ni resultados de producción.** No se han creado proyectos/servicios/clusters remotos ni habilitado facturación.
- No se ha añadido la tarjeta al portfolio: depende de verificar la aplicación pública.
- Portfolio existente: https://developer-portfolio-plum-mu.vercel.app responde HTTP 200 por HTTPS. Código y despliegue intactos.

## Continuación pendiente

1. Confirmar conexiones y planes gratuitos reales de Vercel, Render y Atlas.
2. Crear únicamente recursos NEXORA: Vercel Hobby, Render free y Atlas Free/M0 con base `nexora_production`; sin backups opcionales ni addons de pago.
3. Configurar variables privadas y allowlist Atlas limitada a la salida de Render.
4. Desplegar, ejecutar las pruebas sobre HTTPS público y comprobar cookies, SPA, persistencia, errores y permisos reales.
5. Solo después añadir la tarjeta al portfolio y volver a verificar los proyectos existentes.

[Plan de despliegue](docs/DEPLOYMENT.md) · [Auditoría y límites](docs/SECURITY.md) · [Arranque](README.md).
