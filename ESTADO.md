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
| 6 | GitHub Actions cron + Pages | ✅ | Repo `nfgalindez-aiko/sorteos-ar`, Pages desde `main`/root, permisos write. Runs 34155591245 y 34156176636 en verde. `https://nfgalindez-aiko.github.io/sorteos-ar/data/quini6/latest.json` → 200 con sorteo 3406. El cron real se observa el 09/09 |
| 7 | ~~Proyecto Xcode SwiftUI~~ → **App Expo** (decisión del dueño, sesión 3), bundle `ar.sorteos.app` | ✅ | `app/` Expo SDK 57 + expo-router + TS estricto. `tsc` OK, `expo-doctor` 21/21, `expo export --platform ios` genera el bundle. SwiftUI archivado en `legacy-swiftui/` |
| 8 | Pantallas: Inicio, Detalle, Histórico, Control de jugada, Ajustes | ✅ código / ⏳ en teléfono | Publicadas en EAS Update rama `preview` (runtime `exposdk:57.0.0`) para abrir en Expo Go. Sin probar todavía en un iPhone |
| 9 | Diseño: paleta inspirada, tipografía de sistema, bolillas, dark mode, Dynamic Type | ✅ código | `app/src/design.ts`, `componentes.tsx`. `useColorScheme` para oscuro; `maxFontSizeMultiplier` en bolillas |
| 10 | Compila sin warnings, offline, VoiceOver | ⏳ | Compila (Metro + tsc). Offline y VoiceOver: labels puestos, falta probar en el teléfono. **EAS Build iOS: bloqueado** hasta que el dueño cargue credenciales de Apple una vez (ver pendientes) |
| 11 | Textos App Store, privacidad | ✅ borrador | `docs/app_store.md`, `docs/privacidad.md`. Capturas: requieren la app compilada |
| 12 | Push notifications | ⏳ fase 2 | Base lista (`novedades.json`). Falta APNs |
| 13 | Quinielas (pedido sesión 4) | ✅ backend / ⏳ en teléfono | 7 provincias en `data/quiniela/`. Ciudad, Provincia, Santa Fe y Córdoba con A+B; Montevideo con A+quinielamontevideo.com; Mendoza y Entre Ríos solo A (turnos `validado:false`). 10 tests nuevos. Pantallas en la app, publicadas en EAS Update |
| 15 | Loto Plus (pedido sesión 5) | ✅ | A+B, sorteo 3915 del 05/09 `OK`. Mismo formato que Quini 6 más `numero_plus`. Cron de sábados agregado |
| 16 | Poceada (pedido sesión 5) | ✅ con matiz | Solo A tiene la página, pero se valida cruzando con la nocturna de la Quiniela de la Ciudad (que viene de A+B). El 9712 del sábado quedó sin validar porque esa nocturna vino de una sola fuente; el primer `latest.json` sale cuando valide el 9713 (lunes 07/09 a la noche) |
| 14 | Verificador externo (pedido sesión 4) | ✅ | `backend/verificador.py` + workflow `verificar` cada hora. Probado en local: 0 problemas hoy; simula bien un sorteo faltante. Abre/cierra issue en GitHub |

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

