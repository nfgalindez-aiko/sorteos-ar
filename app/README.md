# Sorteos AR — app (Expo / React Native)

Expo SDK 57, expo-router, TypeScript estricto. Sin backend propio: lee el JSON estático de
`https://nfgalindez-aiko.github.io/sorteos-ar/data/` (formato en `../PROYECTO_SORTEOS_AR.md` §6.5).

Proyecto EAS: `@gestionaiko/sorteos-ar` → https://expo.dev/accounts/gestionaiko/projects/sorteos-ar

## Probar en Expo Go (sin computadora)

Ya hay un update publicado en la rama `preview` (runtime `exposdk:57.0.0`). En el iPhone con
Expo Go instalado y la cuenta `gestionaiko` iniciada: expo.dev → proyecto `sorteos-ar` →
Updates → rama `preview` → "Open in Expo Go". O desde la app Expo Go, pestaña Projects.

Cada vez que se cambia código, republicar:

```bash
cd app && npx eas-cli update --branch preview --environment preview --message "qué cambió" --non-interactive
```

## Probar en Expo Go (con computadora)

```bash
cd app && npm install --legacy-peer-deps && npx expo start
```

Escanear el QR con la cámara del iPhone (abre Expo Go). Si el teléfono no está en la misma
red: `npx expo start --tunnel`.

## Chequeos sin red

```bash
cd app && npx tsc --noEmit && npx expo-doctor && npx expo export --platform ios --output-dir /tmp/x
```

## Build para TestFlight (EAS Build)

La primera vez EAS necesita las credenciales de Apple (certificado de distribución y perfil).
Requiere una sesión interactiva con el Apple ID del dueño o una API key de App Store Connect:

```bash
cd app && npx eas-cli build --platform ios --profile production
```

Después:

```bash
cd app && npx eas-cli submit --platform ios --latest
```

`preview` genera un build de distribución interna (ad hoc, hay que registrar el UDID del
iPhone); `production` es el que va a TestFlight / App Store.

## Estructura

```
app/                  rutas (expo-router)
  _layout.tsx         providers + Stack
  index.tsx           Inicio: tarjetas por juego, cuenta regresiva, disclaimer
  ajustes.tsx         disclaimer, fuentes, borrar jugadas, privacidad, soporte, versión
  juego/[juego]/
    index.tsx         detalle del último sorteo (bolillas, premios, pozo extra, próximo)
    historico.tsx     índice de sorteos anteriores
    sorteo/[numero].tsx  un sorteo puntual (con caché)
    control.tsx       jugadas guardadas + alta de 6 números + aciertos por modalidad
src/
  modelos.ts          tipos del JSON, metadatos de cada juego, disclaimer
  formato.ts          pesos, fechas, cuenta regresiva (sin Intl)
  design.ts           tokens y paletas claro/oscuro por juego
  api.tsx             cliente del JSON con caché en AsyncStorage y modo offline
  jugadas.tsx         jugadas locales (AsyncStorage) y cálculo de aciertos
  componentes.tsx     Bolilla, FilaBolillas, PremiosTabla, CuentaRegresiva, banners
  sorteo-detalle.tsx  render completo de un sorteo
```

## Reglas legales aplicadas

Ningún nombre de juego en nombre, slug, bundle id (`ar.sorteos.app`) ni ícono. Disclaimer en
Inicio, Detalle y Ajustes. Sin links a apuestas, sin "jugá/apostá/comprá". Los únicos links
externos son la privacidad y el soporte en nfgalindez.com/sorteos/.

## Pendiente

- Ícono propio (hoy es el placeholder del template en `assets/`). Sin logos de ninguna lotería.
- Verificar en el teléfono: VoiceOver sobre una fila de bolillas ("Tradicional: 2, 16, …"),
  modo avión con caché, Dynamic Type grande.
