# Licitaciones Venezuela

Aplicación web progresiva (PWA) para que empresas consulten licitaciones y presenten propuestas en PDF. La PWA usa React y Vite; su API oficial es el backend Node.js/Express con PostgreSQL (Supabase).

El directorio `app/` conserva un prototipo FastAPI independiente. No está conectado a la PWA ni comparte su contrato de API.

## Índice

- [Descripción del proyecto](#descripción-del-proyecto)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura del proyecto](#arquitectura-del-proyecto)
- [Requisitos](#requisitos)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Pruebas](#pruebas)
- [Endpoints principales](#endpoints-principales)
- [Contribución](#contribución)

## Descripción del proyecto

Licitaciones Venezuela permite a las empresas participar en procesos de contratación pública desde el navegador:

- registrarse e iniciar sesión de forma segura,
- consultar licitaciones activas,
- enviar propuestas técnicas en PDF,
- consultar su historial de postulaciones,
- gestionar solicitudes internas con estados y trazabilidad.

El backend incluye manejo centralizado de errores, autenticación JWT, trazabilidad por solicitud y migraciones PostgreSQL.

## Stack tecnológico

- Node.js
- Express
- PostgreSQL / Supabase
- JWT para autenticación
- bcryptjs para hash de contraseñas
- Multer para carga de archivos PDF
- pg para acceso a PostgreSQL
- React + Vite + vite-plugin-pwa para la PWA

## Arquitectura del proyecto

```text
project/
├── database/
│   ├── migrate.js
│   └── migrations/
├── src/
│   ├── database/
│   ├── errors/
│   ├── middlewares/
│   ├── modules/              # auth, bids, licitations, requests
│   ├── app.js
│   └── server.js
├── tests/
├── uploads/
├── frontend/                 # PWA React/Vite
│   └── src/responsive.css    # Diseño adaptable para escritorio, Android e iOS
├── app/                      # Prototipo FastAPI no integrado
├── render.yaml               # Despliegue de la API Node en Render
├── package.json
├── requirements.txt
├── .env.example
├── .gitignore
├── README.md
└── .env
```

## Requisitos

Antes de ejecutar el proyecto debes tener instalado:

- Node.js 18+
- npm
- PostgreSQL o acceso a Supabase

## Configuración

1. Instala las dependencias del backend y de la PWA:

```bash
npm ci
cd frontend
npm ci
cd ..
```

2. Copia `.env.example` a `.env` y completa la configuración del backend. En PowerShell:

```powershell
Copy-Item .env.example .env
```

Asegúrate de configurar al menos:

- `DATABASE_URL`
- `SECRET_KEY`
- `FRONTEND_ORIGINS`

Genera un secreto local aleatorio con:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Ejecución

### Backend en desarrollo

```bash
npm run dev
```

### Backend en producción

```bash
npm start
```

### Base de datos

Aplica las migraciones SQL en orden. Estas crean también las tablas de empresas, licitaciones y postulaciones requeridas por la API:

```bash
npm run migrate
```

### Frontend

Desde otra terminal, configura opcionalmente `frontend/.env` (hay una plantilla en `frontend/.env.example`) y arranca Vite:

```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 8081
```

El frontend envía las peticiones a `VITE_API_URL` (por defecto `http://localhost:3000`). La PWA conserva en el navegador la sesión y la vista actual —incluidos el detalle seleccionado y la sección del panel— al recargar o volver a abrirla; valida el token al restaurar la sesión y solicita iniciar sesión si venció. La apariencia clara es la predeterminada, con opción oscura; la preferencia se guarda en el dispositivo. El catálogo usa un diseño adaptable para escritorio, tablet y móvil; en pantallas pequeñas muestra navegación inferior con áreas táctiles y respeta las áreas seguras de iOS. Instala la PWA desde un navegador compatible cuando esté servida por HTTPS o en `localhost`.

### Prototipo FastAPI (opcional)

No forma parte del flujo de la PWA. Para ejecutarlo de manera independiente, crea un entorno virtual, instala `requirements.txt`, configura `DATABASE_URL` y arranca `uvicorn app.main:app`. Sus rutas y autenticación no están integradas con el contrato Node `/api/v1`.

Para producción:

```bash
cd frontend
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

## Pruebas

```bash
npm test
```

Las suites de integración usan PostgreSQL real y pueden crear registros de prueba; configura `DATABASE_URL` y ejecuta primero `npm run migrate`.

## Despliegue en Vercel

La PWA se despliega desde `frontend` como proyecto Vite en Vercel. Configura `VITE_API_URL` con la URL pública HTTPS del servicio Render, sin añadir `/api/v1`.

### Recomendación de despliegue

- En Vercel, importa este repositorio.
- Define el directorio raíz del proyecto como `frontend`.
- Usa el comando de build por defecto: `npm run build`.
- Haz que la salida sea `dist`.
- Configura la variable de entorno `VITE_API_URL` con la URL pública del backend.

Ejemplo:

```bash
VITE_API_URL=https://licitaciones-api.onrender.com
```

> Si la API se despliega en otro host, reemplaza la URL anterior con la de tu backend real.

Los PDF se guardan en `uploads/` del backend. En producción, usa almacenamiento persistente o un servicio de objetos: el disco efímero de plataformas serverless no garantiza que los archivos permanezcan disponibles.

## Despliegue de la API en Render

El archivo `render.yaml` define el servicio Node: Render ejecuta `npm ci`, inicia con `npm start` y usa `/ready` como healthcheck. Crea el servicio desde el Blueprint del repositorio y configura:

- `DATABASE_URL`: URL de conexión PostgreSQL/Supabase.
- `SECRET_KEY`: Render la genera mediante el Blueprint.
- `FRONTEND_ORIGINS`: origen exacto de la PWA en Vercel, por ejemplo `https://tu-proyecto.vercel.app`, sin barra final. Se pueden indicar varios orígenes separados por comas.

En Vercel, configura `VITE_API_URL` como la URL HTTPS de Render. Si cambian los dominios de producción o preview, actualiza `FRONTEND_ORIGINS` en Render. Las pruebas de readiness fallan hasta que `DATABASE_URL` sea válida.

Antes de usar la API de producción, aplica las migraciones con `npm run migrate` desde un entorno que tenga configurada la `DATABASE_URL` de producción.

## Endpoints principales

### Salud del sistema

- `GET /health`
- `GET /ready`

### Autenticación

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

### Licitaciones

- `GET /api/v1/licitations`
- `GET /api/v1/licitations/:id`
- `POST /api/v1/licitations`

### Postulaciones

- `POST /api/v1/bids`
- `GET /api/v1/bids/my-bids`
- `GET /api/v1/bids/licitation/:licitationId`

### Solicitudes

- `GET /api/v1/requests`
- `GET /api/v1/requests/:id`
- `POST /api/v1/requests`
- `PATCH /api/v1/requests/:id/status`
- `DELETE /api/v1/requests/:id`

La creación de licitaciones admite además `organization`, `sector`, `location`, `requirements` y `attachments`, campos consumidos por la interfaz.

## Contribución

Las contribuciones son bienvenidas. Para proponer cambios:

1. crea una rama nueva,
2. realiza tus cambios,
3. valida la funcionalidad,
4. abre un pull request describiendo el problema y la solución.

## Licencia

Proyecto desarrollado con fines de demostración y aprendizaje.