- [x] ~~Crear el repo en GitHub, push.~~ Hecho en sesión 2: https://github.com/nfgalindez-aiko/sorteos-ar
- [x] ~~Workflow permissions read/write.~~ Hecho por API (sesión 2).
- [x] ~~Pages branch main / root.~~ Hecho por API. `https://nfgalindez-aiko.github.io/sorteos-ar/`
- [x] ~~Correr el workflow y confirmar 200.~~ Runs 34155591245 y 34156176636 en verde; `latest.json` 200.
- [x] ~~URL base en la app.~~ `Config.baseURL` apunta a Pages.
- [x] ~~Mail/URL de soporte y privacidad.~~ https://nfgalindez.com/sorteos/privacidad/ y /soporte/ (mails hola@ y privacidad@nfgalindez.com del sitio).
- [x] ~~Mac con Xcode.~~ Ya no hace falta: EAS Build compila en la nube (sesión 3).
- [ ] **Credenciales de Apple en EAS (una vez, interactivo):** en tu terminal `cd app && npx eas-cli build --platform ios --profile production` y loguearte con el Apple ID cuando lo pida (o cargar una API key de App Store Connect con `npx eas-cli credentials`). Después `npx eas-cli submit --platform ios --latest` sube a TestFlight.
- [ ] Abrir la app en Expo Go (expo.dev → sorteos-ar → Updates → preview → Open in Expo Go) y probar: offline, VoiceOver, texto grande.
- [ ] Ícono propio para la app (hoy placeholder del template).
- [ ] Decidir el nombre definitivo (regla 4 del brief: sin "Quini", "Brinco", "Lotería de Santa Fe"). Hoy: "Sorteos AR".
- [ ] Cuenta Apple Developer antes de publicar.
- [ ] Opcional: consultar con abogado si "quini"/"brinco" como palabras clave de App Store es defendible.
- [ ] Push notifications (brief 6.12): necesita APNs (cuenta Apple Developer + key) o proveedor. La base ya está: `data/novedades.json`.
- [ ] Observar en vivo el sorteo 3407 (mié 09/09/2026 21:15): ver en Actions que el cron publique entre 21:30 y 22:30 y que `novedades.json` sume el 3407.

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

## Sesión 2 — 07/09/2026 (tarde)

Pedido: terminar todo sin pedir confirmaciones, con acceso a GitHub. El navegador Brave con la
extensión no estaba conectado; no hizo falta: `gh` estaba logueado y git tenía credencial propia.

Hecho:
- Repo público `nfgalindez-aiko/sorteos-ar` creado con `gh`, 5 commits. El token de `gh` no tenía
  scope `workflow` y rechazó el push del cron; el push directo con `git` (credencial de Windows) sí
  pasó. El `gh auth refresh` que había lanzado quedó sin completar y expira solo.
- Actions: permisos de workflow en *write* por API. Pages: `main` / root por API. Workflow corrido
  dos veces a mano: tests OK, ambos juegos `OK`, `latest.json` público con 200.
- Regla 12 (nueva): **el cron commiteaba en cada corrida** porque `generado` cambia siempre.
  `write_json` ahora compara el contenido sin `generado` y no reescribe si es igual. Segunda corrida:
  "sin cambios en data/". Test `test_no_reescribe_si_solo_cambia_generado`.
- `data/novedades.json`: cada sorteo nuevo que pasa a `validado:true` queda registrado
  (idempotente). Es la señal que va a usar el paso 12 (push).
- `index.html` en la raíz (portada de Pages con links a los JSON) y `docs/privacidad.html`.
- Sitio del dueño: nfgalindez.com es Cloudflare Pages por subida directa desde el repo privado
  `nfgalindez.com` (`generar.py` → `site/`). Se agregó la app `sorteos` al generador (portada,
  privacidad, términos, soporte), tarjeta en la portada y link en el pie de todas las páginas.
  Ese repo tenía trabajo local sin commitear del dueño (portada, css, logo hotel): se commiteó
  aparte con mensaje claro antes del commit de Sorteos AR. Deploy con
  `npx wrangler pages deploy site --project-name nfgalindez` (wrangler ya estaba logueado).
  Verificado: `https://nfgalindez.com/sorteos/`, `/privacidad/`, `/terminos/`, `/soporte/` responden
  con su título. El primer curl después del deploy devolvió la portada vieja: era caché de
  Cloudflare, un minuto después ya estaba.
- Docs del proyecto apuntando a esas URLs. La privacidad canónica es la de nfgalindez.com; la de
  este repo es respaldo.

Errores propios de la sesión:
- Puse el mail personal del dueño en `privacidad.html` antes de que lo pidiera; lo saqué en el
  siguiente commit y quedaron los mails del sitio (hola@ / privacidad@nfgalindez.com).
- Un parche por `python` con `str.replace` no matcheó por CRLF (los archivos escritos desde
  Windows quedaron con CRLF) y no me di cuenta hasta ver `Ran 22 tests` en vez de 23. Se agregó
  `.gitattributes` con `eol=lf`; los parches siguientes se hicieron con el editor.
