# Dirección de diseño: dashboard

Decisiones concretas para el dashboard, el asistente y la demo de JEV Mail Filtering. Los tokens viven en `src/app/globals.css`; las primitivas en `src/app/components/ui/`. Este documento es la fuente de verdad visual del producto. Desde el rediseño aprobado (dirección B, «cliente de correo») el dashboard ya no es un tablero de columnas: ver [Disposición: cliente de correo](#disposición-cliente-de-correo).

## Lectura del encargo

Herramienta de productividad (modo *Operate*) para una persona que abre su bandeja por la mañana y quiere saber en 5 segundos qué requiere atención. Local, de solo lectura, con datos densos y tono sereno. Es también la pieza principal del portfolio de acastell.dev, así que debe transmitir confianza y oficio sin parecer una plantilla.

Diales (design-taste-frontend / ui-ux-pro-max): varianza 4, movimiento 3, densidad 8 (`--density 8` en ui-ux-pro-max: escala de espaciado de dashboard, 4-32px).

## Principio rector

**Los neutros llevan la interfaz; el color se reserva para el significado.** Solo hay color en las cinco categorías y en los estados (error, aviso, éxito). La acción principal es tinta (casi negro en claro, casi blanco en oscuro), no un color de marca. Así la bandeja se lee como un mapa de calor de atención: lo que tiene color es lo que importa. La única gran masa oscura es el marco (la barra lateral), que es neutra.

Descartado a propósito: gradientes morados, glassmorphism, tarjetas idénticas sin jerarquía, bordes laterales de color gruesos en tarjetas, rojo saturado a pantalla completa, Inter por defecto, emoji como iconos.

## Disposición: cliente de correo

Aprobada por el usuario sobre la maqueta `layout-b-detail` (dirección B). Tres zonas, como un cliente de correo de escritorio, porque la tarea es la de uno: elegir una bandeja, recorrer correos y leer uno con su explicación al lado.

| Zona | Contenido | Decisiones |
|---|---|---|
| **Barra lateral** (oscura en claro y en oscuro) | logo «JEV Mail», **Sync now**, las seis categorías con contador, aviso de demo, estado (última sync, analizados, coste, conexión) y **Settings** | Es el marco, no contenido: un bloque de tinta en modo claro (`--sidebar` `#16191d`) y un escalón por debajo del lienzo en oscuro (`#0b0d10`). Cada categoría tiene **icono propio** (Phosphor, `bold`; escudo relleno para Possible scam) en su color de marca de barra lateral, así la identidad no depende del color ni en el carril de iconos. Solo *Needs reply* lleva el contador en píldora (lo único que pide acción); *Possible scam* lleva su contador en tinta cálida. *Unsure* y *Others* van tras un separador: son bandejas de revisión, no de acción. La categoría activa: fondo `--sidebar-raised` + peso medio + `aria-current`. |
| **Lista** | cabecera (icono, nombre, contador, orden: «Sorted by urgency» en Needs reply, «Newest first» en el resto) + **Adjust**; filas | Fila = remitente (semibold) + hora, asunto, extracto de una línea, chips: urgencia (solo Needs reply), marca «Moved by you» y hasta 2 razones. Filas redondeadas separadas por aire, sin reglas entre filas. Seleccionada: tinte de su categoría + **barra de acento interior de 3px redondeada** (no un borde lateral: el suelo de oficio veta bordes laterales de color de más de 1px). Aviso «Guidance only» encima de la lista de Possible scam. Estado vacío propio por categoría. |
| **Panel de lectura** | chip de categoría con confianza, urgencia, asunto, remitente + dirección + fecha, acciones, extracto en texto plano, **Why** | Por qué: razones, barras de probabilidad, señales verificadas, juicios de Jev y modelo. Acciones: «Open in Gmail» (solo Gmail real, nunca demo), «Not this? Move to…» (divulgación que muestra los destinos; deshabilitados en demo con el texto «Disabled in the demo»), «Undo my change» si hay override. Nota de aviso en tinte de Possible scam para esa categoría. Vacío: «Select an email» + pista de teclado. |

### Umbrales: botón «Adjust»

Popover no modal (`role="dialog"` etiquetado por «Decision thresholds») anclado a la cabecera de la lista. Reutiliza la lógica de `ThresholdPanel` a través del hook `useThresholdDraft` (borrador local + aviso al padre con 150 ms de debounce + Save explícito) y los campos compartidos `ThresholdFields`; Settings sigue usando el panel plegable. Al abrir, el foco va al primer deslizador; Esc lo cierra y devuelve el foco al botón; un clic fuera o tabular fuera lo cierra. Sigue montado cuando está cerrado (oculto con `hidden`) para no perder un cambio pendiente del debounce. Save solo fuera de la demo. La tecla `A` lo abre y cierra desde cualquier sitio salvo campos de texto o con un modal abierto; el botón lo anuncia con `aria-keyshortcuts="A"` y un `kbd` visible (oculto en táctil).

### Teclado y ARIA

- **Lista**: patrón `listbox` de selección única con **selección que sigue al foco** y **tabindex itinerante** (la fila seleccionada es la única con `tabIndex=0`, así Tab entra en ella). ↑/↓ mueven, Inicio/Fin saltan a los extremos (reductor puro `nextIndex` en `inbox.ts`, con tests). Enter o Espacio activan: en móvil abren la hoja; en escritorio mueven el foco al panel de lectura. Cada `option` se nombra con remitente, asunto y fecha (`aria-labelledby`) y se describe con sus chips (`aria-describedby`); `aria-selected` anuncia la selección.
- **Panel de lectura**: `section` con `tabIndex=-1` nombrada por el asunto (región). Esc dentro devuelve el foco a la fila seleccionada.
- **Categorías**: botones con `aria-current="true"` en la activa dentro de `nav` «Categories» (no son pestañas: cambian la vista de lista, no un panel adyacente). En el carril, el nombre sigue en texto `sr-only` y se muestra como tooltip al pasar el ratón y con foco de teclado.
- Enlace «Skip to the messages» como primer elemento enfocable; `h1` con el nombre de la app en `sr-only`.
- En escritorio el panel siempre muestra algo: la selección elegida o, si no hay, el primer correo de la lista (`resolveSelection`). Al mover un correo fuera de la lista, la selección pasa a su vecino (`neighborId`) y **el foco va a esa fila** cuando la lista se ha refrescado (`focusAfterMove`: la fila preferida si sigue en la lista, si no la primera, si no el contenedor de la lista), nunca se queda en `<body>`. En móvil la hoja se cierra con el correo movido aún montado y el foco pasa a la fila vecina en `onAfterClose`.
- **Extracto**: se guarda cortado a 280 caracteres; `displayExcerpt` lo recorta hasta el último espacio y añade «…» para no partir palabras. Etiqueta «Preview» / «Vista previa»; la subsección de razones se llama «Reasons» / «Motivos».

### Responsive

- **≥ 1280px**: barra lateral completa (16rem) + lista (22-27rem) + panel de lectura.
- **768-1279px**: la barra se reduce a un **carril de iconos** con contador bajo cada icono y tooltip; el estado (última sync, analizados, coste) pasa al pie de la lista, y el aviso de demo a la cabecera de la lista.
- **< 768px**: barra superior oscura (logo, Sync, Settings) + fila desplazable de categorías con contador (objetivos de 44px); lista a ancho completo; tocar un correo abre el panel de lectura a pantalla completa con el primitivo `Sheet` (Esc o ✕ cierran y el foco vuelve a la fila).
- Sin scroll horizontal de página a 375px (verificado).

## Paleta

Neutros pizarra fríos, sin `#fff` ni `#000` puros.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--canvas` | `#f4f5f6` | `#0f1114` | fondo de página, bloque del extracto |
| `--surface` | `#fcfcfd` | `#171a1e` | lista, panel de lectura, popover, inputs |
| `--sunken` | `#eceef1` | `#1f2328` | hover, esqueletos, tintes neutros. **Nunca bajo marcas de categoría ni como pista de meter** |
| `--ink` | `#15181c` | `#eceef0` | texto principal, botón primario |
| `--ink-2` | `#454c57` | `#b3bac4` | texto secundario, remitente, valores |
| `--ink-3` | `#5c6470` | `#8f97a3` | metadatos, extracto, ayudas (sigue ≥ 4.5:1) |
| `--line` | `#dfe2e6` | `#2b3036` | separadores decorativos |
| `--line-strong` | `#838b97` | `#6b7380` | bordes de controles y anillo de la pista del meter (≥ 3:1) |
| `--focus` | `#1d63c9` | `#6aa3f0` | anillo de foco 2px + offset 2px |
| `--danger` / `-tint` | `#b42318` / `#fcebe9` | `#f2877c` / `#3a1b19` | error IMAP/Jev, borrar datos |
| `--warning` / `-tint` | `#8a5300` / `#fbf1dc` | `#e8b64c` / `#322710` | servidor no disponible |
| `--success` / `-tint` | `#1b7342` / `#e5f3eb` | `#5cc98a` / `#132a1e` | clave verificada, conexión OK |

### Categorías

Cada categoría tiene tres tokens: **marca** (`--cat-x`, puntos, relleno de meter, reglas; ≥ 3:1 sobre canvas y surface), **tinta** (`--cat-x-ink`, texto; ≥ 4.5:1 sobre su tinte y sobre surface) y **tinte** (`--cat-x-tint`, fondo de badge).

| Categoría | Marca claro | Marca oscuro | Tinta claro / oscuro | Tinte claro / oscuro | Por qué |
|---|---|---|---|---|---|
| Needs reply | `#2a78d6` | `#3987e5` | `#1b58a8` / `#9dc3f4` | `#e7effb` / `#16253a` | azul: "te toca a ti", el color más frío y legible |
| Worth reading | `#119c6e` | `#199e70` | `#0b6b4c` / `#72d2a9` | `#e2f3ec` / `#11281f` | aguamarina: valor sin urgencia |
| Commercial | `#4a3aa7` | `#805d9a` | `#4a3aa7` / `#c6b2e6` | `#eeebf8` / `#251d33` | ciruela apagado: recede, es la columna más poblada |
| Possible scam | `#dc5a26` | `#d95926` | `#a33d12` / `#f5a47f` | `#fcebe3` / `#351f17` | naranja óxido: el tono más cálido y con más croma destaca sin ser el rojo de "error" |
| Unsure | `#7c8490` | `#7f8793` | `#454c57` / `#b3bac4` | `#eceef1` / `#1f2328` | gris neutro: "Jev no decidió" no merece un tono propio |
| Others (`none`) | igual que Unsure | | | | entrada propia en la barra lateral, tras Unsure; se distingue por su etiqueta e icono (bandeja) |

La paleta categórica (las cuatro con tono) se validó con el validador de la skill `dataviz` en modo **all-pairs** (cualquier par puede quedar contiguo porque las barras de probabilidad se ordenan por valor), contra la superficie real de cada modo:

```
light (surface #fcfcfd)  PASS lightness band · PASS chroma floor
  CVD separation  worst #dc5a26↔#119c6e ΔE 9.9 (deutan)   [target ≥ 8]
  Normal vision   worst #4a3aa7↔#2a78d6 ΔE 16.3           [floor ≥ 15]
  Contrast        all 4 ≥ 3:1
dark (surface #171a1e)   PASS lightness band · PASS chroma floor
  CVD separation  worst #d95926↔#199e70 ΔE 9.4 (deutan)
  Normal vision   worst #805d9a↔#3987e5 ΔE 15.6
  Contrast        all 4 ≥ 3:1
```

El modo oscuro es una selección propia, no una inversión: el violeta del claro (`#4a3aa7`) se confundía con el azul en oscuro (ΔE CVD 1.9), así que Commercial pasa a ciruela `#805d9a`, elegido por búsqueda contra el validador (primero `#7955a0`, que pasaba con 3.01:1 sobre surface; se subió a `#805d9a`, 3.28:1, para tener margen sin perder la separación CVD).

Aun así, **el color nunca va solo**: toda categoría aparece con su nombre escrito, y Possible scam lleva además icono de escudo (`ShieldWarning`).

### Tratamiento por categoría

- **Needs reply**: categoría inicial, la única con urgencia. En la fila, chip de urgencia con los cuatro criterios con los que se pregunta a Jev (`urgencyLevel`: Today / In 1-2 days / This week / No rush); «Today» en tinte azul con borde de marca, «In 1-2 days» con tinta azul. Contador en píldora en la barra lateral.
- **Worth reading**, **Commercial**: filas normales; el ciruela apagado hace retroceder a Commercial.
- **Possible scam**: sin alarmismo. Icono de escudo relleno, badge con escudo y chips de evidencia en tono `risk` (tinta naranja sobre tinte). Nada de fondos rojos a pantalla completa ni parpadeos. Destaca porque es el único tono cálido **entre las categorías** y el de más croma. Los tonos de estado `--danger` y `--warning` se reservan para banners y errores, nunca aparecen en filas, y siempre van con icono + texto.
- **Unsure**: gris; la fila explica por qué (chip «Minimum confidence n%»).
- **Others**: entrada propia de la barra lateral (antes estaba oculta tras un `ToggleChip`, que se ha eliminado).

## Tipografía

**IBM Plex Sans** (variable, 400/500/600) para toda la interfaz e **IBM Plex Mono** (400/500) solo para valores de máquina: id de modelo, Message-ID, puntuaciones crudas. Cargadas con `next/font/google` (`--font-plex-sans`, `--font-plex-mono`), `display: swap`, subsets latin + latin-ext.

Por qué: ui-ux-pro-max propuso Plus Jakarta Sans (SaaS amable) y la pareja "Developer Mono" (IBM Plex Sans + JetBrains Mono); design-taste-frontend veta Inter por defecto. Plex tiene herencia de herramienta seria, se lee bien a 13-14px, trae cifras tabulares y mantiene la cohesión de familia con su mono. Una sola familia para la UI (impeccable: en producto una familia suele bastar).

Escala fija en rem, razón ~1.14 (sin tipografía fluida en una herramienta):

| Utilidad | Tamaño / interlínea | Uso |
|---|---|---|
| `text-xs` | 12 / 16 | badges, chips, valores de meter |
| `text-sm` | 13 / 18 | metadatos, extracto, ayudas |
| `text-base` | 14 / 20 | cuerpo de UI, asunto, botones |
| `text-md` | 16 / 24 | prosa del asistente y del panel |
| `text-lg` | 18 / 24 | título del panel, secciones |
| `text-xl` | 22 / 28 | título de página (sin H1 gigantes) |

Números en filas y meters con `tabular-nums` (clase `.tabular`, y `time`/`data`).

## Espaciado, radios, sombras

- Rejilla de 4px: `--space-1..12` = 4, 8, 12, 16, 20, 24, 32, 40, 48px. Coincide con `--spacing: 0.25rem` de Tailwind (`p-4` = `--space-4`).
- Radios (bloqueo de forma): 4px marcas pequeñas (badge, meter), 6px controles (botón, input), 10px contenedores (tarjeta, banner), 14px panel lateral. Pastilla completa solo para chips.
- Sombras teñidas con el tono del fondo, con desplazamiento y desenfoque: `shadow-card` (casi imperceptible, separa tarjeta de canvas) y `shadow-raised` (panel lateral).

## Iconografía

`@phosphor-icons/react` (añadida como dependencia), import desde `@phosphor-icons/react/ssr` para que funcione en Server Components. Peso `regular` en contenido y `bold` a 16-18px en controles y banners. Iconos siempre `aria-hidden`; la etiqueta de texto nombra la acción. Iconos previstos: `ArrowsClockwise` (sync), `ShieldWarning` (scam), `Info`/`Warning`/`WarningCircle`/`CheckCircle` (banners), `X` (cerrar), `CircleNotch` (cargando), `ArrowSquareOut` (abrir en Gmail).

## Indicadores de datos (dataviz)

- **Confianza**: porcentaje escrito dentro del badge de categoría del panel de lectura («Needs reply 98%»); la lista no repite medidores, la fila ya está en su categoría.
- **Distribución de probabilidades (panel)**: barras horizontales ordenadas de mayor a menor, etiqueta directa a la izquierda y valor a la derecha, sin leyenda aparte. Es **una sola serie** sobre categorías nominales, así que todas las barras van en tinta neutra y **solo la categoría elegida** se pinta con su color de marca y su etiqueta en semibold. Barras de 8px, esquina 4px.
- **Umbrales**: la barra de Possible scam puede mostrar una marca vertical en el umbral `scam` actual para que el recálculo al mover el slider sea visible.
- Todo meter tiene `role="meter"` con `aria-valuetext` legible; el número siempre aparece en texto porque una barra fina sola no se lee.
- **Pista del meter**: `--surface` con anillo interior de 1px `--line-strong`. Así cada relleno (tinta neutra o cualquier marca de categoría) mide ≥ 3:1 contra lo que tiene debajo en ambos modos, y el límite de la escala también es visible (≥ 3:1). La pista nunca es `--sunken`: sobre ese fondo aguamarina y ciruela bajaban de 3:1.
- Valores no finitos (NaN, Infinity) se dibujan como el mínimo.

## Jerarquía, estados y microinteracciones (impeccable)

Jerarquía: la barra lateral oscura es el marco (Sync now es el único botón claro sobre ella); la cabecera de la lista nombra la bandeja y su orden; el asunto del panel de lectura es el titular más grande de la vista (22px). Analizados, coste y conexión son metadatos en `sidebar-ink-3` (o `ink-3` en el pie de la lista por debajo de 1280px).

Estados:

| Estado | Tratamiento |
|---|---|
| Cargando | esqueletos con la forma de la fila y del panel (bloques `--sunken`), sin spinners en el contenido |
| Sincronizando | `Sync now` en modo `loading` (spinner + "Syncing…", `aria-busy`), contador "n pending" con `role="status"`; las filas nuevas aparecen en su categoría y la selección se conserva |
| Vacío (sin datos) | explica qué pasará y ofrece la acción: conectar bandeja o probar la demo |
| Categoría vacía | frase propia por categoría («Nothing is waiting for your reply.») con icono de bandeja, centrada en la lista |
| Nada seleccionado | panel de lectura con «Select an email» y la pista de teclado (↑ ↓, A) |
| Error IMAP | `Banner` warning `live="polite"` en la cabecera de la lista: se muestran resultados guardados |
| Error Jev | `Banner` danger `live="assertive"` con acción "Fix it" |
| Demo | aviso compacto en la barra lateral (≥ 1280px) o `Banner` info en la cabecera de la lista, con "Install it locally →"; controles deshabilitados muestran "Disabled in the demo" |

Microinteracciones (150-280ms, `--ease-out` exponencial, todas a 0ms con `prefers-reduced-motion`):

- **Override** ("Not this? Move to…"): el correo sale de la lista, la selección pasa a su vecino y, en su categoría de destino, la fila entra con un desplazamiento corto + fundido (`--duration-move`, 280ms); se añade el chip "Moved by you" y un "Undo my change". Un solo momento de movimiento con sentido, no animaciones de entrada en toda la página.
- **Sliders de umbrales** (popover Adjust): recálculo con cada `input` (debounce 150 ms, sin botón de aplicar); los contadores de la barra lateral cambian en el acto y las filas que cambian de categoría usan la misma transición que el override. El valor se muestra en `<output>` junto a la etiqueta. El popover entra con escala 95% + fundido (`@starting-style`).
- **Selección de fila**: tinte y barra de acento con transición de color corta; sin movimiento.
- **Botones**: hover de color, `active:translate-y-px` como pulsación física.
- **Hoja de lectura en móvil** (`Sheet`): entra desde la derecha (`translate` + `@starting-style`), sale igual.

## Responsive

Ver [Disposición: cliente de correo](#disposición-cliente-de-correo). Objetivos táctiles de 44px con `pointer-coarse:` en botones, entradas de categoría, inputs y sliders.

## Modo oscuro

Una sola fuente por token: cada color se declara una vez como `light-dark(<claro>, <oscuro>)` en `:root`, con `color-scheme: light dark`, así que sigue a `prefers-color-scheme` sin bloques duplicados. Un futuro selector manual solo cambia el esquema: `:root[data-theme="light"]` / `[data-theme="dark"]` fijan `color-scheme` y no redefinen ningún valor. Cada valor oscuro está elegido y medido contra su propia superficie, no invertido. Las sombras usan `--shadow-color` con `color-mix()`. Tailwind 4 (Lightning CSS) compila `light-dark()` a un polyfill con `--lightningcss-light/dark` que respeta tanto la media query como `data-theme` (comprobado en el CSS generado y en el navegador).

### Barra lateral: tokens y contraste medido

Valores fijos (no se invierten): la barra es oscura en los dos esquemas. Medidos con `contrast()` de `scripts/validate_palette.js` (dataviz) contra `--sidebar`, `--sidebar-hover` y `--sidebar-raised` en ambos esquemas (60 pares, 0 fallos). Márgenes más justos, sobre `--sidebar-raised` en claro (`#272c33`): `--sidebar-ink-3` 5.07:1, marca de Possible scam 4.06:1, Commercial 4.23:1.

| Token | Valor (claro / oscuro) | Uso | Peor contraste |
|---|---|---|---|
| `--sidebar` | `#16191d` / `#0b0d10` | fondo | |
| `--sidebar-hover` · `--sidebar-raised` | `#20242a` · `#272c33` / `#15181c` · `#1c2026` | hover · categoría activa | |
| `--sidebar-ink` / `-2` / `-3` | `#eceef0` / `#b3bac4` / `#949ca8` | texto | 12.08 / 7.19 / 5.07 :1 |
| `--sidebar-accent` + `--sidebar-on-accent` | `#eceef0` + `#15181c` | botón Sync now | 15.31:1 |
| `--sidebar-focus` | `#6aa3f0` | anillo de foco dentro de `.sidebar-scope` | 5.43:1 |
| `--sidebar-cat-*` | `#4a8fe7` · `#1fa374` · `#b37ab0` · `#e0652f` · `#949ca8` | iconos de categoría | 4.06:1 (mín. 3) |
| `--sidebar-cat-possible-scam-ink` | `#f5a47f` | contador de Possible scam | 7.03:1 |
| píldora Needs reply | texto `--sidebar` sobre `#4a8fe7` | contador | 5.35:1 |

La paleta categórica de la barra se validó aparte (dataviz, `--pairs all`, superficie `#16191d`): banda de luminosidad y croma PASS, suelo de visión normal ΔE 15.4 PASS, CVD peor par Commercial↔Worth reading ΔE 7.9 (deutan), en la franja 6-8 que solo es legal con codificación secundaria: aquí cada categoría lleva **icono distinto y nombre escrito**. La primera propuesta (`#4f94ec`, `#2bb07f`, `#a283c6`, `#ee7443`) fallaba la banda de luminosidad y dejaba Commercial a ΔE 11.3 de Needs reply; se movió Commercial hacia un ciruela rosado y se oscurecieron verde y naranja.

El anillo de foco de modo claro (`#1d63c9`) no llega a 3:1 sobre la barra oscura, por eso `.sidebar-scope` redefine `--focus` con `--sidebar-focus`.

## Superficies del navegador

`::selection` con tinte azul, `caret-color` de foco, `accent-color` de tinta para range/checkbox nativos, `scrollbar-color` con `--line-strong`, subrayado con offset 0.2em, `::backdrop` con `--scrim`.

## Primitivas UI (`src/app/components/ui/`)

| Primitiva | Elemento | Comportamiento accesible |
|---|---|---|
| `Button` | `<button type="button">` | variantes primary/secondary/ghost/danger; `loading` → `aria-busy` + `aria-disabled` e ignora clics (sin `disabled`, para no perder el foco), spinner `aria-hidden`, etiqueta visible; foco 2px |
| `Badge` | `<span>` | etiqueta de categoría estática; punto o icono `aria-hidden` + texto (nunca solo color) |
| `Chip` | `<span>` | razón/señal no interactiva; tonos neutral/risk/trust |
| `Meter` | `<div role="meter">` | `aria-valuenow/min/max`, `aria-label`, `aria-valuetext`; valor visible en texto; pista surface + anillo `--line-strong`; valores no finitos = mínimo |
| `Slider` | `<input type="range">` | `<label for>` visible, `<output>` con el valor, `aria-valuetext` formateado, ayuda por `aria-describedby`; `onValueChange` en cada `input` |
| `Sheet` | `<dialog>` modal | `showModal()` (fondo inerte), `aria-labelledby` al título, Esc cierra con un único manejador (`cancel`) que llama a `onClose` una sola vez, Tab/Shift+Tab atrapados, cuerpo desplazable enfocable (`tabIndex=0`, región nombrada por el título), foco vuelve al disparador, clic en el fondo cierra solo si pointerdown y click ocurren ambos en el fondo; panel derecho desde 768px (`md`) y pantalla completa por debajo; `onAfterClose` se llama tras devolver el foco |
| `Banner` | `<div>` | icono + texto + tinte; `live`: off / polite (`role="status"`) / assertive (`role="alert"`) |
| `Field` (+ `Input`, `Select`) | `<label>` + control | etiqueta encima, ayuda y error debajo enlazados con `aria-describedby`, `aria-invalid`, `aria-required`; el error lleva icono; sin `"use client"` (usable desde Server Components) |

## Criterios de éxito (spec §6.4)

- [x] Se entiende en 5 s qué requiere atención: color solo en categorías, Needs reply abierta por defecto y ordenada por urgencia, contador en píldora en la barra lateral.
- [x] *Possible scam* destaca sin alarmismo: único tono cálido entre las categorías (danger/warning quedan fuera de las tarjetas), escudo + evidencia, sin rojo a pantalla completa.
- [x] Modo claro/oscuro: ambos seleccionados y medidos (tabla abajo).
- [x] Responsive: barra lateral → carril de iconos (768-1279px) → barra superior con selector de categorías y hoja de lectura a pantalla completa (< 768px).
- [x] WCAG 2.1 AA: axe sin infracciones en claro y oscuro (dashboard, panel de lectura con estafa, popover Adjust, Settings, asistente), también a 800 y 1024px.

## Contraste medido

Calculado con la función `contrast()` (WCAG 2.x, luminancia relativa) exportada por `scripts/validate_palette.js` de la skill `dataviz`, sobre cada par texto/fondo y elemento/fondo que usan las primitivas, incluidos los rellenos del meter contra su pista. Mínimos: 4.5:1 texto, 3:1 elementos de UI y marcas. **104 pares, 0 fallos.** Los márgenes más justos: `--line-strong` (claro) sobre canvas 3.15:1, marca de Worth reading (claro) sobre canvas 3.20:1, marca de Commercial (oscuro) sobre surface y sobre la pista del meter 3.28:1.

| Mode | Pair | FG | BG | Ratio | Min | Result |
|---|---|---|---|---|---|---|
| light | ink on canvas | `#15181c` | `#f4f5f6` | 16.31:1 | 4.5:1 | PASS |
| light | ink2 on canvas | `#454c57` | `#f4f5f6` | 7.94:1 | 4.5:1 | PASS |
| light | ink3 on canvas | `#5c6470` | `#f4f5f6` | 5.48:1 | 4.5:1 | PASS |
| light | ink on surface | `#15181c` | `#fcfcfd` | 17.37:1 | 4.5:1 | PASS |
| light | ink2 on surface | `#454c57` | `#fcfcfd` | 8.45:1 | 4.5:1 | PASS |
| light | ink3 on surface | `#5c6470` | `#fcfcfd` | 5.83:1 | 4.5:1 | PASS |
| light | ink on sunken | `#15181c` | `#eceef1` | 15.32:1 | 4.5:1 | PASS |
| light | ink2 on sunken | `#454c57` | `#eceef1` | 7.45:1 | 4.5:1 | PASS |
| light | ink3 on sunken | `#5c6470` | `#eceef1` | 5.14:1 | 4.5:1 | PASS |
| light | onAccent on accent | `#fcfcfd` | `#15181c` | 17.37:1 | 4.5:1 | PASS |
| light | lineStrong (control border) on surface | `#838b97` | `#fcfcfd` | 3.35:1 | 3:1 | PASS |
| light | lineStrong on canvas | `#838b97` | `#f4f5f6` | 3.15:1 | 3:1 | PASS |
| light | focus ring on surface | `#1d63c9` | `#fcfcfd` | 5.57:1 | 3:1 | PASS |
| light | focus ring on canvas | `#1d63c9` | `#f4f5f6` | 5.23:1 | 3:1 | PASS |
| light | accent (button fill) on canvas | `#15181c` | `#f4f5f6` | 16.31:1 | 3:1 | PASS |
| light | ink (banner text) on dangerTint | `#15181c` | `#fcebe9` | 15.43:1 | 4.5:1 | PASS |
| light | danger on dangerTint | `#b42318` | `#fcebe9` | 5.70:1 | 4.5:1 | PASS |
| light | danger on surface | `#b42318` | `#fcfcfd` | 6.41:1 | 4.5:1 | PASS |
| light | ink (banner text) on warningTint | `#15181c` | `#fbf1dc` | 15.87:1 | 4.5:1 | PASS |
| light | warning on warningTint | `#8a5300` | `#fbf1dc` | 5.64:1 | 4.5:1 | PASS |
| light | warning on surface | `#8a5300` | `#fcfcfd` | 6.17:1 | 4.5:1 | PASS |
| light | ink (banner text) on successTint | `#15181c` | `#e5f3eb` | 15.56:1 | 4.5:1 | PASS |
| light | success on successTint | `#1b7342` | `#e5f3eb` | 5.13:1 | 4.5:1 | PASS |
| light | success on surface | `#1b7342` | `#fcfcfd` | 5.73:1 | 4.5:1 | PASS |
| light | meter track ring (lineStrong) on surface | `#838b97` | `#fcfcfd` | 3.35:1 | 3:1 | PASS |
| light | meter track ring (lineStrong) on canvas | `#838b97` | `#f4f5f6` | 3.15:1 | 3:1 | PASS |
| light | meter fill neutral (ink2) on meter track (surface) | `#454c57` | `#fcfcfd` | 8.45:1 | 3:1 | PASS |
| light | meter fill cat-needs-reply on meter track (surface) | `#2a78d6` | `#fcfcfd` | 4.31:1 | 3:1 | PASS |
| light | meter fill cat-worth-reading on meter track (surface) | `#119c6e` | `#fcfcfd` | 3.41:1 | 3:1 | PASS |
| light | meter fill cat-commercial on meter track (surface) | `#4a3aa7` | `#fcfcfd` | 8.34:1 | 3:1 | PASS |
| light | meter fill cat-possible-scam on meter track (surface) | `#dc5a26` | `#fcfcfd` | 3.70:1 | 3:1 | PASS |
| light | meter fill cat-unsure on meter track (surface) | `#7c8490` | `#fcfcfd` | 3.68:1 | 3:1 | PASS |
| light | cat-needs-reply mark on surface | `#2a78d6` | `#fcfcfd` | 4.31:1 | 3:1 | PASS |
| light | cat-needs-reply mark on canvas | `#2a78d6` | `#f4f5f6` | 4.05:1 | 3:1 | PASS |
| light | cat-needs-reply ink on cat-needs-reply tint | `#1b58a8` | `#e7effb` | 6.03:1 | 4.5:1 | PASS |
| light | cat-needs-reply ink on surface | `#1b58a8` | `#fcfcfd` | 6.81:1 | 4.5:1 | PASS |
| light | cat-worth-reading mark on surface | `#119c6e` | `#fcfcfd` | 3.41:1 | 3:1 | PASS |
| light | cat-worth-reading mark on canvas | `#119c6e` | `#f4f5f6` | 3.20:1 | 3:1 | PASS |
| light | cat-worth-reading ink on cat-worth-reading tint | `#0b6b4c` | `#e2f3ec` | 5.67:1 | 4.5:1 | PASS |
| light | cat-worth-reading ink on surface | `#0b6b4c` | `#fcfcfd` | 6.36:1 | 4.5:1 | PASS |
| light | cat-commercial mark on surface | `#4a3aa7` | `#fcfcfd` | 8.34:1 | 3:1 | PASS |
| light | cat-commercial mark on canvas | `#4a3aa7` | `#f4f5f6` | 7.84:1 | 3:1 | PASS |
| light | cat-commercial ink on cat-commercial tint | `#4a3aa7` | `#eeebf8` | 7.28:1 | 4.5:1 | PASS |
| light | cat-commercial ink on surface | `#4a3aa7` | `#fcfcfd` | 8.34:1 | 4.5:1 | PASS |
| light | cat-possible-scam mark on surface | `#dc5a26` | `#fcfcfd` | 3.70:1 | 3:1 | PASS |
| light | cat-possible-scam mark on canvas | `#dc5a26` | `#f4f5f6` | 3.48:1 | 3:1 | PASS |
| light | cat-possible-scam ink on cat-possible-scam tint | `#a33d12` | `#fcebe3` | 5.61:1 | 4.5:1 | PASS |
| light | cat-possible-scam ink on surface | `#a33d12` | `#fcfcfd` | 6.33:1 | 4.5:1 | PASS |
| light | cat-unsure mark on surface | `#7c8490` | `#fcfcfd` | 3.68:1 | 3:1 | PASS |
| light | cat-unsure mark on canvas | `#7c8490` | `#f4f5f6` | 3.46:1 | 3:1 | PASS |
| light | cat-unsure ink on cat-unsure tint | `#454c57` | `#eceef1` | 7.45:1 | 4.5:1 | PASS |
| light | cat-unsure ink on surface | `#454c57` | `#fcfcfd` | 8.45:1 | 4.5:1 | PASS |
| dark | ink on canvas | `#eceef0` | `#0f1114` | 16.26:1 | 4.5:1 | PASS |
| dark | ink2 on canvas | `#b3bac4` | `#0f1114` | 9.67:1 | 4.5:1 | PASS |
| dark | ink3 on canvas | `#8f97a3` | `#0f1114` | 6.41:1 | 4.5:1 | PASS |
| dark | ink on surface | `#eceef0` | `#171a1e` | 15.01:1 | 4.5:1 | PASS |
| dark | ink2 on surface | `#b3bac4` | `#171a1e` | 8.93:1 | 4.5:1 | PASS |
| dark | ink3 on surface | `#8f97a3` | `#171a1e` | 5.92:1 | 4.5:1 | PASS |
| dark | ink on sunken | `#eceef0` | `#1f2328` | 13.58:1 | 4.5:1 | PASS |
| dark | ink2 on sunken | `#b3bac4` | `#1f2328` | 8.08:1 | 4.5:1 | PASS |
| dark | ink3 on sunken | `#8f97a3` | `#1f2328` | 5.36:1 | 4.5:1 | PASS |
| dark | onAccent on accent | `#15181c` | `#eceef0` | 15.31:1 | 4.5:1 | PASS |
| dark | lineStrong (control border) on surface | `#6b7380` | `#171a1e` | 3.65:1 | 3:1 | PASS |
| dark | lineStrong on canvas | `#6b7380` | `#0f1114` | 3.95:1 | 3:1 | PASS |
| dark | focus ring on surface | `#6aa3f0` | `#171a1e` | 6.74:1 | 3:1 | PASS |
| dark | focus ring on canvas | `#6aa3f0` | `#0f1114` | 7.30:1 | 3:1 | PASS |
| dark | accent (button fill) on canvas | `#eceef0` | `#0f1114` | 16.26:1 | 3:1 | PASS |
| dark | ink (banner text) on dangerTint | `#eceef0` | `#3a1b19` | 13.37:1 | 4.5:1 | PASS |
| dark | danger on dangerTint | `#f2877c` | `#3a1b19` | 6.32:1 | 4.5:1 | PASS |
| dark | danger on surface | `#f2877c` | `#171a1e` | 7.09:1 | 4.5:1 | PASS |
| dark | ink (banner text) on warningTint | `#eceef0` | `#322710` | 12.60:1 | 4.5:1 | PASS |
| dark | warning on warningTint | `#e8b64c` | `#322710` | 7.83:1 | 4.5:1 | PASS |
| dark | warning on surface | `#e8b64c` | `#171a1e` | 9.33:1 | 4.5:1 | PASS |
| dark | ink (banner text) on successTint | `#eceef0` | `#132a1e` | 13.11:1 | 4.5:1 | PASS |
| dark | success on successTint | `#5cc98a` | `#132a1e` | 7.39:1 | 4.5:1 | PASS |
| dark | success on surface | `#5cc98a` | `#171a1e` | 8.46:1 | 4.5:1 | PASS |
| dark | meter track ring (lineStrong) on surface | `#6b7380` | `#171a1e` | 3.65:1 | 3:1 | PASS |
| dark | meter track ring (lineStrong) on canvas | `#6b7380` | `#0f1114` | 3.95:1 | 3:1 | PASS |
| dark | meter fill neutral (ink2) on meter track (surface) | `#b3bac4` | `#171a1e` | 8.93:1 | 3:1 | PASS |
| dark | meter fill cat-needs-reply on meter track (surface) | `#3987e5` | `#171a1e` | 4.80:1 | 3:1 | PASS |
| dark | meter fill cat-worth-reading on meter track (surface) | `#199e70` | `#171a1e` | 5.13:1 | 3:1 | PASS |
| dark | meter fill cat-commercial on meter track (surface) | `#805d9a` | `#171a1e` | 3.28:1 | 3:1 | PASS |
| dark | meter fill cat-possible-scam on meter track (surface) | `#d95926` | `#171a1e` | 4.50:1 | 3:1 | PASS |
| dark | meter fill cat-unsure on meter track (surface) | `#7f8793` | `#171a1e` | 4.81:1 | 3:1 | PASS |
| dark | cat-needs-reply mark on surface | `#3987e5` | `#171a1e` | 4.80:1 | 3:1 | PASS |
| dark | cat-needs-reply mark on canvas | `#3987e5` | `#0f1114` | 5.20:1 | 3:1 | PASS |
| dark | cat-needs-reply ink on cat-needs-reply tint | `#9dc3f4` | `#16253a` | 8.49:1 | 4.5:1 | PASS |
| dark | cat-needs-reply ink on surface | `#9dc3f4` | `#171a1e` | 9.60:1 | 4.5:1 | PASS |
| dark | cat-worth-reading mark on surface | `#199e70` | `#171a1e` | 5.13:1 | 3:1 | PASS |
| dark | cat-worth-reading mark on canvas | `#199e70` | `#0f1114` | 5.55:1 | 3:1 | PASS |
| dark | cat-worth-reading ink on cat-worth-reading tint | `#72d2a9` | `#11281f` | 8.54:1 | 4.5:1 | PASS |
| dark | cat-worth-reading ink on surface | `#72d2a9` | `#171a1e` | 9.57:1 | 4.5:1 | PASS |
| dark | cat-commercial mark on surface | `#805d9a` | `#171a1e` | 3.28:1 | 3:1 | PASS |
| dark | cat-commercial mark on canvas | `#805d9a` | `#0f1114` | 3.56:1 | 3:1 | PASS |
| dark | cat-commercial ink on cat-commercial tint | `#c6b2e6` | `#251d33` | 8.38:1 | 4.5:1 | PASS |
| dark | cat-commercial ink on surface | `#c6b2e6` | `#171a1e` | 9.07:1 | 4.5:1 | PASS |
| dark | cat-possible-scam mark on surface | `#d95926` | `#171a1e` | 4.50:1 | 3:1 | PASS |
| dark | cat-possible-scam mark on canvas | `#d95926` | `#0f1114` | 4.87:1 | 3:1 | PASS |
| dark | cat-possible-scam ink on cat-possible-scam tint | `#f5a47f` | `#351f17` | 7.72:1 | 4.5:1 | PASS |
| dark | cat-possible-scam ink on surface | `#f5a47f` | `#171a1e` | 8.73:1 | 4.5:1 | PASS |
| dark | cat-unsure mark on surface | `#7f8793` | `#171a1e` | 4.81:1 | 3:1 | PASS |
| dark | cat-unsure mark on canvas | `#7f8793` | `#0f1114` | 5.21:1 | 3:1 | PASS |
| dark | cat-unsure ink on cat-unsure tint | `#b3bac4` | `#1f2328` | 8.08:1 | 4.5:1 | PASS |
| dark | cat-unsure ink on surface | `#b3bac4` | `#171a1e` | 8.93:1 | 4.5:1 | PASS |
