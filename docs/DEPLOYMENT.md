# Publicación de NEXORA

Estado actual: repositorio nuevo y preparación local. Aún no hay recursos Vercel/Render/Atlas creados ni demo pública verificada. No modificar `developer-portfolio` hasta que la aplicación publicada supere la verificación.

## Recursos autorizados

Solo nuevos recursos identificados como NEXORA. Conservar todos los proyectos, dominios, bases y variables existentes. Revisar el plan real de la cuenta antes de crear cada recurso. Si requiere tarjeta, facturación, suscripción o trial convertible, detener ese paso. No habilitar upgrades, autoscaling ni add-ons de pago.

| Servicio | Objetivo sin coste                                                   | Límite y condición                                                   |
| -------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| GitHub   | Repositorio público `cristoferdiazalvarez/nexora` y Actions estándar | No activar runners de pago ni LFS                                    |
| Vercel   | Proyecto nuevo Hobby, raíz del monorepo                              | Confirmar elegibilidad y cuotas de la cuenta; no cambiar al plan Pro |
| Render   | Un servicio web nuevo `free` con Node 24                             | Usa cuota compartida; suspensión por inactividad y arranque en frío  |
| Atlas    | Proyecto nuevo, cluster Free/M0 y DB `nexora_production`             | Sin backups opcionales de pago ni upgrade de tier                    |

La documentación de [Render Free](https://render.com/docs/free) explica suspensión tras 15 minutos y límites compartidos. Es adecuado para una demo de portfolio, no ofrece disponibilidad de un servicio comercial. No instalar pingers para eludir suspensión ni gastar cuotas de otros proyectos.

Atlas ofrece [Free/M0](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/). Sus [backups opcionales](https://www.mongodb.com/docs/atlas/backup/cloud-backup/free-cluster-backup/) pueden generar cargos: deben permanecer desactivados. Las condiciones de la cuenta se verifican antes de provisionar, no solo leyendo documentación pública.

## Orden de despliegue

1. Conectar Vercel, Render y Atlas con autorización de la cuenta. GitHub ya dispone de sesión comprobada.
2. Crear proyecto Atlas exclusivo y cluster Free; no reutilizar una base de otro proyecto. Crear usuario con `readWrite` solo en `nexora_production`, contraseña aleatoria y TLS.
3. Crear proyecto Vercel nuevo para reservar su dominio `.vercel.app`, sin tocar el portfolio. Configurar raíz del repositorio, Vite y Node 24; `vercel.json` dirige `/api/*` a una sola función y conserva fallback SPA. No promover una demo incompleta como verificada.
4. Crear servicio Render `free` desde `render.yaml`, con las variables privadas que siguen. Obtener sus rangos de salida y autorizar únicamente esos CIDR en Atlas. [Rangos de salida de Render](https://render.com/docs/outbound-ip-addresses). No abrir Atlas a `0.0.0.0/0` para resolver la conexión.
5. Generar un secreto aleatorio de 32 bytes o más y configurarlo de forma privada en ambos proveedores. No guardarlo en Git ni en este documento.
6. Configurar upstream real y origen exacto en Vercel; completar despliegue de Render. No usar URLs placeholder ni sustituir dominios de proyectos existentes.
7. Publicar Vercel y verificar frontend, proxy y API por HTTPS. Si falla el arranque por inactividad, mostrar el error y reintentar; no inventar disponibilidad.
8. Ejecutar la suite E2E autorizada contra la URL pública y revisar cookies Secure, recursos sin secretos, consola, SPA, PDF, datos persistentes, roles y acceso entre empresas. Verificar acceso directo a Render: health público y `/api/me` bloqueado.
9. Registrar commit, IDs exactos de recursos, URLs, planes reales, resultados y fecha. Solo entonces preparar la tarjeta de portfolio y comprobar sus páginas y proyectos anteriores.

## Variables

| Variable           | Render                                              | Vercel                                 | Visibilidad             |
| ------------------ | --------------------------------------------------- | -------------------------------------- | ----------------------- |
| `NODE_ENV`         | `production`                                        | Runtime production de la plataforma    | Configuración           |
| `MONGODB_URI`      | URI Atlas con `/nexora_production`                  | No                                     | Secreto                 |
| `APP_ORIGIN`       | Origen HTTPS definitivo del frontend, sin `/` final | Mismo origen                           | Servidor                |
| `API_PROXY_SECRET` | Mismo secreto aleatorio                             | Mismo secreto aleatorio                | Secreto, nunca `VITE_*` |
| `API_ORIGIN`       | No                                                  | Origen HTTPS del nuevo servicio Render | Servidor                |
| `PORT`             | Asignado por Render                                 | No                                     | Configuración           |

Render ejecuta `npm ci && npm run build -w apps/api` y `node apps/api/dist/server.js`; escucha en `0.0.0.0:$PORT`. No depende del `.env` local. La inicialización espera a MongoDB y a los índices antes de escuchar. `GET /api/health` devuelve 200 con DB conectada, 503 en caso contrario y no incluye credenciales.

Vercel instala desde la raíz con `npm ci`, compila `apps/web` y sirve `apps/web/dist`; construye `api/index.ts` como función Node. El proxy no guarda cookies en memoria, por lo que las sesiones se conservan en MongoDB. No se necesita CORS entre Vercel y Render en el navegador. El upstream se lee solo en servidor.

Los previews de Vercel no se autorizan con un comodín: producción acepta su origen definitivo. Antes de usar previews funcionales se debe crear un entorno independiente con otra base y un origen exacto, sin tocar producción.

## Bloqueos y alternativa

Aún no hay sesiones autorizadas de Vercel, Render o Atlas disponibles en las herramientas/CLI comprobadas. Se ha solicitado conectar los tres servicios. No se pide copiar comandos ni pegar secretos en la conversación. Si un plan gratuito no está disponible en esas cuentas, detener la creación y explicar el motivo antes de elegir otra arquitectura gratuita. El código y la demo local permanecen utilizables mientras se resuelve ese acceso.