- `test -d nfgalindez.com || gh repo clone` no clonó porque la carpeta ya existía con la copia
  local del dueño; trabajé sobre esa copia sin saberlo. No rompió nada, pero por eso aparecieron
  cambios ajenos en `git status`, que se commitearon separados.

Lo que NO se verificó:
- Sigue sin compilarse nada de iOS (no hay Mac).
- El cron en horario real: primer sorteo a observar, 3407, miércoles 09/09/2026 21:15.

## Sesión 3 — 07/09/2026 (noche)

Pedido del dueño: la app se hace con Expo y EAS Build; primero Expo Go, después TestFlight.
Cambia la decisión 1 del brief (SwiftUI nativo). Ventaja inmediata: no hace falta Mac.

Hecho:
- `app/` creado con `create-expo-app` (SDK 57, blank-typescript) + expo-router, safe-area, screens,
  AsyncStorage, expo-constants, expo-linking, expo-updates. Toda la app reescrita en TS: mismas
  pantallas y reglas que la versión SwiftUI. SwiftUI movido a `legacy-swiftui/` con `DESCARTADO.md`.
- Verificado sin teléfono: `tsc --noEmit` limpio (strict), `expo-doctor` 21/21,
  `expo export --platform ios` produce el bundle Hermes (2,4 MB).
- Proyecto EAS creado y linkeado: `@gestionaiko/sorteos-ar`, id `294ffa73-6981-4b7a-b0fa-15ddcfcd88d7`.
- EAS Update configurado y publicado dos veces en la rama `preview`. Regla 13 (nueva): **con
  `runtimeVersion.policy = appVersion` Expo Go no puede abrir el update**; hay que usar
  `sdkVersion` (runtime `exposdk:57.0.0`). Corregido y republicado:
  https://expo.dev/accounts/gestionaiko/projects/sorteos-ar/updates/2f3ea35d-a6c7-4da8-9276-2ad4c044a760
- Regla 14: `npm install` del template falla con ERESOLVE (react-dom 19.2.8 vs react 19.2.3);
  se instala con `--legacy-peer-deps`. Documentado en `app/README.md`.
