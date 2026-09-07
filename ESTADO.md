# ESTADO — Sorteos AR

Objetivo: app iOS de solo consulta de resultados de Quini 6 y Brinco, alimentada por un backend
Python (stdlib) que scrapea dos fuentes, valida cruzado y publica JSON estático en GitHub Pages.
Brief: `PROYECTO_SORTEOS_AR.md`. Nada se borra de este archivo: lo falso se marca ❌ y se
corrige en una sección nueva.

Leyenda: ✅ verificado · ⏳ pendiente · 🔴 falló / bloqueado · 🔎 en investigación

## Tabla de resultados

| # | Paso (brief §6) | Estado | Verificación |
|---|---|---|---|
| 1 | Scraper Quini 6 contra sitios reales, robots.txt leídos | ✅ | `estado OK`, `diferencias []` (07/09/2026 15:51). Robots en `backend/tests/fixtures/robots_*.txt` |
| 2 | Tests con HTML real, sin red | ✅ | `python -m unittest` → 22 tests OK |
| 3 | Scraper Brinco, dos fuentes, cruce | ✅ | Sorteo 1370 del 06/09/2026, `OK`, `diferencias []` |
| 4 | Histórico 50 sorteos Quini 6 en `data/quini6/NNNN.json` | ✅ con matiz | 50 archivos (3357–3406), todos con 4 modalidades × 6 números. Solo 16 `validado:true` (ver regla 4 y 5) |
| 5 | Formato JSON publicado + `index.json` + no publicar si no coincide | ✅ | `data/quini6/latest.json`, `data/brinco/latest.json`, tests `test_build_formato_publicado` y `test_publish_no_pisa_latest_si_no_validado` |
| 6 | GitHub Actions cron + Pages | ⏳ dueño | Workflow escrito en `.github/workflows/scrape.yml`. Falta repo en GitHub, Pages y permisos (ver pendientes). URL pública sin verificar |
| 7 | Proyecto Xcode SwiftUI iOS 16+, bundle `ar.sorteos.app` | ⏳ sin compilar | Fuentes en `ios/SorteosAR/`, `ios/project.yml` (XcodeGen). No hay Xcode en esta máquina (Windows) |
| 8 | Pantallas: Inicio, Detalle, Histórico, Control de jugada, Ajustes | ⏳ sin compilar | Escritas. Sin ejecutar |
| 9 | Diseño: paleta inspirada, SF Pro, bolillas, dark mode, Dynamic Type | ⏳ sin compilar | `Design/Tokens.swift`, `Componentes.swift` |
| 10 | Compila sin warnings, offline, VoiceOver | 🔴 no verificable acá | Plan de verificación en `ios/README.md` |
| 11 | Textos App Store, privacidad | ✅ borrador | `docs/app_store.md`, `docs/privacidad.md`. Capturas: requieren la app compilada |
| 12 | Push notifications | ⏳ fase 2 | No empezado |

## Reglas aprendidas

1. **Windows + `open()` sin encoding rompe el scraper.** El primer run falló en fuente A por
   `charmap codec can't encode '\U0001f525'` al escribir el fixture. Todos los `open` llevan
   `encoding="utf-8"`. En GitHub Actions (Linux) no habría pasado, pero el código tiene que
   correr en las dos.
2. **❌ "comparar enteros truncados" (brief §4) no alcanza.** A redondea al peso
   (2.439.886) y B trae centavos (2.439.885,91 → 2.439.885). Se compara con tolerancia ±1 peso
   (`premio_eq`) y se publica el valor de B truncado. Test: `test_redondeo_a_vs_centavos_b`.
3. **B tiene dos formatos de página.** La portada dice `SORTEO DEL DIA 06/09/2026 NRO. SORTEO: 3406`
   y usa `LA SEGUNDA`; las páginas históricas dicen `SORTEO NRO. 3405 DEL DIA MIÉRCOLES 2-9-2026`,
   usan `LA SEGUNDA DEL QUINI` / `SORTEO TRADICIONAL` y `POZO EXTRA - 853` (sin el "6"). `parse_b`
   soporta ambos. Fixtures: `quini6_B_3406.html` y `quini6_B_3405.html`.
4. **A solo sirve los últimos 20 sorteos por `?sorteo=NNNN`.** Para 3386 y anteriores devuelve
   la página sin cabecera. El brief (§6.4) asumía que A servía 50: ❌. Solución: para los que A
   no tiene se calcula la fecha hacia atrás (mié/dom) y se pide a B
   `/quini6/sorteo-NNNN-del-dia-DD-MM-AAAA.htm`, verificando que el sorteo devuelto sea el
   pedido. Esos quedan `validado:false`, `fuentes:["B"]`. El índice de B
   (`sorteos-anteriores.aspx`) también lista solo 20.
