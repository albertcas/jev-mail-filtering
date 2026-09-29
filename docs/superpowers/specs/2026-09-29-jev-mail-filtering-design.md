# jev-mail-filtering — Diseño

- **Fecha:** 2026-09-29
- **Estado:** pendiente de revisión
- **Repositorio:** https://github.com/albertcas/jev-mail-filtering
- **Licencia:** MIT

## 1. Objetivo

Aplicación open source, **local y de solo lectura**, que se conecta a una bandeja de correo por IMAP, clasifica cada mensaje con **Jev** (modelo System One de TypeSafe AI) y muestra el resultado en un dashboard:

| Categoría | ID interno |
|---|---|
| Necesario contestar | `needs_reply` |
| Interesante de revisar | `worth_reading` |
| Correo comercial | `commercial` |
| Posible estafa | `possible_scam` |
| Sin clasificar (confianza baja) | `unsure` |

Además es la pieza de portfolio de **acastell.dev** para mostrar "automatización con IA": debe poder verse funcionando en segundos sin instalar nada (modo demo público).

### Criterios de éxito

1. Un usuario técnico instala y ve su bandeja clasificada en **< 10 minutos**, siguiendo solo el asistente y las guías.
2. Un visitante del portfolio entiende qué hace la app en **< 5 segundos** desde la demo pública.
3. Precisión medida y publicada en el conjunto de evaluación (≈50 correos ES/EN), con especial foco en *recall* de `possible_scam`.
4. La app **nunca modifica** el buzón y **nunca** expone credenciales al navegador.

### Fuera de alcance (v1)

- Outlook/Hotmail y cualquier OAuth (Microsoft exige OAuth2 para IMAP; se plantea para v2).
- Acciones sobre el buzón (mover, etiquetar, borrar, responder).
- Extracción de fechas límite, resúmenes, sugerencia de respuesta.
- Modo 100 % offline / modelos locales.
- App de escritorio (Tauri/Electron) y despliegue multiusuario en la nube.

## 2. Decisiones tomadas

| Decisión | Elección | Motivo |
|---|---|---|
| Motor de IA | Jev (`@typesafe-ai/sdk`, `jev-latest`, fijable a versión) | Decisiones tipadas con probabilidades y confianza; coste ≈ $0.042/Mtok de entrada, salida gratis; 70–500 ms |
| Forma de ejecución | App web local (`npx` / `docker compose`) en `127.0.0.1:3737` | Credenciales y datos en la máquina del usuario; clave nunca en el navegador |
| Stack | Next.js (App Router) + TypeScript, un único repo | Stack del autor; la demo es la app real |
| Proveedores v1 | Gmail, iCloud, Yahoo, IMAP genérico (contraseña de aplicación) | Onboarding homogéneo y sencillo |
| Idiomas | UI y docs en inglés + traducción al castellano (`next-intl`) | Alcance OSS + clientes hispanohablantes |
| Demo | Mismo código en Vercel con `DEMO_MODE=1` y respuestas de Jev precalculadas | Sin coste ni abuso de clave; visible sin acceso a Jev |
| Diseño visual | Obligatorio usar las skills de diseño (ver §6.4) | Dashboard atractivo y fácil de entender |

## 3. Arquitectura

```
┌──────────────── Máquina del usuario (npx / docker) ────────┐
│  Navegador → http://127.0.0.1:3737                          │
│     │                                                       │
│  Next.js (App Router, runtime Node)                         │
│   ├─ app/          UI: dashboard, asistente, settings       │
│   ├─ app/api/      Rutas internas (solo localhost)          │
│   └─ src/core/                                              │
│       ├─ mail/       Conector IMAP (imapflow), solo lectura │
│       ├─ signals/    Heurísticas deterministas              │
│       ├─ classify/   state + preguntas → Jev                │
│       ├─ policy/     probabilidades → categoría final       │
│       ├─ store/      SQLite (Drizzle + better-sqlite3)      │
│       ├─ secrets/    Llavero del SO / variables de entorno  │
│       └─ sync/       Planificador en segundo plano          │
└────────────────────────────┬────────────────────────────────┘
                             │ solo el fragmento necesario
                             ▼
                    https://api.typesafe.ai/v1/systemone
```