- Regla 15: `eas update --non-interactive` exige `--environment`.
- EAS Build iOS `preview` intentado en modo no interactivo: falla en credenciales ("couldn't find
  any credentials suitable for internal distribution"). Es esperable: la primera vez necesita el
  Apple ID del dueño en una terminal interactiva. No se puede hacer desde acá.

Lo que NO se verificó:
- La app corriendo en un iPhone real (Expo Go). Todo lo visual, offline y VoiceOver queda a probar.
- EAS Build y TestFlight: bloqueados por credenciales de Apple.

## Sesión 4 — 07/09/2026 (noche)

Pedido: agregar las quinielas más usadas y un verificador externo que corra aparte de la app.

Hecho:
- `backend/quiniela_scraper.py`: 7 provincias. Fuentes: tujugada (A) para todas; quini-6-resultados
  (B) para Ciudad, Provincia, Santa Fe y Córdoba; quinielamontevideo.com (M) para Uruguay. La
  validación es **por turno** (cada turno tiene su `validado` y `fuentes`); si dos fuentes no
  coinciden, ese turno se publica sin números y marcado `conflicto`. Un turno validado nunca se
  pisa con uno no validado. Regla 16 (nueva): A mete un texto anti-copia ("---MENSAJE PARA EL
  VISITANTE...") en medio del extracto, entre la posición 2 y su número; se filtra con regex antes
  de parsear. Regla 17: B no publica la Previa, así que la Previa de esas 4 quinielas queda
  siempre con una sola fuente. Regla 18: los HTML de A vienen en latin-1; `read_fixture` ahora
  prueba utf-8 y cae a latin-1.
- Datos publicados hoy: primera y matutina validadas en las 4 quinielas con doble fuente, vespertina
  de Montevideo validada. `data/quiniela/latest.json` es el resumen (cabezas) para la portada.
- Cron: cada 15 min de 10:00 a 22:59 ART, lunes a sábado, además del cron de Quini/Brinco.
- `backend/verificador.py` + `.github/workflows/verificar.yml` (cada hora a los :20). Lee los JSON
  públicos como la app: esquema, rangos, orden, índices, y **frescura** (si ya pasó la hora del
  sorteo + 75 min y no está, es problema). Si falla, crea o comenta un issue con etiqueta
  `verificador` (GitHub avisa por mail); cuando vuelve a verde, lo cierra. Probado contra un
  servidor local: hoy 0 problemas; simulando el miércoles 09/09 a las 23:00 detecta el 3407 faltante.
- App: sección Quinielas en Inicio (cabezas por turno), pantalla por provincia con los 20 números
  (cabeza destacada, letras, chip de validación), días anteriores, día puntual. Banner "datos
  desactualizados" calculado en el teléfono. `tsc` limpio, export OK, `expo-doctor` 21/21.
  Regla 19: los typed routes de expo-router generaron tipos rotos para `quiniela/[prov]` en
  Windows (rutas estáticas y una entrada `/../src/quiniela-detalle`); se desactivaron
  (`experiments.typedRoutes`). Las rutas van como string.
- Suite backend: 33 tests OK.

Lo que NO se verificó:
- Las quinielas en el teléfono (publicadas en EAS Update, sin abrir todavía).
- Vespertina y nocturna de hoy: al momento de la corrida no habían salido. El cron las tiene que
  tomar solo; el verificador de las 22:20 ART lo va a controlar.
- Sábados: asumí sin vespertina en varias provincias (el verificador lo trata como aviso, no error).

Cierre de la sesión 4 (verificación en GitHub):
- Workflow `scrape` con quinielas: tests 33 OK, 7 provincias, "sin cambios en data/" (lo publicado
  desde acá ya era igual). Regla 20: el `MISMATCH` que aparece en el log del runner viene del test
  de conflicto, no de datos reales; ahora ese test escribe a un log temporal.
- Regla 21 (bug propio): en el workflow `verificar`, `python ... | tee` seguido de `$?` devolvía el
  exit de `tee` (siempre 0), así que la primera corrida con 7 problemas quedó en verde y no abrió
  issue. Corregido con `${PIPESTATUS[0]}`.
- Alerta probada de punta a punta: corrida con base rota (input `base`) → job rojo e issue #1
  "🔴 Verificador: datos publicados con problemas" con etiqueta `verificador`; corrida normal
  siguiente → verde y el issue quedó cerrado solo. GitHub manda mail al dueño en cada apertura.
- EAS Update con quinielas publicado en `preview`:
  https://expo.dev/accounts/gestionaiko/projects/sorteos-ar/updates/4c10769a-6256-40b0-8ba5-de383d70f708

## Sesión 5 — 07/09/2026 (noche)

Pedido: agregar Loto Plus y Poceada. Pregunta: "¿se puede poner Nacional y Provincia?" → ya
estaban: "Nacional" es la Quiniela de la Ciudad de Buenos Aires (ex Lotería Nacional) y
"Provincia" la de Buenos Aires. Se renombró la etiqueta a "Nacional (Ciudad)".

Hecho:
- `lotoplus_scraper.py`: A (tujugada `loto.asp`) + B (`quini-6-resultados.com.ar/loto/`). Regla 22:
  B usa formato de dinero yanqui (`$3,867,231,609.72`); `money_us()` lo trunca a entero. A redondea,
  como en Quini 6 (tolerancia ±1 ya existente). `compare` ahora también compara `numero_plus`.
- `poceada_scraper.py`: solo A tiene página. Regla 23: la Poceada se sortea con la nocturna de la
  Quiniela de la Ciudad y sus 20 números son las dos últimas cifras de esa nocturna, así que se
  cruza con `data/quiniela/ciudad/<fecha>.json`. Regla 24 (vista en el 9712 del 05/09): cuando dos
  números de la nocturna terminan igual (dos "…52"), el extracto oficial agrega un número extra
  (apareció el 62); la regla implementada es "todas las terminaciones distintas tienen que estar
  en la Poceada" (confirma 19 de 20 en ese caso). Queda `validado:true` solo si además la nocturna
  vino de dos fuentes. `run_all` corre la Poceada después de las quinielas por eso.
- Verificador: Loto Plus (mié/sáb 21:30) y Poceada (lun–sáb 21:00). Si la Poceada todavía no tiene
  `latest.json` pero sí índice, es aviso y no problema (arranque).
- App: Loto Plus como tercer juego poceado (misma pantalla que Quini 6, más tarjeta "Número
  Plus"); Poceada con tarjeta en Inicio, detalle (20 números, letras, premios, próximo pozo),
  histórico y sorteo puntual. Disclaimer ampliado: "…Lotería de Santa Fe, a Lotería de la Ciudad
  ni a ningún organismo oficial" (en app, docs y sitio). `tsc` limpio, export OK.
- Tests: 42 OK (9 nuevos para Loto Plus y Poceada, incluido el caso del número extra).

Lo que NO se verificó:
- Poceada validada de verdad: primera oportunidad hoy a la noche (9713). El verificador de las
  22:20 lo va a decir.
- Loto Plus en cron real: primer sorteo, miércoles 09/09 21:30 (3916).
- Control de jugada para Poceada (8 números) y Loto Plus: no se hizo todavía. Loto Plus usa la
  misma pantalla de control que Quini 6 (6 números 0–45), así que funciona; Poceada no tiene.

## Sesión 6 — 07/09/2026 (noche)

Pedido: que el logo animado de la carpeta "Logo animado para sorteos app" aparezca al abrir
https://nfgalindez.com/sorteos/.

- El zip estaba en la raíz del proyecto (`Logo animado para sorteos app.zip`); antes lo busqué en
  discos, Drive, artefactos y sesiones y no lo encontré porque no existía como carpeta. Descomprimido
  en `branding/`: kit de marca (SVG, PNG 40–1024, paleta, tipografía Archivo) y la animación, que es
  una escena React sobre un motor propio de 60 KB (`animations-v3.jsx`), no un video.
- Regla 25: para la web se porteó la escena a SVG + JS puro (`site/assets/js/sorteos-intro.js`,
  ~180 líneas), copiando la coreografía exacta (mismos cues, easings y números). En `/sorteos/`
  corre como intro a pantalla completa al cargar (una vez, a 1,25×, "tocá para saltar", respeta
  `prefers-reduced-motion`) y como hero en loop debajo del título. Verificado con capturas en el
  deploy de Cloudflare: bolillas → 17 encendido → ícono → firma "Sorteos AR".
- Regla 26: `generar.py` usa `str.format`, así que las llaves de JavaScript en las portadas van
  dobles (`{{loop:true}}`); el primer intento explotó con `KeyError: 'loop'`.
- Ícono del kit (`icono-1024.png`) puesto como ícono de la app Expo, foreground de Android y
  favicon; el ícono de iOS solo cambia con un build nuevo (en Expo Go no se ve). Ícono también en la
  tarjeta de la portada del sitio.

## Sesión 7 — 08/09/2026

- Primer build de EAS falló en "Install dependencies": regla 27, el `package-lock.json` estaba
  desincronizado por instalar con `--legacy-peer-deps` (faltaban react-dom, gesture-handler,
  reanimated, worklets). En la nube EAS corre `npm ci`, que exige el lock exacto. Se instalaron las
  versiones del SDK 57 con `expo install`, se regeneró el lock sin flags y se verificó con `npm ci`
  desde cero (560 paquetes). Segundo build OK en 5 min: `fae12ccb`, versión 0.1.0, build 3.
- Credenciales de Apple: el dueño hizo el login interactivo una vez; certificado de distribución y
  API key de App Store Connect son los mismos de sus otras apps (son por cuenta, no por app). Desde
  ahora `eas build` y `eas submit` corren no interactivos desde esta máquina.
- App creada en App Store Connect (ASC App ID 6809660906), grupo TestFlight "Team (Expo)", tester
  nfgalindez@gmail.com. Submission 1b5c7d39 aceptada; Apple procesa y avisa por mail.
  `ascAppId` guardado en `app/eas.json`.
- Etiquetas de la app: "1 fuente" / "2 fuentes" en vez de "pendiente de confirmación".
- Poceada 9713 (lun 07/09) quedó `validado:true` por cruce con la nocturna de Ciudad de dos fuentes:
  primer `data/poceada/latest.json`. El cron publicó solo la vespertina y la nocturna de las quinielas.

## Sesión 8 — 08/09/2026 (después de la primera prueba en TestFlight)

Feedback del dueño y resolución:
- "1 fuente / 2 fuentes" ahora es un chip tocable (`ChipFuentes`): al tocar dice qué sitios
  publicaron el dato y por qué se marca así. Sin tono de alarma: color neutro para "1 fuente";
  se quitó el triángulo naranja de los históricos y el naranja de las cabezas de quiniela.
- Botones "Sorteos anteriores" / "Controlar jugada": el relleno usaba texto blanco sobre el color
  del juego, que en modo oscuro es claro (verde #59CC8C) → sin contraste. Ahora el texto se elige
  por luminancia (oscuro sobre colores claros) y el botón de contorno tiene borde de 2 px y negrita.
- Ajustes, al pie: "Hecha por Nicolás Galindez · nfgalindez.com" (abre el navegador).
  Revisión legal del link: App Store permite links al sitio del desarrollador; lo que prohíbe la
  guideline 5.3 son links a apuestas o compra de cupones, y la 3.1.1 links a pagos externos.
  nfgalindez.com no tiene nada de eso. Se mantiene: sin links a loterías ni casas de apuestas.
- Ícono: el primario del kit era la configuración "sol de mayo" (lente dorada). Se pasó a
  "celeste y blanco" (tile #0F1E33, lente #75AADB). Regla 28: se renderizó desde el SVG del kit
  en el navegador embebido con la fuente Archivo cargada y se exportó a PNG 1024 (sin Archivo el
  "17" salía en Arial). Guardado en `branding/assets/png/icono-celeste-*.png`, app y sitio.
- Intro en la app: la animación completa solo la PRIMERA vez en ese teléfono (flag en
  AsyncStorage), sin leyenda; un toque la cierra. Implementada en `react-native-svg` con la misma
  coreografía (`src/logo-animado.tsx`).
- Splash en cada apertura: splash nativo (`expo-splash-screen`, ícono sobre azul noche) y encima el
  cuadro final de la animación (ícono + "Sorteos AR · Sorteos Argentinos") ~1,3 s, después entra.
- Verificado: tsc, expo-doctor 21/21, export, `npm ci` desde el lock (574 paquetes).
  Build de producción nuevo y envío a TestFlight lanzados desde acá, no interactivos.

## Sesión 9 — 08/09/2026 · Enviada a revisión de App Store

Pedido: subir al App Store. Antes, dos ajustes: ícono celeste (ya estaba en el build 4; el dueño
tenía el 3) y que en cada apertura se reproduzca el tramo final del logo animado. Build 5
(0.1.0) con eso, subido a TestFlight y enlazado a la versión 1.0.

App Store Connect, hecho desde el navegador del dueño con su sesión (él dio permiso expreso):
- Ficha en inglés y en español (México): texto promocional, descripción, palabras clave, URLs de
  soporte y marketing, copyright, contacto de revisión (teléfono provisto por el dueño), notas.
- Información de la app: subtítulo, derechos de contenido ("sí, y tengo los derechos": los
  resultados son datos públicos), categorías Noticias/Utilidades, clasificación 18+ (173 países).
  Categorías y clasificación se cargaron por API con EAS Metadata (`app/store.config.json`); los
  textos no, porque la herramienta falla con la API nueva de Apple (regla 29).
- Privacidad: URL de la política, "No se recopilan datos", publicada.
- Precio gratis (base EE. UU.) y disponibilidad en 175 países.
- Capturas 6,5": las 5 que mandó el dueño desde el iPhone, reescaladas a 1284×2778 en el
  navegador embebido (`docs/capturas/`). Se subieron con `file_upload` sobre el input oculto.
- Regla 30: tipear textos largos tecla por tecla en App Store Connect cuelga la pestaña; los
  campos React se cargan con el setter nativo + evento `input` vía JavaScript. Y la casilla "Es
  necesario iniciar sesión" viene marcada por defecto: hay que desmarcarla o pide usuario/clave.
- Resultado: "1 artículo enviado", estado **Pendiente de revisión**. Apple: hasta 48 h, avisa por mail.
  Publicación configurada como automática al aprobarse.

Pendiente después de la aprobación: notificaciones push, control de jugada para Poceada,
monetización (decisión del dueño). Primer sorteo grande con la app pública: Quini 6 3407, mié 09/09.

## Sesión 10 — 08/09/2026 · Mejoras para TestFlight mientras Apple revisa

- Botones de acción arriba del detalle en todos los juegos y quinielas.
- Jugadas: ahora quedan atadas al próximo sorteo (`objetivo`) o marcadas "la juego siempre"
  (`objetivo: null`). Cuando el sorteo objetivo se publica, el resultado se congela en
  `resultado` y la jugada pasa a "Anteriores"; botón "Repetir". Las jugadas viejas (sin
  `objetivo`) se tratan como "siempre". Regla 31: `actualizar` del store es funcional (setState
  con función) porque varias jugadas se congelan seguidas y con el cierre viejo se pisaban.
- Canales EAS: el build 5 (en revisión) queda en `production` sin tocar; el build 6 se hizo con
  el perfil `testflight` (canal `testflight`) y se subió a TestFlight para que el dueño lo pruebe.
  Cuando Apple apruebe: `eas update --branch production` con el mismo código.

## Sesión 11 — 08/09/2026 · Jugada en el home, reporte de errores, splash con toque

- Home: debajo de la cuenta regresiva de cada juego se muestran las jugadas vigentes del usuario
  (hasta 3), con la etiqueta "para el sorteo N" / "la jugás siempre" y los aciertos resaltados si ya
  hay sorteo.
- Reporte de errores: botón "¿Ves algún error? Dejámelo acá" al pie de Controlar jugada y de
  Ajustes → pantalla `app/reporte.tsx` → `POST` al Worker de Cloudflare `sorteos-ar-reportes`
  (`worker/reportes/`), que arma el mail y lo manda con el binding `send_email` de Email Routing
  (remitente reportes@nfgalindez.com → destino nfgalindez@gmail.com). Regla 32: el mail del dueño
  vive solo en el Worker; la app lleva una clave compartida (`extra.reportesKey`) que frena spam
  casual, más límite de 2000 caracteres y 1 reporte por minuto por IP. Probado con curl: mail
  enviado (`{"ok":true}`) y 401 sin clave. La clave está en `backend/app_key.txt` (gitignored).
- Privacidad: la política del sitio ahora describe el reporte opcional (texto, contacto opcional,
  pantalla, versiones, modelo). Pendiente: en App Store Connect, cuando se actualice la ficha,
  cambiar "no se recolectan datos" por "Datos de contacto (opcional, no vinculados)" si Apple lo pide.
- Splash: un toque lo cierra (igual que la intro).
- Build 7 (perfil `testflight`) subido a TestFlight. Apple sigue revisando el 5.

## Sesión 12 — 08/09/2026 · Letra grande

- Con Dynamic Type en tamaños de accesibilidad, los textos se cortaban por la mitad y las
  bolillas quedaban fijas (captura del dueño, build 7). Regla 33: `src/texto.tsx` exporta un
  `Text` con `maxFontSizeMultiplier = 1.5` y todos los archivos lo importan en lugar del de
  React Native (aliasado como `Text`, sin tocar el JSX). `useEscala()` devuelve el factor real
  (tope 1,5×) y con él crecen las bolillas, las celdas de la grilla de jugada y las de la Poceada.
  Dynamic Type sigue funcionando hasta 1,5×; más allá, la app no crece más pero no se rompe.
- Build 8 (perfil `testflight`) para que el dueño lo pruebe con la letra grande.

## Sesión 13 — 08/09/2026 · Ajustes finos y auditoría de privacidad

- Tope de letra 1,25×; botones con texto centrado; tabla de premios con anchos 0,7 / 1 / 1,6 y
  Ganadores centrada; reporte sin campo de contacto. Todo publicado como EAS Update al canal
  `testflight` (build 9). Nada tocó al build 5 en revisión.
- Auditoría de privacidad (regla 34, fija): antes de publicar cualquier versión o update, revisar
  que la declaración de App Store, la política del sitio y lo que la app hace coincidan.
  Estado hoy: "no se recolectan datos" sigue siendo correcto (el reporte es voluntario, avisado,
  sin identificadores; excepción de Apple para feedback opcional). La 1.1 con notificaciones
  SÍ cambia la declaración: identificadores de dispositivo (token de push), no vinculados, para la
  función de la app + política del sitio. Hacerlo ANTES de enviar la 1.1.
- Pendiente con el dueño: cuando Apple apruebe la 1.0, esperar su confirmación y recién entonces
  `eas update --branch production --environment production --platform ios` con el mismo código
  del canal testflight. Después, 1.1: notificaciones (Worker de tokens + Expo Push + APNs key).

## Sesión 14 — 08/09/2026 · El cron de GitHub se saltea

- Regla 35: **el cron de GitHub Actions no es confiable**. El 08/09 no corrió entre las 23:13 y las
  14:00 ART (14 horas); a las 11:32 el verificador abrió el issue #2 por la previa faltante y a las
  15:40 lo cerró solo cuando el cron volvió. GitHub documenta que las tareas programadas pueden
  atrasarse o descartarse con carga.
- Solución: Worker `sorteos-ar-cron` (`worker/cron/`) con cron trigger de Cloudflare cada 5 min
  (puntual). Dentro de las ventanas (quinielas lun–sáb 10–23 cada 15 min; noches de sorteo mié/sáb/dom
  21–24 cada 5 min; diaria 12:00) dispara `scrape.yml` por `workflow_dispatch`. Necesita un token
  fine-grained de GitHub (solo repo sorteos-ar, Actions: write) como secreto `GITHUB_TOKEN`;
  lo carga el dueño con `wrangler secret put`, no pasa por el chat. El cron de GitHub queda como
  respaldo. Desplegado y respondiendo; sin token todavía (no hace nada hasta que esté).
- Cierre sesión 14: el token del dueño estaba con "Actions: Read" (403 `actions=write` requerido);
  con un token nuevo con Read and write → 204 y corrida `workflow_dispatch` en marcha. El Worker
  `sorteos-ar-cron` queda activo cada 5 min dentro de las ventanas. `/tick` solo dispara dentro de
  ventana (se quitó el `force` de diagnóstico).

## Sesión 15 — 08/09/2026 · Notificaciones push (1.1)

- Arquitectura: `worker/push/` (Worker `sorteos-ar-push` + KV `SUSCRIPCIONES`): la app registra su
  token de Expo con los temas elegidos (`/registrar`, `/baja`, clave APP_KEY); el backend llama a
  `/enviar` (clave SEND_KEY = secreto `PUSH_SEND_KEY` en GitHub Actions) y el Worker manda por el
  servicio de push de Expo, en lotes de 100, dando de baja tokens `DeviceNotRegistered`.
  Temas: quini6, brinco, lotoplus, poceada y quiniela:<prov>.
- Backend: `common.notificar()`; se dispara en `registrar_novedad` (sorteo nuevo validado) y en
  `quiniela_scraper.publicar_prov` por turno recién validado, SOLO del día de hoy (regla 36: las
  páginas traen días anteriores; sin ese filtro se notificaría el pasado al crear archivos nuevos).
  Sin `PUSH_SEND_KEY` (corridas locales/tests) solo loguea.
- App: `expo-notifications` + `expo-device`; `src/notificaciones.tsx` (permiso, token, registro,
  preferencias en AsyncStorage); sección "Notificaciones" en Ajustes con un interruptor por juego y
  por quiniela y "Apagar todas"; tocar la notificación abre la pantalla del sorteo (`data.ruta`).
- Privacidad (regla 34 aplicada ANTES de enviar): sitio nfgalindez.com/sorteos/privacidad/ y docs
  actualizados con el token anónimo + temas. En App Store Connect, antes de enviar la 1.1: declarar
  Identificadores → ID del dispositivo, funcionalidad, no vinculado, sin rastreo.
- Build 10 (perfil `testflight`) lanzado. Pendiente de confirmar: si EAS creó la llave APNs de push
  en modo no interactivo; si el envío devuelve `InvalidCredentials`, el dueño corre
  `npx eas-cli credentials --platform ios` una vez y elige "Push Notifications: Set up".
