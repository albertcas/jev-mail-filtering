# Dirección de diseño: dashboard

Decisiones concretas para el dashboard, el asistente y la demo de JEV Mail Filtering. Los tokens viven en `src/app/globals.css`; las primitivas en `src/app/components/ui/`. Este documento es la fuente de verdad visual para las Tasks 13 a 16.

## Lectura del encargo

Herramienta de productividad (modo *Operate*) para una persona que abre su bandeja por la mañana y quiere saber en 5 segundos qué requiere atención. Local, de solo lectura, con datos densos y tono sereno. Es también la pieza principal del portfolio de acastell.dev, así que debe transmitir confianza y oficio sin parecer una plantilla.

Diales (design-taste-frontend / ui-ux-pro-max): varianza 4, movimiento 3, densidad 7.

## Principio rector

**Los neutros llevan la interfaz; el color se reserva para el significado.** Solo hay color en las cinco categorías y en los estados (error, aviso, éxito). La acción principal es tinta (casi negro en claro, casi blanco en oscuro), no un color de marca. Así la vista de columnas se lee como un mapa de calor de atención: lo que tiene color es lo que importa.

Descartado a propósito: gradientes morados, glassmorphism, tarjetas idénticas sin jerarquía, bordes laterales de color gruesos en tarjetas, rojo saturado a pantalla completa, Inter por defecto, emoji como iconos.

## Paleta

Neutros pizarra fríos, sin `#fff` ni `#000` puros.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--canvas` | `#f4f5f6` | `#0f1114` | fondo de página y de columnas |
| `--surface` | `#fcfcfd` | `#171a1e` | tarjetas, panel lateral, inputs |
| `--sunken` | `#eceef1` | `#1f2328` | pistas de meter, hover, rellenos neutros (nunca bajo marcas de categoría) |
| `--ink` | `#15181c` | `#eceef0` | texto principal, botón primario |
| `--ink-2` | `#454c57` | `#b3bac4` | texto secundario, remitente, valores |
| `--ink-3` | `#5c6470` | `#8f97a3` | metadatos, extracto, ayudas (sigue ≥ 4.5:1) |
| `--line` | `#dfe2e6` | `#2b3036` | separadores decorativos |
| `--line-strong` | `#838b97` | `#6b7380` | bordes de controles (≥ 3:1) |
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
| Commercial | `#4a3aa7` | `#7955a0` | `#4a3aa7` / `#c6b2e6` | `#eeebf8` / `#251d33` | ciruela apagado: recede, es la columna más poblada |
| Possible scam | `#dc5a26` | `#d95926` | `#a33d12` / `#f5a47f` | `#fcebe3` / `#351f17` | naranja óxido: el tono más cálido y con más croma destaca sin ser el rojo de "error" |
| Unsure | `#7c8490` | `#7f8793` | `#454c57` / `#b3bac4` | `#eceef1` / `#1f2328` | gris neutro: "Jev no decidió" no merece un tono propio |
| Others (`none`) | igual que Unsure | | | | oculta por defecto; se distingue por su etiqueta |

La paleta categórica (las cuatro con tono) se validó con el validador de la skill `dataviz` en modo **all-pairs** (cualquier par puede quedar contiguo porque las barras de probabilidad se ordenan por valor), contra la superficie real de cada modo:

```
light (surface #fcfcfd)  PASS lightness band · PASS chroma floor
  CVD separation  worst #dc5a26↔#119c6e ΔE 9.9 (deutan)   [target ≥ 8]
  Normal vision   worst #4a3aa7↔#2a78d6 ΔE 16.3           [floor ≥ 15]
  Contrast        all 4 ≥ 3:1
dark (surface #171a1e)   PASS lightness band · PASS chroma floor
  CVD separation  worst #d95926↔#199e70 ΔE 9.4 (deutan)
  Normal vision   worst #7955a0↔#3987e5 ΔE 16.0
  Contrast        all 4 ≥ 3:1
```

El modo oscuro es una selección propia, no una inversión: el violeta del claro (`#4a3aa7`) se confundía con el azul en oscuro (ΔE CVD 1.9), así que Commercial pasa a ciruela `#7955a0`, elegido por búsqueda contra el validador.

Aun así, **el color nunca va solo**: toda categoría aparece con su nombre escrito, y Possible scam lleva además icono de escudo (`ShieldWarning`).

### Tratamiento por categoría