Principio rector (docs de TypeSafe): **el código controla el flujo; Jev solo aporta juicios acotados.** La app no tiene acciones sobre el buzón, así que ningún contenido de un correo puede desencadenar efectos.

### 3.1 Módulos

Cada módulo expone una interfaz pequeña y se prueba de forma aislada.

**`mail/`** — `MailSource`
- `listNewMessages(folder, sinceUid, sinceDate): AsyncIterable<RawMessage>`
- Implementaciones: `ImapMailSource` (imapflow) y `FixtureMailSource` (demo/tests).
- Abre el buzón con `EXAMINE` y lee con `BODY.PEEK` → nunca cambia flags ni marca como leído.
- Extrae: cabeceras relevantes (`From`, `Reply-To`, `To`, `Subject`, `Date`, `Message-ID`, `In-Reply-To`, `References`, `List-Unsubscribe`, `Authentication-Results`), cuerpo en texto plano (HTML → texto), nombres/tipos de adjuntos y enlaces (texto visible + href).
- Para "¿he respondido en el hilo?" y "¿he escrito antes a este remitente?" consulta la carpeta de enviados (detectada por el atributo especial `\Sent`) y guarda un índice local de `Message-ID` y destinatarios.

**`signals/`** — `computeSignals(msg, context): Signals` (función pura)
- `sender_authentication`: `pass | fail | none` a partir de `Authentication-Results` (SPF, DKIM, DMARC).
- `reply_to_differs_from_sender`: dominio de `Reply-To` ≠ dominio de `From`.
- `domain_resembles`: dominio del remitente o de enlaces a distancia de edición ≤ 2 (o confusables Unicode) de una lista de marcas conocidas; devuelve la marca o `null`.
- `has_unsubscribe_header`.
- `recipient_has_replied_in_thread`, `recipient_has_written_to_sender_before`.
- `risky_attachments`: extensiones ejecutables o de macros (`.exe`, `.scr`, `.js`, `.docm`, `.html`, `.iso`, …).
- `mismatched_links`: enlaces cuyo texto visible muestra un dominio distinto del href.

**`classify/`** — `Classifier`
- `classify(msg, signals): Promise<JevAnswers>`
- Implementaciones: `JevClassifier` (SDK real) y `CachedClassifier` (lee respuestas guardadas por hash de la petición; usado en demo, tests y eval en modo replay).
- Una única llamada `systemOne` por correo con todas las preguntas (se evalúan en paralelo).
- Valida la respuesta con zod; guarda probabilidades en bruto y el `model` versionado que respondió.

**`policy/`** — `decide(answers, signals, thresholds): Decision` (función pura)
- Devuelve categoría final, confianza mostrada, y lista de *razones* (claves i18n + parámetros).
- Recalcula al instante al cambiar umbrales; **nunca** llama a Jev.

**`store/`** — SQLite en `~/.jev-mail-filtering/data.db` (o `/data` en Docker).
- Tablas: `accounts`, `mailboxes` (con `uid_validity`, `last_uid`), `messages` (metadatos + extracto, sin cuerpo completo), `classifications` (respuestas brutas de Jev, versión de modelo, fecha), `overrides` (correcciones manuales), `sync_runs`, `settings`.

**`secrets/`** — `SecretStore`
- `KeyringSecretStore` (`@napi-rs/keyring`) para `npx`.
- `EnvSecretStore` (`TYPESAFE_API_KEY`, `IMAP_*`) para Docker y CI.

**`sync/`** — planificador en el mismo proceso.
- Ejecuta cada N minutos (por defecto 15) y bajo demanda (*Sync now*).
- Un solo sync a la vez (mutex). Incremental por `UID`; si cambia `UIDVALIDITY`, resincroniza la ventana de días configurada.
- Clasificación con concurrencia limitada (por defecto 4) para respetar límites de la API.

