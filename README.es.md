# JEV Mail Filtering

🇬🇧 [Read in English](README.md)

**Tu bandeja de entrada, ordenada por IA, en tu propio ordenador.**

![Tu bandeja ordenada en Necesario contestar, Interesante de revisar, Comercial, Posible estafa, Sin clasificar y Otros](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/dashboard-light.png)

[![Licencia: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js 22 o superior](https://img.shields.io/badge/node-%E2%89%A5%2022-339933.svg)](https://nodejs.org)
[![CI](https://github.com/albertcas/jev-mail-filtering/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/albertcas/jev-mail-filtering/actions/workflows/ci.yml)

## Qué hace

JEV Mail Filtering lee tu buzón por IMAP (solo lectura), hace unas pocas preguntas precisas sobre cada correo a Jev, el modelo de [TypeSafe](https://typesafe.ai), y muestra el resultado como un cliente de correo. La barra lateral lo ordena todo en categorías:

| Categoría | Qué va ahí |
|---|---|
| **Necesario contestar** | Una persona espera tu respuesta, una decisión o que hagas algo. Ordenado por urgencia. |
| **Interesante de revisar** | Útil, pero sin necesidad de responder: newsletters a las que te suscribiste, recibos, avisos de tus cuentas. |
| **Comercial** | Marketing y prospección comercial. |
| **Posible estafa** | Indicios de phishing o fraude: dominios que imitan a otros, autenticación del remitente fallida, peticiones de contraseñas o pagos. |
| **Sin clasificar** | Jev no tenía suficiente confianza, así que la app no se la juega. |
| **Otros** | Ruido automático, como rebotes y resúmenes de redes sociales. |

- **Solo lectura.** El buzón se abre con `EXAMINE` y se lee con `BODY.PEEK`: no se mueve, borra, etiqueta ni marca como leído nada.
- **Local.** La app se ejecuta en `127.0.0.1:3737`. Tu configuración, resultados y credenciales se quedan en tu ordenador.
- **Explicable.** Cada correo muestra por qué está en su categoría («Dominio parecido a paypal», «Autenticación del remitente fallida», «Pide datos sensibles»). Las razones las genera el código, nunca un modelo.
- **Ajustable.** Abre **Ajustar**, mueve los controles de umbral y la lista y sus contadores se actualizan al instante, sin volver a llamar a Jev.

| Claro | Oscuro | Móvil |
|---|---|---|
| ![Tema claro](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/dashboard-light.png) | ![Tema oscuro](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/dashboard-dark.png) | ![En un móvil](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/mobile.png) |

## Empieza en 5 minutos

### Qué necesitas

- **Node.js 22 LTS o superior**: [descárgalo en nodejs.org](https://nodejs.org). Compruébalo con `node -v` en una terminal.
- **Git** (opcional, solo para la Opción B): [git-scm.com](https://git-scm.com/downloads).
- **Una clave de API de TypeSafe** con acceso a Jev: [cómo crearla](docs/setup/typesafe-key.es.md).
- **Una contraseña de aplicación de tu proveedor de correo**, una contraseña aparte solo para esta app que puedes revocar cuando quieras: [Gmail](docs/setup/gmail.es.md) · [iCloud Mail](docs/setup/icloud.es.md) · [Yahoo Mail](docs/setup/yahoo.es.md) · [Otro IMAP](docs/setup/imap.es.md).

¿Aún no tienes clave ni buzón? Puedes [probar antes la demo](#pruébalo-primero-sin-cuenta).

### Paso 1. Consigue el código

**Opción A · Descargar ZIP.** En la [página de GitHub](https://github.com/albertcas/jev-mail-filtering) elige **Code → Download ZIP**, o usa el [enlace directo](https://github.com/albertcas/jev-mail-filtering/archive/refs/heads/main.zip). Descomprímelo y abre una terminal dentro de la carpeta descomprimida (Windows: clic derecho en la carpeta y **Abrir en Terminal**; macOS: clic derecho en la carpeta y **Nueva terminal en la carpeta**).

**Opción B · git clone.**

```bash
git clone https://github.com/albertcas/jev-mail-filtering.git
cd jev-mail-filtering
```

### Paso 2. Instala, compila y arranca

Estos comandos son iguales en Windows (PowerShell), macOS y Linux:

```bash
npm install
npm run build
npm start
```

El primer `npm install` y la compilación tardan un par de minutos. `npm start` muestra un aviso de Next.js sobre `output: standalone`; puedes ignorarlo.

### Paso 3. Abre la app

Abre <http://127.0.0.1:3737> en tu navegador y sigue el asistente de configuración. Comprueba tu clave y la conexión con el buzón, muestra una estimación de coste y lanza el primer análisis. Después, la app sincroniza cada 15 minutos (configurable en **Configuración**) mientras está en marcha.

## Pruébalo primero sin cuenta

El modo demo usa 50 correos ficticios y respuestas de Jev grabadas: no hace falta clave de API ni buzón. Compila una vez (Paso 2) y después:

```bash
# macOS / Linux
DEMO_MODE=1 npm start
```

```powershell
# Windows PowerShell
$env:DEMO_MODE="1"; npm start
```

Para desactivar el modo demo, detén la app con Ctrl+C y vuelve a arrancarla desde una terminal nueva. En la misma ventana de PowerShell, ejecuta antes `Remove-Item Env:DEMO_MODE` y luego `npm start`.

## Con npx (cuando se publique en npm)

Es un camino futuro: el paquete aún no está en npm, así que hoy no funciona. Cuando se publique no hará falta descargar nada:

```bash
npx jev-mail-filtering           # abre http://127.0.0.1:3737 en tu navegador (--no-open para evitarlo)
npx jev-mail-filtering --demo    # bandeja de demostración
```

## Docker

Una alternativa si prefieres contenedores. Necesitas [Docker](https://www.docker.com/products/docker-desktop/) y el código de la Opción A o B. En la carpeta del proyecto:

```bash
# macOS / Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Abre `.env` con un editor de texto y rellena `TYPESAFE_API_KEY` e `IMAP_PASSWORD`. Después:

```bash
docker compose up -d
```

Abre <http://127.0.0.1:3737> y completa el asistente (servidor y dirección de correo; la contraseña se lee de `.env`). Detenlo con `docker compose down`. El puerto se publica solo en `127.0.0.1` y los datos viven en el volumen de Docker `jev-data`. En este modo los secretos están en texto plano en `.env`, así que protege ese fichero.

## Uso diario

- **Volver a arrancarla:** abre una terminal en la carpeta del proyecto y ejecuta `npm start`; luego abre <http://127.0.0.1:3737>.
- **Detenerla:** pulsa Ctrl+C en la terminal.
- **Actualizar:** ejecuta `git pull` (Opción B), o descarga el ZIP nuevo (Opción A) y descomprímelo en una carpeta nueva. Después, en la carpeta del proyecto, ejecuta `npm install` y a continuación `npm run build`.
- **Dónde se guardan tus datos:** en `~/.jev-mail-filtering` (Windows: `%USERPROFILE%\.jev-mail-filtering`). Tu clave de API y tu contraseña de aplicación se guardan en el llavero de tu sistema operativo (el Administrador de credenciales en Windows).
- **Desinstalar y borrarlo todo:** en la app elige **Configuración → Borrar todos los datos locales** (elimina la base de datos local, tu configuración y las credenciales guardadas; tu buzón no se toca) y después borra la carpeta del proyecto. Revoca la contraseña de aplicación en tu proveedor de correo y borra la clave de API en la consola de TypeSafe si ya no las usas.

## Solución de problemas

| Problema | Qué hacer |
|---|---|
| **El puerto 3737 está en uso** | `npm start` usa siempre el puerto 3737, así que libéralo. Puede que un `npm start` anterior siga abierto en otra terminal (pulsa Ctrl+C allí). Si no, busca el proceso: en Windows ejecuta `netstat -ano \| findstr :3737` y ciérralo con `taskkill /PID <id> /F`; en macOS/Linux ejecuta `lsof -i :3737` y `kill <pid>`. |
| **Versión de Node.js incorrecta** | Ejecuta `node -v`. Debe mostrar v22 o superior; si no, instala Node.js 22 LTS desde [nodejs.org](https://nodejs.org) y abre una terminal nueva. |
| **`npm install` falla al compilar módulos nativos** | Usa Node.js 22 LTS. En Windows, vuelve a ejecutar el instalador de Node.js y marca **Automatically install the necessary tools** (Tools for Native Modules). |
| **Gmail rechaza la contraseña de aplicación** | La verificación en dos pasos debe estar activa y las contraseñas de aplicación permitidas. Los administradores de Google Workspace pueden bloquear IMAP o las contraseñas de aplicación. Consulta la [guía de Gmail](docs/setup/gmail.es.md). |
| **No se clasifica nada, o «Tu clave de TypeSafe fue rechazada o no tiene saldo»** | Jev está en acceso anticipado: comprueba que tu clave tiene acceso y que tu cuenta tiene saldo. Verificar la clave en el asistente no cuesta nada. |
| **Los correos no se marcan como leídos** | Es intencionado. La app nunca modifica tu buzón. |

## Privacidad

Por cada correo, la app envía una petición a TypeSafe con:

- el inicio del texto, en texto plano (2.000 caracteres como máximo);
- el nombre y la dirección del remitente, el asunto, y tu propio nombre y dirección;
- los dominios de los enlaces (no las URL completas) y los nombres de los adjuntos (no su contenido);
- las señales que la app ha calculado en local (por ejemplo, «autenticación del remitente fallida»).

**No** envía cabeceras completas, adjuntos, el cuerpo completo, fechas ni nada de otros correos. TypeSafe declara que no entrena con datos de sus clientes; la retención cero de datos solo existe en su plan enterprise. Detalles, y cómo borrarlo todo, en [PRIVACY.md](PRIVACY.md).

## Precisión

Evaluado con `jev-1.13.0` sobre los 50 correos de la bandeja de demostración (inglés y castellano), con los umbrales por defecto:

| Categoría | Precisión | Exhaustividad (recall) | Correos |
|---|---|---|---|
| Necesario contestar | 100 % | 100 % | 12 |
| Interesante de revisar | 100 % | 100 % | 12 |
| Comercial | 100 % | 100 % | 12 |
| Posible estafa | 100 % | 100 % | 12 |
| Otros (ruido) | 100 % | 100 % | 2 |
| **Global** | | **100 %** (50/50) | Inglés 100 % · Castellano 100 % |

Lee estas cifras con cuidado: el conjunto de evaluación son 50 correos ficticios escritos por el autor, cada uno con una etiqueta clara. Las bandejas reales son más complicadas, así que espera una precisión menor en la tuya. Informe completo en [docs/eval-results.md](docs/eval-results.md); reprodúcelo con `npm run eval`.

> **La detección de estafas es orientativa. No confíes en ella a ciegas.** Que un correo no esté en *Posible estafa* no garantiza que sea seguro.

## Cómo funciona

```
IMAP (solo lectura) ──► señales (código) ──► Jev: 9 preguntas ──► política (código) ──► tu bandeja
                        SPF/DKIM/DMARC,       una llamada por      umbrales,
                        dominios parecidos,   correo, prob.        «seguridad primero»
                        enlaces engañosos     tipadas
```

El código determinista comprueba lo que se puede verificar (resultados de autenticación, dominios que imitan marcas, enlaces cuyo texto y destino no coinciden, adjuntos peligrosos). Jev juzga lo que requiere entender el lenguaje (¿alguien te pide que hagas algo?, ¿es presión o suplantación?). Una función de política pequeña y pura combina ambas cosas en la categoría final. El código controla el flujo; el modelo solo responde preguntas acotadas. Arquitectura, las nueve preguntas y las reglas de decisión: [docs/how-it-works.md](docs/how-it-works.md) (en inglés).

## Requisitos

- Node.js 22 o superior, o Docker.
- Una clave de API de TypeSafe con acceso a Jev (ahora en acceso anticipado). Sin ella puedes usar igualmente la demo.
- Un buzón con IMAP y contraseñas de aplicación: Gmail, iCloud Mail, Yahoo Mail o cualquier servidor IMAP estándar. Outlook/Hotmail aún no está soportado (exige OAuth).

## Hoja de ruta

- Outlook y Microsoft 365 (OAuth).
- Extracción de fechas límite en los correos que necesitan respuesta.
- Una demo alojada en la web.

## Contribuir y seguridad

Consulta [CONTRIBUTING.md](CONTRIBUTING.md). Para informar de una vulnerabilidad, consulta [SECURITY.md](SECURITY.md).

## Licencia

[MIT](LICENSE). Hecho por [acastell.dev](https://acastell.dev).