- **Needs reply**: primera columna, la única con urgencia (meter de urgencia en la tarjeta). Contador con peso semibold.
- **Worth reading**: segunda columna, tarjetas normales.
- **Commercial**: tarjetas más compactas (sin extracto en densidad alta); el ciruela apagado la hace retroceder.
- **Possible scam**: sin alarmismo. Punto naranja + icono de escudo en la cabecera, badge con escudo y chips de evidencia en tono `risk` (tinta naranja sobre tinte). Nada de fondos rojos a pantalla completa ni parpadeos; la tarjeta es igual que las demás salvo la evidencia. Destaca porque es el único tono cálido de la pantalla.
- **Unsure**: gris; la tarjeta explica por qué (confianza por debajo del umbral) con el meter visible.
- **Others**: oculta; `ToggleChip` "Show others (n)" con `aria-pressed`.

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

- **Confianza en la tarjeta**: `Meter` pequeño (4px × 48px) en tinta neutra + porcentaje escrito. Es un escalar acotado, no un gráfico; no lleva color de categoría (la tarjeta ya está en su columna).
- **Distribución de probabilidades (panel)**: barras horizontales ordenadas de mayor a menor, etiqueta directa a la izquierda y valor a la derecha, sin leyenda aparte. Es **una sola serie** sobre categorías nominales, así que todas las barras van en tinta neutra y **solo la categoría elegida** se pinta con su color de marca y su etiqueta en semibold. Barras de 8px, esquina 4px, pista `--sunken` tenue.
- **Umbrales**: la barra de Possible scam puede mostrar una marca vertical en el umbral `scam` actual para que el recálculo al mover el slider sea visible.
- Todo meter tiene `role="meter"` con `aria-valuetext` legible; el número siempre aparece en texto porque una barra de 4px sola no se lee.

## Jerarquía, estados y microinteracciones (impeccable)

Jerarquía de la cabecera: título de la bandeja + último sync a la izquierda; `Sync now` (primario, el único botón oscuro de la vista) a la derecha; analizados, coste y estado de conexión como metadatos en `ink-3`. Las columnas no son tarjetas: son zonas del canvas con cabecera (punto de color, nombre, contador tabular) y una regla de 1px.

Estados:

| Estado | Tratamiento |
|---|---|
| Cargando | esqueletos con la forma de la tarjeta (bloques `--sunken`), sin spinners en el contenido |
| Sincronizando | `Sync now` en modo `loading` (spinner + "Syncing…", `aria-busy`), contador "n pending" con `role="status"`; las tarjetas nuevas entran sin reordenar las existentes |
| Vacío (sin datos) | explica qué pasará y ofrece la acción: conectar bandeja o probar la demo |
| Columna vacía | "Nothing here" en `ink-3` dentro de la columna, sin ilustración |
| Error IMAP | `Banner` warning `live="polite"`: se muestran resultados guardados |
| Error Jev | `Banner` danger `live="assertive"` con acción "Fix it" |
| Demo | `Banner` info estático con "Install it locally →"; controles deshabilitados muestran "Disabled in the demo" |

Microinteracciones (150-280ms, `--ease-out` exponencial, todas a 0ms con `prefers-reduced-motion`):

- **Override** ("Not this? Move to…"): la tarjeta sale de su columna y aparece en la de destino con un desplazamiento corto + fundido (`--duration-move`, 280ms); se añade el chip "Moved by you" y un "Undo my change". Un solo momento de movimiento con sentido, no animaciones de entrada en toda la página.
- **Sliders de umbrales**: recálculo en cada evento `input` (sin botón de aplicar); los contadores de columna cambian en el acto y las tarjetas que cambian de columna usan la misma transición que el override. El valor se muestra en `<output>` junto a la etiqueta.
- **Botones**: hover de color, `active:translate-y-px` como pulsación física.
- **Panel lateral**: entra desde la derecha (`translate` + `@starting-style`), sale igual.

## Responsive

- ≥ 1280px: cinco columnas visibles.
- 768-1279px: columnas con scroll horizontal por snap, cabeceras fijas.
- < 768px: **las columnas pasan a pestañas con contador** ("Needs reply 4"), una lista por pestaña; el panel lateral ocupa todo el ancho. Objetivos táctiles de 44px con `pointer-coarse:` en botones, chips interactivos, inputs y sliders.
- Sin scroll horizontal de página en 375px.

## Modo oscuro