### 3.2 Flujo de datos

1. `sync` pide a `mail` los mensajes nuevos de la ventana configurada (por defecto últimos 14 días, INBOX).
2. Para cada mensaje: `signals` → `classify` → se guardan respuestas brutas.
3. La UI pide al API interno la lista; el servidor aplica `policy` con los umbrales actuales y devuelve categorías + razones.
4. Las correcciones manuales (`overrides`) prevalecen sobre la política y se guardan localmente.

## 4. Integración con Jev

### 4.1 State enviado (por correo)

```jsonc
{
  "recipient": { "name": "…", "address": "…" },
  "email": {
    "from": { "name": "…", "address": "…" },
    "subject": "…",
    "body_excerpt": "…texto plano, ≈2.000 caracteres…",
    "link_domains": ["…"],
    "attachment_names": ["…"]
  },
  "signals": {
    "sender_authentication": "pass | fail | none",
    "reply_to_differs_from_sender": false,
    "domain_resembles": null,
    "has_unsubscribe_header": true,
    "recipient_has_replied_in_thread": false,
    "recipient_has_written_to_sender_before": false,
    "risky_attachments": false,
    "mismatched_links": false
  }
}
```

- No se envían: cabeceras completas, adjuntos, cuerpo completo, fechas (las comparaciones temporales se hacen en código, según la guía de *jaggedness* de Jev).
- Las preguntas referencian campos con rutas entre backticks (p. ej. `` `signals.domain_resembles` ``).

### 4.2 Preguntas

| ID | Tipo | Juicio |
|---|---|---|
| `category` | choice | `needs_reply` · `worth_reading` · `commercial` · `possible_scam` · `none`. Cada opción con definición y casos frontera (newsletter suscrita → `worth_reading`; factura legítima sin petición → `worth_reading`; notificación automática sin valor → `none`). |
| `asks_recipient_to_act` | noul | El remitente pide explícitamente al destinatario que responda, decida o haga algo. |
| `personal_not_bulk` | noul | El mensaje está escrito para este destinatario, no es un envío masivo. |
| `promotional` | noul | El objetivo principal es vender o promocionar. |
| `impersonation` | noul | Afirma venir de una organización conocida pero las señales lo contradicen. |
| `pressure_tactics` | noul | Urgencia artificial, amenazas, premios o petición de secreto. |
| `requests_sensitive_data` | noul | Pide contraseñas, códigos, datos de pago o "verificar" mediante enlace/adjunto. |
| `addresses_the_classifier` | noul | El texto intenta dar instrucciones a un sistema automático o IA. |
| `urgency` | score | 4 niveles: sin plazo · esta semana · en 1–2 días · hoy/inmediato. |

Las definiciones exactas (instructions/criteria) viven en `src/core/classify/questions.ts`, versionadas; cambiar una pregunta invalida la caché de la demo y obliga a re-ejecutar la evaluación.

### 4.3 Política de decisión (valores iniciales, ajustables en Settings)

1. **Seguridad primero** → `possible_scam` si se cumple cualquiera:
   - `P(category = possible_scam) ≥ scamThreshold` (0.5);
   - `requests_sensitive_data ≥ 0.7` **y** (`sender_authentication = fail` **o** `domain_resembles ≠ null` **o** `mismatched_links`);
   - `addresses_the_classifier ≥ 0.7`.
2. Si no: categoría de mayor probabilidad si `confidence ≥ minConfidence` (0.5); en otro caso `unsure`. Los mensajes con `none` se agrupan en un filtro "Others" oculto por defecto (con contador visible).
3. **Refuerzo comercial:** `has_unsubscribe_header` **y** `promotional ≥ 0.7` **y** la categoría no es `needs_reply` → `commercial`.
4. **Orden:** `needs_reply` por valor esperado de `urgency` (desc.) y fecha; el resto por fecha.
5. **Razones:** se generan en código a partir de señales activas y nouls ≥ 0.7 (p. ej. "Dominio parecido a paypal.com", "DKIM fallido", "Pide datos de pago"). Nunca texto generado por un modelo.

