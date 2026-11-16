# Auditoría de seguridad

## Fronteras de confianza

El backend obtiene usuario y organización de la sesión, nunca del cuerpo. Todas las operaciones de clientes, catálogo, facturas, PDF, equipo, configuración y estadísticas se limitan a ese contexto. Modificar una URL o enviar `organization`/`role` en el CRUD no otorga permisos. Admin y empleado se comprueban también en el servidor.

En producción, Render valida el secreto del proxy con comparación de tiempo constante antes de confiar en la IP reenviada. La función Vercel toma `x-vercel-forwarded-for`, sustituye los encabezados internos y no transmite encabezados arbitrarios. No hay `trust proxy=true`. La función fija el upstream en una variable de servidor, rechaza rutas ambiguas y redirects, limita cuerpos, conserva cookies/PDF y devuelve errores genéricos. No es un proxy abierto. Solo el health check es público en Render.

Vercel documenta que sus encabezados de IP son generados por la plataforma: [request headers](https://vercel.com/docs/headers/request-headers). La frontera se comprobó en producción: el proxy público permite los flujos autorizados y Render rechaza el acceso directo a /api/me con 403. Las dos suites E2E públicas verifican roles y aislamiento entre organizaciones. La cookie real Secure/HttpOnly/SameSite=Lax y su revocación se comprobaron en Chromium.

## Cookies, CSRF y CORS

Cookie de producción `__Host-nexora`: Secure, HttpOnly, SameSite=Lax, Path=/ y sin Domain. El navegador solo llama al origen web. La función Vercel transmite Set-Cookie y Cookie sin poner tokens en JavaScript. Se rechazan operaciones de escritura con origen ausente o diferente; JSON obligatorio cuando existe cuerpo. No se habilitan credenciales CORS, comodines ni cookies SameSite=None.

Las variables privadas son `MONGODB_URI` y `API_PROXY_SECRET`. No deben incluirse en variables `VITE_*`, capturas, logs, commits o mensajes. Rotar un secreto de proxy requiere actualizar Vercel y Render conjuntamente. Un secreto comprometido no sustituye una sesión de usuario, pero permite alcanzar la frontera autenticada del backend y debe rotarse inmediatamente.

## Hallazgos corregidos en esta revisión

1. Dominio placeholder de API: sustituido por función de proxy configurada desde variables de servidor.
2. Rate limiting tras proxies: IP de plataforma autenticada por secreto, sin confiar en encabezados públicos de Render.
3. Acceso directo a Render y mutaciones sin origen: bloqueados en producción.
4. Cookies de producción: prefijo __Host y borrado con los mismos atributos.
5. JSON inválido: ya no se devuelve el mensaje del parser con fragmentos del cuerpo.
6. Registro: si falla crear sesión, se conserva la organización y el usuario ya creados para permitir login posterior.
7. Cuenta inexistente: comparación bcrypt contra hash ficticio para reducir diferencias de tiempo.
8. Cookie malformada: respuesta 401, sin excepciones internas ni consultas por valores arbitrarios.
9. Cálculo fiscal: BigInt también en productos intermedios; el rango inválido es un error 400.
10. Dashboard: agregación y selección de campos para reducir memoria y exposición accidental de conceptos.
11. Arranque: validación de origen, base de producción separada y secreto; inicialización de índices y cierre ordenado.
12. Interfaz: correcciones de contraste, navegación móvil fuera del foco cuando está oculta y respeto a movimiento reducido.

## Límites conocidos

- Rate limit en memoria y una sola instancia; un reinicio borra contadores. Una aplicación comercial necesitaría almacenamiento compartido y controles de abuso adicionales.
- Las altas públicas pueden consumir el espacio gratuito. Monitorizar uso; no hay cuotas por organización ni verificación de correo.
- Sin recuperación ni cambio de contraseña ni MFA. No usar contraseñas reutilizadas para probar la demo.
- Alta sin transacción distribuida; caída abrupta puede dejar una organización huérfana. La protección de referencia cliente/factura tampoco es transaccional frente a creación/eliminación simultánea.
- Se permite editar y borrar facturas por diseño del MVP; no es un libro contable ni un sistema fiscal certificado.
- No hay SLA, copias automáticas contratadas ni garantía de recuperación en planes gratuitos. No se usan datos reales.
- El escáner de publicación usa reglas de detección y revisión de rutas; no demuestra ausencia absoluta de secretos. `.env`, `.local`, trazas y resultados del navegador se excluyen de Git.

## Verificación

Vitest/Supertest prueban autorización, aislamiento, validación, importes, cookies, caducidad, rate limiting, errores sanitizados y proxy. Playwright comprueba flujos HTTP y navegador, recarga y persistencia, login/logout y accesibilidad básica. Las dos suites se ejecutaron también contra https://nexora-eta-steel.vercel.app y aprobaron. Se comprobaron además los atributos de la cookie real, su revocación, acceso directo bloqueado y ausencia de los secretos efectivos en los bundles publicados. Véase STATUS.md y docs/verification.json.