Sigue a `prefers-color-scheme` salvo que la raíz lleve `data-theme="light"`; `data-theme="dark"` lo fuerza (preparado para un selector manual). Cada valor oscuro está elegido y medido contra su propia superficie, no invertido.

## Superficies del navegador

`::selection` con tinte azul, `caret-color` de foco, `accent-color` de tinta para range/checkbox nativos, `scrollbar-color` con `--line-strong`, subrayado con offset 0.2em, `::backdrop` con `--scrim`.

## Primitivas UI (`src/app/components/ui/`)

| Primitiva | Elemento | Comportamiento accesible |
|---|---|---|
| `Button` | `<button type="button">` | variantes primary/secondary/ghost/danger; `loading` → `aria-busy`, deshabilitado, spinner `aria-hidden`, etiqueta visible; foco 2px |
| `Badge` | `<span>` | etiqueta de categoría estática; punto o icono `aria-hidden` + texto (nunca solo color) |
| `Chip` | `<span>` | razón/señal no interactiva; tonos neutral/risk/trust |
| `ToggleChip` | `<button aria-pressed>` | único chip interactivo (mostrar/ocultar Others) |
| `Meter` | `<div role="meter">` | `aria-valuenow/min/max`, `aria-label`, `aria-valuetext`; valor visible en texto |
| `Slider` | `<input type="range">` | `<label for>` visible, `<output>` con el valor, `aria-valuetext` formateado, ayuda por `aria-describedby`; `onValueChange` en cada `input` |
| `Sheet` | `<dialog>` modal | `showModal()` (fondo inerte), `aria-labelledby` al título, Esc cierra vía `onClose`, Tab/Shift+Tab atrapados, foco vuelve al disparador, clic en el fondo cierra |
| `Banner` | `<div>` | icono + texto + tinte; `live`: off / polite (`role="status"`) / assertive (`role="alert"`) |
| `Field` (+ `Input`, `Select`) | `<label>` + control | etiqueta encima, ayuda y error debajo enlazados con `aria-describedby`, `aria-invalid`, `aria-required`; el error lleva icono |

## Criterios de éxito (spec §6.4)

- [x] Se entiende en 5 s qué requiere atención: color solo en categorías, Needs reply primera con urgencia, contadores tabulares en las cabeceras.
- [x] *Possible scam* destaca sin alarmismo: único tono cálido, escudo + evidencia, sin rojo a pantalla completa.
- [x] Modo claro/oscuro: ambos seleccionados y medidos (tabla abajo).
- [x] Responsive: columnas → pestañas con contador en móvil.
- [ ] WCAG 2.1 AA: contraste medido aquí; la auditoría completa (`design:accessibility-review`) es la Task 16.

## Contraste medido

Calculado con la función `contrast()` (WCAG 2.x, luminancia relativa) exportada por `scripts/validate_palette.js` de la skill `dataviz`, sobre cada par texto/fondo y elemento/fondo que usan las primitivas. Mínimos: 4.5:1 texto, 3:1 elementos de UI y marcas. **88 pares, 0 fallos.**

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
| dark | cat-needs-reply mark on surface | `#3987e5` | `#171a1e` | 4.80:1 | 3:1 | PASS |
| dark | cat-needs-reply mark on canvas | `#3987e5` | `#0f1114` | 5.20:1 | 3:1 | PASS |
| dark | cat-needs-reply ink on cat-needs-reply tint | `#9dc3f4` | `#16253a` | 8.49:1 | 4.5:1 | PASS |
| dark | cat-needs-reply ink on surface | `#9dc3f4` | `#171a1e` | 9.60:1 | 4.5:1 | PASS |
| dark | cat-worth-reading mark on surface | `#199e70` | `#171a1e` | 5.13:1 | 3:1 | PASS |
| dark | cat-worth-reading mark on canvas | `#199e70` | `#0f1114` | 5.55:1 | 3:1 | PASS |
| dark | cat-worth-reading ink on cat-worth-reading tint | `#72d2a9` | `#11281f` | 8.54:1 | 4.5:1 | PASS |
| dark | cat-worth-reading ink on surface | `#72d2a9` | `#171a1e` | 9.57:1 | 4.5:1 | PASS |
| dark | cat-commercial mark on surface | `#7955a0` | `#171a1e` | 3.01:1 | 3:1 | PASS |
| dark | cat-commercial mark on canvas | `#7955a0` | `#0f1114` | 3.26:1 | 3:1 | PASS |
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
