# Cómo seguir · Sorteos AR

Escrito el 29/09/2026. Lo que dice **VERIFICADO** lo corrí en esta máquina ese día y pegué la
salida. Lo que dice **SUPUESTO** sale de leer el código o de corridas anteriores de este proyecto,
no de haberlo ejecutado hoy.

---

## 1. Qué es y en qué estado quedó

Sorteos AR muestra los resultados de las loterías y quinielas argentinas. No permite apostar, no
vende nada, no tiene cuenta ni publicidad. Su única promesa real es la confianza en el dato: un
proceso lee **dos sitios independientes**, los compara número por número, y recién entonces marca
el sorteo como confirmado. El turf de San Isidro es la excepción y va con una sola fuente, la
oficial del hipódromo, etiquetada como tal.

La app está **publicada en la App Store** desde el 17/09/2026 (versión 1.0) y la 1.1, con turf,
compartir y pedido de valoración, desde el 21/09/2026. Es gratis, iPhone, iOS 16.4 o posterior,
disponible en 37 países. Hay un APK de Android compilado y probado a mano, sin publicar en Google
Play. El backend corre solo en GitHub Actions y publica JSON estático que la app consume.

**Monetización prevista por el dueño:** cuando haya volumen de usuarios, anuncios. Hoy no hay nada
de eso y la ficha de la App Store dice explícitamente "sin anuncios". Ese texto y la declaración de
privacidad hay que cambiarlos **antes** de meter el primer anuncio, no después.

---

## 2. Levantarlo en una máquina limpia

### Requisitos

| Qué | Versión verificada el 29/09/2026 | Para qué |
|---|---|---|
| Python | 3.14.6 | backend, scrapers, tests. **Solo biblioteca estándar**, no hay `requirements.txt` ni se instala nada |
| Node | 24.18.0 | la app |
| npm | 11.16.0 | la app |
| Git | cualquiera reciente | — |

En Windows el comando es `python`. En Linux y macOS es `python3`.

### Backend — VERIFICADO

```bash
cd backend
python -m unittest
```

Tiene que terminar en:

```
Ran 72 tests in 5.436s

OK
```

Los tests no tocan la red: leen HTML real congelado en `backend/tests/fixtures/`.

```bash
python verificador.py
```

Lee los JSON ya publicados, igual que la app, y termina en una línea `RESULTADO: N problemas,
M avisos`. Sale con 0 si no hay problemas. El 29/09 dio `0 problemas, 8 avisos`; los avisos eran
turnos de quiniela que todavía no habían salido y sorteos esperando la segunda fuente, que es lo
normal a media tarde.

Para correr un scraper suelto sin escribir nada:

```bash
python quini6_scraper.py --no-publish
python turf_scraper.py --no-publish --dias 7
python run_all.py            # lo que corre el cron: todos los juegos y publica en data/
```

### App — VERIFICADO

```bash
cd app
npm install        # SIN --legacy-peer-deps, rompe npm ci en EAS
npx tsc --noEmit   # sin salida = sin errores de tipos
```

Para verla en el teléfono con Expo Go:

```bash
npx eas-cli update --branch preview --environment preview --platform ios --message "prueba"
```

### Variables de entorno

El proyecto casi no usa. **Nombres solamente, nunca los valores:**

| Nombre | Dónde vive | Para qué |
|---|---|---|
| `PUSH_SEND_KEY` | secreto de GitHub Actions, y lo lee `backend/common.py` | autoriza al backend a pedirle al Worker que mande notificaciones |
| `APP_KEY` | secreto de los Workers `reportes` y `push` (`wrangler secret put`) | frena spam casual desde la app |
| `SEND_KEY` | secreto del Worker `push` | mismo valor que `PUSH_SEND_KEY`, del otro lado |
| `GITHUB_TOKEN` | secreto del Worker `cron` | dispara `scrape.yml`. Token de alcance reducido con **Actions: Read and write** |

Sin `PUSH_SEND_KEY` el backend corre igual: loguea la notificación y no la manda. Los tests no
necesitan ninguna.

Las claves de la app (`reportesKey`, `pushKey`) están en `app/app.json`, versionadas. Ver §6.

---

## 3. Dónde corre hoy y cómo se publica

| Pieza | Dónde | Cómo se publica |
|---|---|---|
| Datos | GitHub Pages, `main` raíz → https://nfgalindez-aiko.github.io/sorteos-ar/data/ | el workflow `scrape` commitea `data/` y Pages lo sirve solo. **VERIFICADO**: Pages en estado `built` |
| App | App Store, id 6809660906 | `eas build --profile production` + `eas submit`, y después enviar a revisión a mano en App Store Connect |
| Web | nfgalindez.com/sorteos/ (Cloudflare Pages) | repo aparte `nfgalindez.com`: editar `generar.py`, correr `python generar.py`, desplegar con `npx wrangler@4 pages deploy site --project-name nfgalindez --branch main`. **El `--branch main` no es opcional** |
| Workers | Cloudflare | `npx wrangler deploy` desde `worker/<nombre>/` |

