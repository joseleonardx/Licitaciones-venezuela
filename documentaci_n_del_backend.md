# Documentación técnica

## Alcance y arquitectura

La aplicación que se publica para usuarios es una **PWA React/Vite** ubicada en `frontend/`. Se comunica con la API **Node.js/Express** en `src/` mediante rutas versionadas bajo `/api/v1`. PostgreSQL (incluido Supabase) es la persistencia principal.

El directorio `app/` conserva un prototipo FastAPI/SQLAlchemy independiente. No es utilizado por la PWA: sus rutas, autenticación y formato de respuestas no están integrados con el contrato Node. Mantener ambas APIs en paralelo requiere configurarlas y ejecutarlas por separado.

```text
frontend/                     React, Vite, vite-plugin-pwa
  App.jsx                     Pantallas y flujo de usuario
  src/services/api.js         Cliente HTTP y adaptación de licitaciones
  src/responsive.css         Layout adaptable y áreas seguras móviles
src/
  app.js                      Fábrica Express, CORS, rutas y healthchecks
  server.js                   Listener y apagado ordenado
  database/pool.js            Pool PostgreSQL
  modules/
    auth/                     Registro, login, perfil y JWT
    licitations/              Catálogo, detalle y creación de licitaciones
    bids/                     Postulaciones PDF
    requests/                 Solicitudes y su historial de estados
  middlewares/                Autenticación, errores y trazabilidad
database/
  migrate.js                 Runner incremental
  migrations/                SQL versionado
tests/                        Pruebas de dominio, HTTP e integración
app/                          Prototipo FastAPI separado
```

## Requisitos y configuración

- Node.js 18 o posterior y npm.
- PostgreSQL o una instancia Supabase accesible.
- Python 3.10 o posterior solo para ejecutar el prototipo FastAPI.

Instala el backend Node y el frontend desde la raíz:

```powershell
npm ci
Set-Location frontend
npm ci
Set-Location ..
```

Copia `.env.example` a `.env` y configura al menos:

```env
DATABASE_URL=postgresql://usuario:clave@host:5432/base
SECRET_KEY=un-secreto-aleatorio-largo
FRONTEND_ORIGINS=http://localhost:8081
PORT=3000
NODE_ENV=development
```

Genera `SECRET_KEY` con `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`. El backend no usa una clave JWT predeterminada. Configura `VITE_API_URL` en `frontend/.env` si la API no está en `http://localhost:3000`.

## Base de datos y migraciones

Ejecuta `npm run migrate` después de configurar `DATABASE_URL`. El runner aplica los SQL en orden y registra cada archivo aplicado en `schema_migrations`; no vuelve a ejecutar una migración registrada.

| Migración | Propósito |
|---|---|
| `001_create_requests_table.sql` | Solicitudes y registro de cambios de estado |
| `002_add_budget_to_requests.sql` | Asegura la columna de presupuesto |
| `003_update_requests_status_constraint.sql` | Acepta temporalmente estados antiguos y canónicos |
| `004_create_core_tables_and_align_request_statuses.sql` | Crea empresas, licitaciones y postulaciones; agrega metadatos de catálogo; normaliza estados antiguos de solicitudes y restringe los estados canónicos |

La migración 004 es idempotente para un esquema nuevo o compatible con los modelos existentes. Si la base ya contiene empresas duplicadas ignorando mayúsculas/minúsculas o postulaciones duplicadas para una misma empresa y licitación, sus índices únicos no se podrán crear: resuelve esos datos antes de aplicar la migración. Haz respaldo antes de aplicar cambios sobre una base con datos reales.

Los nombres de columnas y contratos usados por Node son `companies.razon_social`, `companies.password_hash`, `licitations.closing_date`, `bids.licitation_id`, `bids.company_id` y `bids.pdf_url`. Los metadatos adicionales de licitación son `organization`, `sector`, `location`, `requirements` y `attachments`.

## Ejecución

Backend:

```powershell
npm run dev
```

PWA, en otra terminal:

```powershell
Set-Location frontend
npm run dev
```

Vite sirve la PWA en `http://localhost:8081`. Para crear los recursos de despliegue:

```powershell
npm run build
npm run preview
```

