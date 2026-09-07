# Sorteos AR

App iOS de solo consulta de resultados de loterías argentinas (Quini 6 y Brinco para empezar).
Brief completo y única fuente de verdad: [PROYECTO_SORTEOS_AR.md](PROYECTO_SORTEOS_AR.md).
Estado, errores y reglas aprendidas: [ESTADO.md](ESTADO.md).

```
backend/     scrapers Python (solo stdlib), tests, histórico   -> escriben data/
data/        JSON publicado (GitHub Pages): quini6/, brinco/   -> lo consume la app
app/         app Expo (React Native + TypeScript, expo-router); EAS Build/Update
legacy-swiftui/  primer intento en SwiftUI, descartado (ver DESCARTADO.md)
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
python3 lotoplus_scraper.py     # Loto Plus (A+B), mismo formato que Quini 6 + numero_plus
python3 quiniela_scraper.py     # quinielas (7 provincias), validación por turno
python3 poceada_scraper.py      # Poceada (A) cruzada con la nocturna de la Quiniela de la Ciudad
python3 verificador.py          # lee los JSON públicos como la app y falla si algo está roto
python3 run_all.py              # lo que corre el cron
```

Contrato de `data/<juego>/latest.json`, `NNNN.json` e `index.json`: brief, sección 6.5.
Quinielas: `data/quiniela/<prov>/<YYYY-MM-DD>.json`, `latest.json`, `index.json` y el resumen
`data/quiniela/latest.json` (cabezas del día por provincia). Validación por turno.
Verificador: workflow `verificar` cada hora; abre un issue con etiqueta `verificador` si hay problemas y lo cierra al normalizarse.
`validado:true` solo cuando las dos fuentes coinciden; si no, `latest.json` no se toca.

## Publicación

- Repo: https://github.com/nfgalindez-aiko/sorteos-ar (público; Pages desde `main`, carpeta raíz).
- Actions con permiso de escritura: el workflow `scrape` commitea `data/` solo.
- JSON público: `https://nfgalindez-aiko.github.io/sorteos-ar/data/quini6/latest.json`
  (también `brinco/latest.json`, `<juego>/index.json`, `<juego>/NNNN.json`).
- La app ya apunta a esa base (`extra.baseURL` en `app/app.json`).
- Página, privacidad, términos y soporte: https://nfgalindez.com/sorteos/ (repo `nfgalindez.com`, `generar.py`).
