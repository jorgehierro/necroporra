# ⚰️ Necroporra • Plataforma Web Mobile-First

Plataforma moderna, ultra rápida y orientada a dispositivos móviles para gestionar porras privadas de pronósticos entre amigos ("en petit comité"), desarrollada con **Next.js 14 (App Router)**, **Tailwind CSS** y **LibSQL / SQLite Serverless**.

Diseñada para que tus amigos jueguen directamente desde el navegador de su teléfono móvil sin instalaciones engorrosas, sin necesidad de gestionar servidores y con **coste 0 €**.

---

## 🌟 Características Destacadas

- **📱 Mobile-First PWA**: Se comporta y se ve como una app nativa en iOS y Android (barra de navegación inferior, tarjetas táctiles, modo oscuro elegante).
- **🔒 Acceso Simple por PIN**: Cada amigo entra seleccionando su nombre e introduciendo su PIN de 4 dígitos (por defecto `1234`). Una vez introducido, queda guardado en su móvil para siempre. Nadie puede modificar las apuestas de otro.
- **⚡ 0 Servidores y 0 Coste**:
  - En local: funciona automáticamente con un archivo SQLite local (`necroporra.db`).
  - En la nube (producción): listo para desplegar en **Vercel** conectado a **Turso** (base de datos SQLite serverless gratuita).
- **🏆 Clasificación en Vivo con Podio**: Posiciones en directo, aciertos de capitán y **botón para copiar el resumen de la jornada en 1 clic para WhatsApp**.
- **⚔️ Cara a Cara (Duelo Directo)**: Enfrenta las plantillas de dos amigos para ver qué candidatos comparten, qué apuestas diferenciales tiene cada uno y qué perfil de riesgo juegan (Conservador vs Audaz).
- **🔮 Simulador "What-If"**: Proyecta en tiempo real cómo volcaría la clasificación si falleciese cualquier candidato en activo hoy.
- **🛡️ Panel de Administración (PIN `0000`)**: Registro oficial de defunciones con recálculo automático de puntos, control de fecha límite (Lock Date) y reinicio de datos.

---

## 🚀 Puesta en Marcha en Local

### 1. Requisitos
- Node.js 18+ (tienes instalado Node 24).

### 2. Ejecutar en modo desarrollo
```powershell
npm run dev
```
Abre en tu navegador: `http://localhost:3000`

### 3. Ejecutar en modo producción local
```powershell
npm run build
npm start
```

---

## ☁️ Cómo Desplegarlo en la Nube Gratis (Para tus amigos)

Para que tus amigos puedan entrar desde el enlace de WhatsApp en su móvil a cualquier hora sin tener tu ordenador encendido:

### Paso 1: Crear repositorio en GitHub
1. Inicializa git y sube el proyecto a tu cuenta de GitHub:
```powershell
git init
git add .
git commit -m "Necroporra Web App v2"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/necroporra.git
git push -u origin main
```

### Paso 2: Base de Datos Gratuita en Turso (2 minutos)
1. Entra en [turso.tech](https://turso.tech) y crea una cuenta gratuita con GitHub.
2. Crea una base de datos llamada `necroporra`.
3. Copia dos valores que te darán en el panel:
   - `TURSO_DATABASE_URL` (ej. `libsql://necroporra-tuusuario.turso.io`)
   - `TURSO_AUTH_TOKEN` (el token de acceso)

### Paso 3: Conectar a Vercel (1 minuto)
1. Entra en [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Pulsa en **"Add New Project"** y selecciona tu repositorio `necroporra`.
3. En la sección **Environment Variables**, añade:
   - `TURSO_DATABASE_URL` = (tu url de Turso)
   - `TURSO_AUTH_TOKEN` = (tu token de Turso)
   - `ADMIN_PIN` = `0000` (o el PIN secreto que elijas para ti como administrador)
4. Pulsa **Deploy**.

¡Listo! Vercel te dará una URL pública gratuita (ej. `https://necroporra.vercel.app`) protegida con HTTPS que puedes pasar por el grupo de WhatsApp. Tus amigos podrán pulsar en su navegador "Añadir a la pantalla de inicio" y tenerla como una app más.

---

## 📁 Estructura del Proyecto

```
necroporra/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Clasificación, podio, métricas y botón WhatsApp
│   │   ├── roster/page.tsx   # "Mi Equipo" (gestión con PIN personal)
│   │   ├── duel/page.tsx     # "Cara a Cara" entre dos jugadores
│   │   ├── what-if/page.tsx  # Simulador de proyecciones futuras
│   │   ├── rules/page.tsx    # Calculadora de puntos y reglamento
│   │   ├── admin/page.tsx    # Panel de administración (PIN 0000)
│   │   └── api/              # Endpoints serverless REST
│   ├── components/
│   │   └── Navbar.tsx        # Navegación dual (Desktop header + Mobile bottom bar)
│   └── lib/
│       ├── db.ts             # Cliente dual LibSQL/SQLite
│       ├── scoring.ts        # Motor matemático de puntuación
│       └── types.ts          # Definiciones de TypeScript
├── public/
│   └── manifest.json         # Configuración de Progressive Web App
├── python_prototype/         # Prototipo original en Python/Streamlit (conservado intacto)
└── README.md
```

---

## 📦 Prototipo Python Original

El prototipo previo en Streamlit ha quedado guardado íntegro en la carpeta [`python_prototype/`](file:///c:/Users/jorge/Desktop/Proyectos/necroporra/python_prototype). Puedes seguir ejecutándolo en cualquier momento con:

```powershell
cd python_prototype
& "C:\Users\jorge\miniconda3\envs\jorge\python.exe" -m streamlit run app.py
```