`frontend/vite.config.js` configura el service worker y manifiesto con `vite-plugin-pwa`; el icono web está en `frontend/public/icon.svg`. El CSS responsive adapta las pantallas de acceso, catálogo y postulación a móvil/tablet, convierte la navegación lateral en una barra inferior y contempla safe areas de iOS. La PWA guarda el estado de navegación y la preferencia de tema en el dispositivo; el tema claro es el predeterminado. No se utiliza Expo Go ni se construyen binarios móviles.

Los PDF se almacenan localmente en `uploads/` y se sirven mediante `/uploads`. El servicio Render definido en `render.yaml` usa `/ready` como healthcheck; requiere `DATABASE_URL`, `SECRET_KEY` y `FRONTEND_ORIGINS`. Para la PWA en Vercel, define `VITE_API_URL` con la URL HTTPS de Render (sin `/api/v1`) y configura en Render el origen exacto de Vercel. Actualiza `FRONTEND_ORIGINS` cuando cambien los dominios de producción o preview. Aplica las migraciones con `npm run migrate` desde un entorno que tenga la `DATABASE_URL` de producción antes de usar la API.

El disco del servicio Render puede ser efímero y no se comparte entre instancias. Usa un volumen persistente o almacenamiento de objetos antes de producción para que los PDF no desaparezcan al reiniciar o desplegar.

## API Node

Todas las rutas de negocio están bajo `/api/v1`.

| Método y ruta | Uso |
|---|---|
| `GET /health` | Liveness del proceso HTTP, no requiere base de datos |
| `GET /ready` | Readiness: verifica la conexión PostgreSQL |
| `POST /auth/register` | Registro de empresa; devuelve empresa y JWT |
| `POST /auth/login` | Inicio de sesión; devuelve empresa y JWT |
| `GET /auth/me` | Perfil de la empresa autenticada |
| `GET /licitations` | Licitaciones activas; `?all=true` incluye todas |
| `GET /licitations/:id` | Detalle de una licitación |
| `POST /licitations` | Crea una licitación y acepta presupuesto, fechas y metadatos de catálogo |
| `POST /bids` | Envía una propuesta PDF como empresa autenticada |
| `GET /bids/my-bids` | Postulaciones de la empresa autenticada |
| `GET /bids/licitation/:licitationId` | Postulaciones de una licitación (requiere JWT) |
| `GET /requests` | Lista solicitudes; acepta filtro `status` |
| `GET /requests/:id` | Solicitud e historial |
| `POST /requests` | Crea una solicitud |
| `PATCH /requests/:id/status` | Ejecuta transición permitida y registra auditoría |
| `DELETE /requests/:id` | Elimina una solicitud |

`POST /bids` usa `multipart/form-data`: `licitation_id` (UUID) y `file` (PDF, máximo 15 MB). Para rutas protegidas se envía `Authorization: Bearer <token>`. Los errores controlados usan una respuesta JSON con tipo, mensaje, código HTTP y `requestId`.

La máquina de estados de solicitudes está en `src/modules/requests/request-status.js`:

- `PENDING` → `IN_REVIEW` o `CANCELLED`
- `IN_REVIEW` → `APPROVED`, `REJECTED` o `CANCELLED`
- `APPROVED` → `CLOSED` o `CANCELLED`
- `REJECTED`, `CLOSED` y `CANCELLED` son terminales

Las transiciones y su auditoría se escriben en transacciones PostgreSQL; la fila se vuelve a validar bajo bloqueo para evitar carreras.

## Pruebas

`npm test` ejecuta las pruebas de dominio, HTTP y flujo completo. Requieren una base PostgreSQL configurada en `DATABASE_URL` y migrada; crean registros de prueba y algunas suites cierran el pool al terminar.

## Prototipo FastAPI (opcional)

Para instalar sus dependencias sin afectar el Python global:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Con `DATABASE_URL` configurada, se puede intentar iniciar con `.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload`. Este prototipo crea tablas con SQLAlchemy al importar la aplicación, expone rutas bajo `/api/licitations` y `/api/bids`, y no ofrece el mismo contrato ni autenticación que la API Node. No lo uses como backend de la PWA sin una integración explícita.