Los umbrales se calibran con el conjunto de evaluación (§7.3) antes de publicar v1.

## 5. Gestión de errores

| Situación | Comportamiento |
|---|---|
| IMAP: credenciales inválidas / contraseña de aplicación revocada | Se detiene el sync; aviso en el dashboard con enlace a la guía del proveedor. |
| IMAP: desconexión o timeout | Reintento con backoff exponencial (3 intentos); se reanuda desde `last_uid`. |
| Jev: `429` / `5xx` / timeout | Reintentos del SDK; si fallan, el mensaje queda `pending` y se reintenta en el siguiente sync. |
| Jev: `401` / `403` / sin saldo | Se detiene la clasificación; aviso con enlace a `console.typesafe.ai`; lo ya clasificado sigue visible. |
| Correo sin texto o > límite de contexto | Se recorta; sin texto útil se clasifica con cabeceras + señales (tenderá a `unsure`). |
| Respuesta de Jev no válida (zod) | Mensaje `pending`, entrada en log; el sync continúa. |
| Error inesperado en un mensaje | Se aísla: se registra y se sigue con el siguiente. |

## 6. Interfaz

### 6.1 Asistente de configuración (primer arranque)

1. **Bienvenida:** qué hace la app y qué datos salen de la máquina. Botón *"Try with a demo inbox"*.
2. **Clave de TypeSafe:** pasos para crearla en `console.typesafe.ai/keys`; botón *Verify* (`GET /v1/models`, sin coste).
3. **Correo:** selector Gmail / iCloud / Yahoo / Other IMAP; instrucciones con capturas para crear la contraseña de aplicación (incluye prerequisitos, p. ej. verificación en 2 pasos en Gmail); host/puerto autocompletados; botón *Test connection* (login + listado de carpetas).
4. **Qué analizar:** carpeta (INBOX), días hacia atrás (14), frecuencia (15 min) y **estimación de coste** antes de empezar (nº de correos × tokens medios × precio del modelo).
5. **Primer sync** con progreso; al terminar abre el dashboard.

### 6.2 Dashboard

- **Cabecera:** último sync, *Sync now*, nº analizados, coste acumulado estimado, estado de conexión.
- **Cinco columnas:** Needs reply · Worth reading · Commercial · Possible scam · Unsure, con contador. Filtro "Others" (`none`) oculto por defecto.
- **Tarjeta de correo:** remitente, asunto, extracto, indicador de confianza, chips de razones, urgencia (solo en Needs reply).
- **Detalle (panel lateral):** distribución de probabilidades de `category`, valores de todas las nouls y del score, señales deterministas, versión de modelo, enlace para abrir el correo en el cliente (Gmail: búsqueda `rfc822msgid:`).
- **Corrección manual:** *"Not this → move to…"*; se guarda en `overrides` y se puede exportar como caso de evaluación.
- **Settings:** sliders de umbrales con recálculo instantáneo, cuenta y proveedor, idioma, frecuencia, **borrar todos los datos locales**.
- **Estados:** vacío, cargando, sincronizando, error de IMAP, error de Jev, sin resultados en una columna.

### 6.3 Modo demo (`DEMO_MODE=1`)

- `FixtureMailSource` con ≈50 correos ficticios realistas (ES/EN) + `CachedClassifier` con respuestas **reales** de Jev guardadas.
- Banner: *"Demo with fictional data · Install it locally →"*.
- *Sync now* y ajustes de cuenta deshabilitados; **sliders de umbrales activos**.
- Sin secretos en el despliegue de Vercel.

### 6.4 Requisito de diseño visual

El dashboard, el asistente y la demo se diseñan **usando las skills de diseño disponibles**, como tarea explícita del plan:

