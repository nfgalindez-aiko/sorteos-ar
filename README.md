# Sorteos AR

App iOS de solo consulta de resultados de loterías argentinas (Quini 6 y Brinco para empezar).
Brief completo y única fuente de verdad: [PROYECTO_SORTEOS_AR.md](PROYECTO_SORTEOS_AR.md).
Estado, errores y reglas aprendidas: [ESTADO.md](ESTADO.md).

```
backend/     scrapers Python (solo stdlib), tests, histórico   -> escriben data/
data/        JSON publicado (GitHub Pages): quini6/, brinco/   -> lo consume la app
ios/         app SwiftUI (iOS 16+), sin dependencias
docs/        textos de App Store y política de privacidad
.github/     cron de GitHub Actions que corre los scrapers y commitea data/
```

## Backend

```bash
cd backend
python3 -m unittest -v          # tests sin red sobre HTML real congelado
python3 quini6_scraper.py       # scrapea, cruza A y B, publica data/quini6/ si coinciden
python3 brinco_scraper.py
python3 historico.py 50         # últimos 50 sorteos de Quini 6 (pausa 2 s entre pedidos)
python3 run_all.py              # lo que corre el cron
```

Contrato de `data/<juego>/latest.json`, `NNNN.json` e `index.json`: brief, sección 6.5.
`validado:true` solo cuando las dos fuentes coinciden; si no, `latest.json` no se toca.

## Publicación (lo tiene que hacer el dueño)

1. `git init`, subir a GitHub.
2. Settings > Actions > General > Workflow permissions: *Read and write*.
3. Settings > Pages > Deploy from a branch: `main`, carpeta `/ (root)`.
4. Actions > scrape > *Run workflow* y verificar que
   `https://USUARIO.github.io/REPO/data/quini6/latest.json` responda 200.
5. Poner esa URL base en `ios/SorteosAR/SorteosARApp.swift` (`Config.baseURL`).