Los dos workflows: `scrape.yml` junta y publica los datos, `verificar.yml` corre cada hora,
revisa lo ya publicado como lo lee la app, y abre o cierra un issue con etiqueta `verificador`.

El cron de GitHub Actions **no es confiable** (llegó a no correr durante 14 horas). Por eso hay un
Worker, `sorteos-ar-cron`, que dispara `scrape.yml` desde afuera cada 5 minutos dentro de las
ventanas de sorteo.

---

## 4. Estructura

| Carpeta | Qué hace |
|---|---|
| `backend/` | scrapers en Python sin dependencias, el verificador y los tests |
| `backend/tests/` | 72 tests sobre HTML real congelado en `fixtures/` |
| `data/` | el JSON publicado; lo escribe el cron, lo lee la app, **no se edita a mano** |
| `app/` | la app Expo: `app/` son las pantallas (expo-router), `src/` la lógica y los componentes |
| `worker/` | tres Workers de Cloudflare: `reportes`, `push` y `cron` |
| `docs/` | textos de la App Store, privacidad, respuesta a Apple, lista de pruebas, video demo |
| `branding/` | logo y material gráfico |
| `legacy-swiftui/` | el primer intento en SwiftUI, descartado el 07/09 |
| `.github/workflows/` | `scrape.yml` y `verificar.yml` |
| `.agents/`, `.claude/` | skills de diseño instaladas desde `emilkowalski/skills` |

---

## 5. Decisiones que no se entienden solas

**Dos fuentes, y el sello viaja con el dato.** Es la razón de ser de la app. Cada sorteo, cada
modalidad y cada turno de quiniela lleva cuántas fuentes lo confirmaron, visible al lado de los
números, no escondido en ajustes.

**Desfasaje no es conflicto (regla 37).** Que una fuente publique antes que la otra es normal. Se
toma el sorteo más nuevo con una sola fuente y se confirma cuando la otra se pone al día. Antes se
confundía con un conflicto real y dejó el job en rojo 83 veces seguidas.

**Un pozo vacante en disputa no invalida el sorteo (regla 43).** Cuando nadie acierta, la columna
"Premio" no es plata que alguien cobra: es el pozo que pasa al sorteo siguiente, y cada sitio
publica su propia cifra. Si las dos fuentes dan cero ganadores y montos distintos, se anota en
`pozos_en_disputa` y el sorteo se confirma igual, porque lo que se cruza son los números.

**El turf va con una sola fuente y se dice.** Es el parte oficial del hipódromo. Cruzar dos diarios
que copian de ese mismo parte no agrega nada. Se publica con `fuentes: ["oficial"]` y la app
muestra "Fuente oficial: Hipódromo San Isidro", nunca "1 fuente", que sería cierto y sonaría peor
de lo que es.

**Los dividendos del turf van con centavos, en `float`.** `money()` trunca a entero, que está bien
para un premio de lotería pero acá diría otra cosa: 2.05 es lo que paga cada peso apostado.

**El canal de EAS queda grabado en el binario (regla 39).** Lo que sale a la App Store se compila
con `--profile production`. Un binario compilado con el perfil `testflight` ata a todos los
usuarios de producción al canal de pruebas.

**Nada nuevo por aire sin actualizar la ficha.** El turf se podría haber mandado con un `eas
update`, pero la descripción de la App Store no lo mencionaba, y publicar un juego nuevo que no
figura en la ficha cae en la regla 2.3 de metadatos exactos, que ya costó dos rechazos. Fue con
revisión, con la descripción actualizada en el mismo envío, y pasó a la primera.

**La app escala el texto a mano (regla 33).** iOS mide con la fuente normal y dibuja con la
grande, así que las bolillas quedaban cortadas. `src/texto.tsx` exporta un `Text` con
`allowFontScaling={false}` que multiplica el `fontSize` por una escala tope de 1.25.

**El pedido de valoración no es "cada N veces" (regla 53).** iOS muestra el cartel como mucho tres
veces por año y decide él si lo muestra. Los hitos son 10, 40 y 100 aperturas, uno por intento.

---

## 6. Lo que falla, lo frágil y lo que quedó sin hacer

### 🔴 Falla hoy, con datos incorrectos a la vista — VERIFICADO el 29/09

**Las últimas 40 corridas de `scrape` están en rojo**, todas por Loto Plus. Y lo importante no es
el rojo: **la app está mostrando premios en cero que en realidad se pagaron.**

Loto Plus 3921 (26/09) está publicado como `validado: true`, `fuentes: ["A","B"]`, y muestra:

| Aciertos | Publicado | Lo que dice la fuente A hoy |
|---|---|---|
| 5 | 0 ganadores, $0 | 2 ganadores, $10.139.936 |
| 4 | 0 ganadores, $0 | 145 ganadores, $27.972 |

Cómo llegó a pasar, reconstruido del historial de `data/lotoplus/3921.json`:

1. 27/09 01:11 — se publica con una sola fuente. La tabla de premios todavía no había cargado, así
   que esas filas venían en `0 ganadores, $0`.
2. 27/09 01:36 — la segunda fuente aparece y **coincide**: también trae ceros. El sorteo pasa a
   `validado: true`.
