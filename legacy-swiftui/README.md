# Sorteos AR — app iOS

SwiftUI, iOS 16+, sin dependencias externas. La app **no scrapea**: lee el JSON estático
que publica `backend/` en GitHub Pages (formato en `PROYECTO_SORTEOS_AR.md`, sección 6.5).

> Estado: fuentes escritas en Windows, **sin compilar** (no hay Xcode acá). Primer paso en la
> Mac: compilar, corregir lo que marque el compilador y anotarlo en `ESTADO.md`.

## Abrir el proyecto

Opción A (recomendada), con XcodeGen:

```bash
brew install xcodegen
cd ios && xcodegen generate && open SorteosAR.xcodeproj
```

Opción B, a mano en Xcode:

1. File > New > Project > iOS > App. Product Name `SorteosAR`, Interface SwiftUI, Language Swift.
2. Bundle Identifier `ar.sorteos.app`. Minimum Deployments iOS 16.0.
3. Borrar `ContentView.swift` y el `SorteosARApp.swift` generados.
4. Arrastrar la carpeta `ios/SorteosAR` al proyecto (Create groups, Copy items if needed).
5. Build Settings > `Treat Warnings as Errors` = Yes (criterio del brief: compila sin warnings).

## Antes de correr

`Config.baseURL` en `SorteosARApp.swift` ya apunta a
`https://nfgalindez-aiko.github.io/sorteos-ar/data/` (GitHub Pages del repo). Sin red la app
arranca en modo "sin conexión" con lo último cacheado.

Para probar sin backend publicado: servir `data/` localmente
(`cd .. && python3 -m http.server 8000`) y usar `http://localhost:8000/data/` como base
(en el simulador; para eso hay que permitir HTTP local en `Info.plist` con
`NSAllowsLocalNetworking`).

## Estructura

```
SorteosAR/
  SorteosARApp.swift        entrada, Config (URL base, disclaimer, zona horaria)
  Models/Modelos.swift      Juego, Sorteo, Modalidad, PremioFila, Indice, Jugada, Formato
  Services/
    ResultadosService.swift cliente HTTP + caché en Caches/ + modo offline
    JugadasStore.swift      jugadas del usuario en Documents/jugadas.json (solo local)
  Design/Tokens.swift       paleta por juego (claro/oscuro), espaciados, radios
  Views/
    InicioView.swift        tarjetas por juego, cuenta regresiva, disclaimer
    DetalleJuegoView.swift  modalidades en bolillas, premios, pozo extra, próximo
    HistoricoView.swift     índice de sorteos anteriores + detalle cargado por número
    ControlJugadaView.swift alta de 6 números y marcado de aciertos por modalidad
    AjustesView.swift       disclaimer, fuentes, versión, borrar jugadas
    Componentes.swift       BolillaView, FilaBolillas, PremiosTabla, CuentaRegresivaView…
```

## Criterios de la fase (brief 6.10) y cómo verificarlos en la Mac

- Compila sin warnings: `xcodebuild -scheme SorteosAR -destination 'platform=iOS Simulator,name=iPhone 15' build 2>&1 | grep -c warning` debe dar 0.
- Offline: cargar una vez con red, activar modo avión, relanzar: tiene que mostrar el último sorteo y el banner "Sin conexión".
- VoiceOver: en el simulador, Accessibility Inspector sobre una fila de bolillas debe leer "Tradicional: 2, 16, 20, 21, 22, 38".
- Dynamic Type: Settings > Accessibility > Larger Text al máximo; las bolillas pasan a grilla de 3 columnas (`ViewThatFits`).

## Reglas legales aplicadas en el código

- Ningún nombre de juego en el nombre de la app, ícono ni bundle id.
- Disclaimer completo en Inicio (siempre visible al pie), en Detalle y en Ajustes.
- Sin links externos, sin "jugá/apostá/comprá", sin la palabra "oficial" salvo dentro del disclaimer
  ("extracto oficial", "organismo oficial"), que es texto obligatorio del brief.
