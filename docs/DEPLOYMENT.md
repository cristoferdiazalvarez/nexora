# Publicación de NEXORA

## Progreso real (2026-11-16T14:40:08+00:00)

Las autorizaciones ya se han completado por los flujos oficiales de las CLI: Vercel 65.16.0, Render 2.36.0 y Atlas 1.60.0. Render y Atlas se descargaron de releases oficiales y se verificaron por SHA-256; todas las CLI están fuera del repositorio. Las notas de bloqueo por ausencia de acceso conservadas debajo son **históricas**.

Recursos nuevos creados y comprobados: proyecto Vercel `nexora` en Hobby, Node 24, dominio reservado `nexora-eta-steel.vercel.app`; proyecto Atlas `NEXORA` y M0 `nexora-production` en AWS EU_CENTRAL_1, MongoDB 8, sin backups de pago, estado IDLE. El proyecto anterior `Project 0` y su `Cluster0` permanecen fuera de alcance. No se ha desplegado ni declarado funcional el dominio reservado.

Antes de crear `nexora-api`, falta confirmar en la pantalla oficial de Render Billing → Monthly Included Usage cuántas horas Free quedan de 750 y que no existe método de pago/cargos habilitados. La especificación pública Render se revisó: no expone esos datos de billing/cuota, por lo que se solicitaron únicamente esos datos visibles al usuario. Credit Balance $0.00 no es la cuota Free. No se ha creado el servicio ni activado facturación.

El siguiente paso, una vez comprobada esa cuota, es crear solo `nexora-api` con `plan: free` y Node 24 en Frankfurt, configurar credenciales de Atlas con `readWrite` limitado a `nexora_production`, allowlist solo con los CIDR de salida reales del servicio y secretos de proxy directamente en las plataformas. Luego desplegar Vercel y verificar los flujos HTTPS antes de cualquier cambio al portfolio. Los secretos nuevos no se escribirán en archivos locales ni en Git.

## Historial del plan y comprobaciones anteriores


Estado actual: repositorio nuevo y preparación local. Aún no hay recursos Vercel/Render/Atlas creados ni demo pública verificada. No modificar `developer-portfolio` hasta que la aplicación publicada supere la verificación.

## Recursos autorizados

Solo nuevos recursos identificados como NEXORA. Conservar todos los proyectos, dominios, bases y variables existentes. Revisar el plan real de la cuenta antes de crear cada recurso. Si requiere tarjeta, facturación, suscripción o trial convertible, detener ese paso. No habilitar upgrades, autoscaling ni add-ons de pago.

| Servicio | Objetivo sin coste                                                   | Límite y condición                                                            |
| -------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| GitHub   | Repositorio público `cristoferdiazalvarez/nexora` y Actions estándar | Runner Linux estándar en repositorio público; sin LFS ni subida de artefactos |
| Vercel   | Proyecto nuevo Hobby, raíz del monorepo                              | Confirmar elegibilidad y cuotas de la cuenta; no cambiar al plan Pro          |
| Render   | Un servicio web nuevo `free` con Node 24                             | Usa cuota compartida; suspensión por inactividad y arranque en frío           |
| Atlas    | Proyecto nuevo, cluster Free/M0 y DB `nexora_production`             | Sin backups opcionales de pago ni upgrade de tier                             |

El usuario informó que Atlas contiene `Project 0` y `Cluster0` (Free, AWS `EU_WEST_3`). **No usar, modificar ni eliminar esos recursos.** NEXORA requiere un proyecto independiente y un cluster M0 nuevo; la cuota y disponibilidad de ese recurso adicional aún deben comprobarse en la cuenta autorizada.

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

La comprobación actual no encontró conectores de Vercel, Render o Atlas en las herramientas disponibles ni sus CLI instaladas (`vercel`, `render`, `atlas`). Las herramientas de nube presentes son para Azure, no para estos proveedores. El usuario informó que Vercel está en Hobby, que tiene acceso a un workspace de Render y que Atlas tiene `Project 0 / Cluster0` en Free, AWS `EU_WEST_3`; estos datos no pudieron verificarse directamente. No se pudo comprobar la sesión, cuotas disponibles ni si es posible añadir otro recurso gratuito en cada cuenta. No se abrió una autorización OAuth ni se intentó sortear el bloqueo de interacción del navegador.

Para continuar hace falta autorizar, desde la conexión oficial de cada proveedor en el entorno de trabajo:

1. **Vercel:** iniciar sesión y conceder acceso para consultar la cuenta y crear/configurar/desplegar únicamente el proyecto nuevo `nexora`. Mantener el plan Hobby; no dar acceso a proyectos del portfolio ni cambiar planes.
2. **Render:** iniciar sesión y conceder acceso para consultar la cuenta y crear/configurar/desplegar únicamente el servicio `nexora-api` en el plan `free`.
3. **MongoDB Atlas:** iniciar sesión y conceder acceso para consultar la cuenta y crear únicamente el proyecto NEXORA, un cluster Free/M0 independiente y el usuario de base de datos de permisos mínimos descritos arriba. No tocar ni reutilizar `Project 0 / Cluster0`.

La autorización debe permitir verificar los planes/cuotas y administrar esos recursos específicos. No se requieren ni deben compartirse contraseñas, tokens ni claves API por chat. Al autorizar, confirmar que los planes siguen siendo gratuitos y que ninguna pantalla exige tarjeta, pago, trial convertible o suscripción; si aparece algo de eso, detenerse y pedir aprobación antes de continuar. La configuración de aplicación ya está preparada en `vercel.json`, `render.yaml` y `.env.example`; la ausencia pendiente es el acceso autorizado a las cuentas de los tres proveedores, no comandos ni cambios manuales de archivos.

No se han creado proyectos, servicios, clusters ni usuarios remotos, no se han configurado secretos, y no hay URL pública que se pueda presentar como verificada. Si no se puede conceder ese acceso, el código y la demo local permanecen utilizables; no modificar el portfolio ni elegir otra arquitectura sin aprobación.

La CI usa únicamente un [runner estándar gratuito para repositorios públicos](https://docs.github.com/en/billing/concepts/product-billing/github-actions), conserva el diagnóstico en logs y no sube trazas como artefactos que consuman almacenamiento facturable.
