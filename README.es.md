# JEV Mail Filtering

🇬🇧 [Read in English](README.md)

**Tu bandeja de entrada, ordenada por IA, en tu propio ordenador.** JEV Mail Filtering lee tu buzón por IMAP (solo lectura), hace unas pocas preguntas precisas sobre cada correo a Jev, el modelo de [TypeSafe](https://typesafe.ai), y lo ordena todo en un panel: qué necesita respuesta, qué merece la pena leer, qué es publicidad y qué parece una estafa.

![Panel de la bandeja de demostración: correos repartidos en Necesario contestar, Interesante de revisar, Comercial, Posible estafa y Sin clasificar](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/demo.gif)

Puedes probarlo sin clave de API ni buzón: el modo demo usa 50 correos ficticios y respuestas de Jev grabadas. Ejecútalo [desde el código fuente](#desde-el-código-fuente) con `DEMO_MODE=1 npm start`. Está prevista una demo alojada en la web.

## Qué hace

| Columna | Qué va ahí |
|---|---|
| **Necesario contestar** | Una persona espera tu respuesta, una decisión o que hagas algo. Ordenado por urgencia. |
| **Interesante de revisar** | Útil, pero sin necesidad de responder: newsletters a las que te suscribiste, recibos, avisos de tus cuentas. |
| **Comercial** | Marketing y prospección comercial. |
| **Posible estafa** | Indicios de phishing o fraude: dominios que imitan a otros, autenticación del remitente fallida, peticiones de contraseñas o pagos. |
| **Sin clasificar** | Jev no tenía suficiente confianza, así que la app no se la juega. |

El ruido automático (rebotes, resúmenes de redes sociales) va a un filtro **Otros**, oculto por defecto.

- **Solo lectura.** El buzón se abre con `EXAMINE` y se lee con `BODY.PEEK`: no se mueve, borra, etiqueta ni marca como leído nada.
- **Local.** La app se ejecuta en `127.0.0.1:3737`. Tus ajustes, resultados y credenciales se quedan en tu ordenador.
- **Explicable.** Cada tarjeta muestra por qué está ahí («Dominio parecido a paypal», «Autenticación del remitente fallida», «Pide datos sensibles»). Las razones las genera el código, nunca un modelo.
- **Ajustable.** Mueve los controles de umbral y las columnas se actualizan al instante, sin volver a llamar a Jev.

| Claro | Oscuro | Móvil |
|---|---|---|
| ![Panel, tema claro](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/dashboard-light.png) | ![Panel, tema oscuro](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/dashboard-dark.png) | ![Panel en un móvil](https://raw.githubusercontent.com/albertcas/jev-mail-filtering/main/docs/assets/mobile.png) |

## Inicio rápido

Necesitas Node.js 22 o superior, una clave de API de TypeSafe con acceso a Jev y una cuenta de correo que admita contraseñas de aplicación.

1. **Arranca la app** [desde el código fuente](#desde-el-código-fuente) (o [con npx](#con-npx-cuando-se-publique-en-npm) cuando el paquete se publique en npm) y abre `http://127.0.0.1:3737`. El asistente de configuración te guía en el resto.
2. **Crea una clave de API de TypeSafe:** consulta [docs/setup/typesafe-key.es.md](docs/setup/typesafe-key.es.md).
3. **Crea una contraseña de aplicación para tu buzón:** [Gmail](docs/setup/gmail.es.md) · [iCloud Mail](docs/setup/icloud.es.md) · [Yahoo Mail](docs/setup/yahoo.es.md) · [Otro IMAP](docs/setup/imap.es.md).

El asistente comprueba la clave y la conexión, muestra una estimación de coste y lanza la primera sincronización. Después, la app sincroniza cada 15 minutos (configurable) mientras está en marcha. Las credenciales se guardan en el llavero de tu sistema operativo y los datos en `~/.jev-mail-filtering/`.

### Desde el código fuente

```bash
git clone https://github.com/albertcas/jev-mail-filtering.git
cd jev-mail-filtering
npm install
npm run build
npm start                  # tu bandeja: asistente de configuración en http://127.0.0.1:3737
DEMO_MODE=1 npm start      # o la bandeja de demostración: sin clave ni buzón
```

En Windows PowerShell, arranca la demo con `$env:DEMO_MODE="1"; npm start`. `npm start` muestra un aviso de Next.js sobre `output: standalone`; puedes ignorarlo.

### Con npx (cuando se publique en npm)

Cuando el paquete esté publicado en npm, no hará falta clonar el repositorio:

```bash
npx jev-mail-filtering           # abre http://127.0.0.1:3737 en tu navegador (--no-open para evitarlo)
npx jev-mail-filtering --demo    # bandeja de demostración
```

### Docker

```bash
git clone https://github.com/albertcas/jev-mail-filtering.git
cd jev-mail-filtering
cp .env.example .env    # después rellena TYPESAFE_API_KEY e IMAP_PASSWORD
docker compose up -d
```

Abre `http://127.0.0.1:3737` y completa el asistente (servidor y dirección de correo; la contraseña se lee de `.env`). El puerto se publica solo en `127.0.0.1` y los datos viven en el volumen `jev-data`. En este modo los secretos están en texto plano en `.env`, así que protege ese fichero.

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
IMAP (solo lectura) ──► señales (código) ──► Jev: 9 preguntas ──► política (código) ──► panel
                        SPF/DKIM/DMARC,       una llamada por      umbrales,
                        dominios parecidos,   correo, prob.        «seguridad primero»
                        enlaces engañosos     tipadas
```

El código determinista comprueba lo que se puede verificar (resultados de autenticación, dominios que imitan marcas, enlaces cuyo texto y destino no coinciden, adjuntos peligrosos). Jev juzga lo que requiere entender el lenguaje (¿alguien te pide que hagas algo?, ¿es presión o suplantación?). Una función de política pequeña y pura combina ambas cosas en la columna final. El código controla el flujo; el modelo solo responde preguntas acotadas. Arquitectura, las nueve preguntas y las reglas de decisión: [docs/how-it-works.md](docs/how-it-works.md) (en inglés).

## Requisitos

- Node.js 22 o superior, o Docker.
- Una clave de API de TypeSafe con acceso a Jev (ahora en acceso anticipado). Sin ella puedes usar igualmente la demo.
- Un buzón con IMAP y contraseñas de aplicación: Gmail, iCloud Mail, Yahoo Mail o cualquier servidor IMAP estándar. Outlook/Hotmail aún no está soportado (exige OAuth).

## Hoja de ruta

- Outlook y Microsoft 365 (OAuth).
- Extracción de fechas límite en los correos que necesitan respuesta.

## Contribuir y seguridad

Consulta [CONTRIBUTING.md](CONTRIBUTING.md). Para informar de una vulnerabilidad, consulta [SECURITY.md](SECURITY.md).

## Licencia

[MIT](LICENSE). Hecho por [acastell.dev](https://acastell.dev).