3. Más tarde la fuente A carga los premios reales. Ahora A ≠ B, se dispara conflicto duro, el job
   queda en rojo, y `publish()` **se niega a degradar un sorteo ya confirmado** (regla 38), así que
   los ceros quedan congelados.

La causa de fondo: **coincidir en "todavía no hay datos" no es coincidir en un resultado.** Una
fila con `ganadores: 0` **y** `premio: 0` es una tabla sin cargar, no un pozo vacante. Un vacante
de verdad tiene cero ganadores y un monto grande, que es justo lo que muestra la fila de 6
aciertos de ese mismo sorteo. Hoy el código no distingue una cosa de la otra.

Arreglo propuesto, sin implementar: no dar por confirmado un sorteo cuya tabla de premios tenga
filas en `0 ganadores y $0`, y permitir que esas filas se sobrescriban cuando lleguen los datos
reales. Hace falta también corregir a mano el 3921 ya publicado.

### Frágil

- **El scraper depende del HTML de dos sitios ajenos.** Cambian el marcado y se rompe. Es por
  diseño: se arregla en el backend sin pasar por la App Store. Los tests usan HTML congelado, así
  que **pasan aunque el sitio real haya cambiado**: el que avisa es el verificador, no los tests.
- **San Isidro arma su tabla con JavaScript.** El scraper usa un endpoint interno que encontró
  dentro del HTML (`/wacP/public/partediv/AAAAMMDD`). Si lo cambian, hay que volver a buscarlo.
- **Un scraper que no encuentra nada no falla (regla 50).** Devuelve cero resultados en silencio.
  Cada parser tiene un test de cabecera por ese motivo.
- **`site/index.html` del repo de la web no lo genera el script** y el traductor copia de ahí.
  Tocarlo a mano y no revisar `site/en/` y `site/pt/` deja texto en español en las otras dos.
- **6 paquetes de Expo están atrasados** respecto de lo que espera el SDK 57 — VERIFICADO:
  `expo-doctor` da `1 check failed`. No rompe nada hoy. Un lock desincronizado ya hizo fallar un
  build de EAS antes, así que conviene `npx expo install --fix` antes de compilar.

### Sin hacer

- **Notificaciones en Android**: falta Firebase (`google-services.json` y `android.googleServicesFile`).
  El APK funciona, pero activar los avisos da error.
- **Google Play**: falta la cuenta de desarrollador, y Google exige a las cuentas personales nuevas
  una prueba cerrada con 12 testers durante 14 días antes de dejar publicar.
- **Notificaciones de turf**: falta agregar el tema en `TEMAS_VALIDOS` del Worker de push.
- **Radio del hipódromo**: el mail está redactado en `docs/pedido-transmision.md` y sin enviar.
  Va a `gerenciaHSI@` y `comercializacion@jockeyclub.com.ar`.
- **Sección de accesibilidad de App Store Connect**: opcional, sin empezar.
- **Cero reseñas y cero calificaciones** a doce días de publicada. No es un problema técnico.

### 🔴 Claves versionadas — VERIFICADO

`app/app.json` está versionado en un repo **público** y contiene `reportesKey` y `pushKey`, dos
cadenas de 32 caracteres, desde los commits `482e2ed` y `b4927a5`.

Matiz importante: **por diseño no son secretos fuertes.** Viajan dentro del binario de la app, que
cualquiera puede descomprimir; el propio comentario del Worker lo dice. Sirven para frenar spam
casual, no para autorizar nada. Estar en un repo público hace más fácil encontrarlas, pero no
cambia el modelo de amenaza.

Rotarlas cuesta: hay que cambiar el secreto del Worker **y** publicar una versión nueva de la app,
porque las viejas dejarían de poder reportar errores y registrarse para notificaciones. **Es una
decisión tuya, no la tomo yo.**

Lo que **no** aparece en el historial, y lo busqué: ningún token de GitHub, ninguna clave privada,
ningún `.env`, ningún `.p8` ni `.p12`.

---

## 7. Cómo retomar con Claude Code

**Leer en este orden:** este archivo, después `ESTADO.md`, que es la memoria real del proyecto y
tiene 55 reglas numeradas con el error que originó cada una. `PROYECTO_SORTEOS_AR.md` es el brief
original y quedó viejo en varias partes; donde se contradiga con el código, manda el código.

**Verificar que todo anda, en este orden:**

```bash
cd backend && python -m unittest        # tiene que decir OK con 72 tests
python verificador.py                   # RESULTADO: 0 problemas
cd ../app && npx tsc --noEmit           # sin salida
gh run list --limit 10                  # las corridas del cron
```

Si el verificador da problemas o las corridas están en rojo, eso es lo primero, antes que
cualquier feature.

**Cosas que ya salieron mal y conviene no repetir:** están todas en `ESTADO.md`. Las cuatro que
más tiempo costaron: confundir desfasaje con conflicto, publicar al canal de EAS equivocado,
tipear textos largos en App Store Connect (cuelga la pestaña; hay que setearlos con JS), y
desplegar la web sin `--branch main`, que dice "Success" y no cambia nada.