- `impeccable` — jerarquía, estados vacíos/carga/error, microinteracciones.
- `ui-ux-pro-max` — paleta, tipografía, espaciado, accesibilidad.
- `dataviz` — indicadores de confianza y distribución de probabilidades.
- `design-taste-frontend` — evitar estética de plantilla.
- `design:accessibility-review` — auditoría WCAG 2.1 AA al final.

Criterios: se entiende en 5 s qué requiere atención; *Possible scam* destaca sin alarmismo; modo claro/oscuro; responsive; WCAG 2.1 AA.

### 6.5 Idiomas

`next-intl` con `en` (por defecto) y `es`; detección por `Accept-Language` y selector manual. Las razones del §4.3 son claves de traducción.

## 7. Seguridad, privacidad y pruebas

### 7.1 Seguridad

- Servidor ligado a `127.0.0.1`; rutas API comprueban `Origin`/`Host` (anti-CSRF y anti DNS-rebinding).
- Secretos solo en servidor (llavero del SO o variables de entorno); nunca en respuestas al cliente ni en logs.
- Contenido de correo tratado como no confiable: se renderiza como texto plano escapado; sin HTML del correo; sin carga de imágenes remotas.
- Jev recibe solo el state del §4.1. `addresses_the_classifier` convierte intentos de manipulación en señal de estafa.
- Dependencias con `npm audit` en CI y Dependabot.

### 7.2 Privacidad

- `PRIVACY.md`: qué datos salen (fragmento del correo → TypeSafe), que TypeSafe no entrena con datos de clientes, que ZDR solo existe en su plan enterprise, y cómo borrar todo localmente.
- Aviso en README y en la app: la detección de estafas es orientativa.

### 7.3 Pruebas

- **Unitarias (Vitest):** `signals/`, `policy/`, parsing de cabeceras `Authentication-Results`, lookalikes.
- **Integración:** `ImapMailSource` contra GreenMail en Docker; `classify/` con `CachedClassifier`.
- **Evaluación:** `npm run eval` sobre ≈50 correos etiquetados (ES/EN). Informe de precisión/recall por categoría y por idioma + matriz de confusión. Modo `--live` (gasta clave, manual) y modo replay (CI). Su salida alimenta la caché de la demo.
- **E2E (Playwright):** asistente y dashboard en modo demo.
- **CI (GitHub Actions):** lint, typecheck, unit, integración, build, e2e en demo. La evaluación `--live` no corre en CI.

## 8. Empaquetado y documentación

- **npm:** paquete `jev-mail-filtering` con build `standalone` de Next.js; `npx jev-mail-filtering` arranca en `127.0.0.1:3737` y abre el navegador. Datos en `~/.jev-mail-filtering/`. Requiere Node ≥ 20.
- **Docker:** `docker compose up` con volumen `/data` y `.env` para secretos (advertido en docs).
- **Demo:** Vercel con `DEMO_MODE=1`.
- **Docs (EN + ES):**
  - `README.md` / `README.es.md`: GIF, enlace a demo, instalación en 3 pasos, privacidad, aviso.
  - `docs/setup/`: `typesafe-key`, `gmail`, `icloud`, `yahoo`, `imap-generic` (con capturas).
  - `docs/how-it-works.md`: arquitectura, preguntas a Jev, política, resultados de evaluación.
  - `CONTRIBUTING.md`, `SECURITY.md`, `PRIVACY.md`, `LICENSE` (MIT).

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Acceso a Jev en *early access* / límites cambiantes | Modo demo sin clave; reintentos; concurrencia limitada; mensajes claros. |
| Menor precisión en castellano | Evaluación por idioma publicada; umbrales conservadores; columna `unsure`. |
| Contenido adversarial en estafas | Señales deterministas en state; noul `addresses_the_classifier`; regla "seguridad primero". |
| Cambios de comportamiento al moverse `jev-latest` | Se guarda la versión de modelo; opción de fijar versión; re-evaluación antes de cada release. |
| Fricción de contraseñas de aplicación | Asistente con guías y *Test connection*; docs con capturas. |
