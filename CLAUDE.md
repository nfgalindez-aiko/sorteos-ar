# Sorteos AR — lo mínimo para no romper nada

App publicada en la App Store. Muestra resultados de loterías y quinielas argentinas. **No permite
apostar.** Backend en Python sin dependencias que publica JSON estático; app en Expo que solo lee
ese JSON.

Guía completa: **`COMO_SEGUIR.md`**. Memoria del proyecto con 55 reglas numeradas: **`ESTADO.md`**.
`PROYECTO_SORTEOS_AR.md` es el brief original y quedó viejo: donde contradiga al código, manda el
código.

## Comandos

```bash
# backend (Python 3.14, SOLO biblioteca estándar, no se instala nada)
cd backend
python -m unittest          # 72 tests, sin red, sobre HTML congelado
python verificador.py       # revisa el JSON ya publicado; 0 problemas = todo bien
python run_all.py           # lo que corre el cron: scrapea y publica en data/
python <juego>_scraper.py --no-publish   # un juego suelto sin escribir nada

# app
cd app
npm install                 # SIN --legacy-peer-deps
npx tsc --noEmit
npx expo-doctor
```

En Windows es `python`; en Linux y macOS, `python3`.

## Qué no se toca

1. **`data/` no se edita a mano.** Lo escribe el cron. Si hay que corregir algo publicado, se
   corrige el scraper y se vuelve a correr.
2. **Lo que sale a la App Store se compila con `--profile production`.** El canal de EAS queda
   grabado en el binario: un build con perfil `testflight` ata a todos los usuarios de producción
   al canal de pruebas (regla 39).
3. **Nada de features nuevas por aire si la ficha de la App Store no las menciona.** Es la regla
   2.3 de metadatos exactos, ya costó dos rechazos. Va con revisión y con la descripción
   actualizada en el mismo envío.
4. **Antes de cualquier envío a Apple, auditar privacidad** (regla 34): declaración en App Store
   Connect, `docs/privacidad.md` y la página en nfgalindez.com/sorteos/privacidad/ tienen que
   decir lo mismo que hace el código.
5. **El aviso legal y el +18 se quedan.** Aplicación informativa independiente, no afiliada, no
   permite apostar, ante discrepancia vale el extracto oficial.
6. **La app nunca sugiere números** ni calcula probabilidades. Solo compara.
7. **Los nombres de estado interno van en castellano** (`validado`, `fuentes`, `turnos`,
   `dividendos`). Lo que se traduce es la interfaz.
8. **Los tests no tocan la red.** Usan HTML congelado en `backend/tests/fixtures/`. Si un test
   simula un caso roto, tiene que usar el contexto `tests/apoyo.entorno()`, que aísla `data/` y el
   log y silencia la salida: si no, los mensajes simulados salen al log de GitHub Actions y se leen
   igual que un problema real.

## Convenciones

- **El sello de fuentes viaja con el dato**, al lado de los números, nunca escondido en ajustes.
- **Turf: una sola fuente a propósito**, la oficial del hipódromo. Se muestra como
  "Fuente oficial: Hipódromo San Isidro", nunca "1 fuente".
- **Dividendos del turf en `float`**, con centavos. `money()` trunca y acá eso diría otra cosa.
- **Textos de la app**: `src/texto.tsx` exporta un `Text` propio que escala a mano con tope 1.25.
  No usar el `Text` de React Native directo (regla 33).
- **Cada arreglo de un error va a `ESTADO.md`** como regla numerada, con el síntoma que lo originó.
  Nunca se borra nada de ahí; lo que resultó falso se marca con ❌.

## Trampas conocidas

- **Un scraper que no encuentra nada no falla**: devuelve cero resultados en silencio (regla 50).
  Por eso cada parser tiene un test de cabecera.
- **Los tests pasan aunque la fuente real haya cambiado**, porque usan HTML congelado. El que avisa
  es el verificador.
- **App Store Connect se cuelga si se tipean textos largos** tecla por tecla: hay que setear el
  valor con JS y disparar el evento `input` (regla 30).
- **La ficha de la App Store tiene dos idiomas**, inglés y español, y el envío falla si falta un
  campo en el segundo (regla 54).
- **Desplegar la web sin `--branch main`** dice "Success" y no cambia nada: queda como vista previa
  (regla 48).
- **`site/index.html` del repo de la web no lo genera el script.** Editarlo a mano y no revisar
  `site/en/` y `site/pt/` deja texto en español en las otras dos (regla 55).