5. **Las fuentes tienen errores reales entre sí.** 4 de los 20 sorteos que ambas sirven no
   validan, y no es culpa del parser:
   - 3399 segunda/5 aciertos: A 397.934 vs B 397.943 (dígitos transpuestos en alguna).
   - 3398 siempre sale/5: A $103.636.366 vs B $68.181,82 con 44 ganadores (A parece incorrecta:
     ×44 daría 4.560 millones).
   - 3397 y 3389 tradicional/6 vacante: A y B informan pozos acumulados distintos
     (6.292.953.626 vs 6.421.249.420; 3.923.626.367 vs 4.019.561.774).
   La validación cruzada está haciendo exactamente lo que tiene que hacer. La app muestra estos
   sorteos con "Pendiente de confirmación".
6. **B tiene typos de formato en premios.** Sorteo 3398: `$ 494,443,71` (coma como separador
   de miles). `money()` solo toma como decimal una coma final seguida de 1 o 2 dígitos.
   Test: `test_money_y_count`.
7. **`webmasters.aspx` de B no es un feed.** Solo ofrece un iframe de generador de números
   aleatorios. Descartado.
8. **robots.txt (verificados 07/09/2026).** A: `Allow: /` con `Disallow` de `/data/`,
   `/cargas/`, `/graba/`, `/desa/`, `/Control/`, `/includes/`; las páginas usadas están
   permitidas. B: no tiene ninguna directiva `Disallow`, solo comentarios de "content signals"
   (Cloudflare) sobre uso para IA. Test: `test_robots_permiten_las_paginas_usadas`.
9. **`convertFromSnakeCase` de `JSONDecoder` también convierte claves de diccionarios**, y las
   modalidades vienen como `{"siempre_sale": ...}`. En Swift se usa `CodingKeys` explícito solo
   para `pozo_extra` y no se activa esa estrategia.
10. **`ContentUnavailableView` es iOS 17+.** Se escribió `ContentUnavailableCompat` para iOS 16.
11. **Cron en UTC.** 21:00–23:59 ART = 00:00–02:59 UTC del día siguiente. Miércoles y domingo ART
    son jueves y lunes en UTC: `*/5 0-2 * * 1,4`. Argentina no tiene horario de verano.

## Pendientes con dueño

- [ ] Crear el repo en GitHub, `git init` local (no se inicializó: no se pidió), push.
- [ ] Settings > Actions > Workflow permissions: *Read and write* (el bot commitea `data/`).
- [ ] Settings > Pages: branch `main`, carpeta `/ (root)`. Hay `.nojekyll` en la raíz.
- [ ] Correr el workflow a mano y confirmar 200 en `.../data/quini6/latest.json`.
- [ ] Poner la URL base en `ios/SorteosAR/SorteosARApp.swift` (`Config.baseURL`).
- [ ] Mac con Xcode: compilar (`ios/README.md`), corregir lo que marque el compilador y anotarlo acá.
- [ ] Decidir el nombre definitivo (regla 4 del brief: sin "Quini", "Brinco", "Lotería de Santa Fe").
- [ ] Mail de soporte y contacto para la política de privacidad.
- [ ] Cuenta Apple Developer antes de publicar.
- [ ] Opcional: consultar con abogado si "quini"/"brinco" como palabras clave de App Store es defendible.

## Sesión 1 — 07/09/2026

Hecho:
- `backend/common.py`, `quini6_scraper.py` (reescrito sobre el del brief, mismo nombre),
  `brinco_scraper.py`, `historico.py`, `run_all.py`, `tests/test_scrapers.py` (22 tests) con HTML
  real congelado en `tests/fixtures/`.
- Corridas reales: Quini 6 sorteo 3406 `OK`; Brinco 1370 `OK`; histórico 3357–3406.
- `data/quini6/` (50 sorteos + `latest.json` + `index.json`), `data/brinco/` (1370 + latest + index).
- `.github/workflows/scrape.yml`, `.gitignore`, `.nojekyll`, `README.md`.
- `ios/` completo en fuentes SwiftUI + `project.yml` + `README.md`. **Sin compilar.**
- `docs/app_store.md`, `docs/privacidad.md`.

Errores propios de la sesión:
- Corrí el scraper del brief tal cual y falló por encoding en Windows (regla 1). Causa: el brief
  se escribió pensando en Mac/Linux.
- El primer `python -m unittest` dio "NO TESTS RAN": faltaba `tests/__init__.py`. Agregado.
- La primera pasada del histórico dio 30 fallos porque asumí, como el brief, que A servía 50
  sorteos (regla 4). Segunda pasada con fallback a B: 0 fallos.
- El sorteo 3398 mostraba premio 494 en B por el typo de la fuente (regla 6); lo detecté al revisar
  por qué no validaban 4 sorteos. Corregido `money()`; 3398 sigue sin validar por otra discrepancia
  real (siempre sale).

Lo que NO se verificó:
- Nada de iOS: no hay Xcode en Windows. El código Swift puede tener errores de compilación.
- El workflow de Actions y la URL pública de Pages: no hay repo todavía.
- Comportamiento de las fuentes la noche de un sorteo (latencia de publicación, cambios de HTML
  entre 21:15 y 23:59). Primer sorteo a observar: 3407, miércoles 09/09/2026 21:15.
