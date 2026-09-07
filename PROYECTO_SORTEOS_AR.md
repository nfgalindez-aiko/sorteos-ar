# PROYECTO "SORTEOS AR" — brief completo para Claude Code

Leé este archivo entero antes de tocar nada. Es la única fuente de verdad del proyecto. Trabajás en español rioplatense, directo, sin preámbulos. Verificás todo lo que afirmás: "no lo encontré" no es "no existe", "código de salida cero" no es "funcionó". Cada entrega trae su propio chequeo.

## 1. Qué es

App iOS de SOLO CONSULTA de resultados de loterías argentinas. Sin apuestas, sin compra de cupones, sin links a sitios de apuestas. Arranca con Quini 6 y Brinco (ambos de Lotería de Santa Fe); diseñada para agregar después Loto Plus, Poceada, Quinielas provinciales.

Por qué existe: la app más usada para esto en Android (net.quini6.app, 310.000 descargas) fue dada de baja de Google Play el 05/07/2025. Nunca hubo app oficial para el público (lo oficial, PAC / App del Agenciero, es para agencias). En iOS no hay nada sólido. Hueco: multi-lotería + iOS + notificación rápida la noche del sorteo.

## 2. Decisiones ya tomadas (no se rediscuten)

1. Plataforma: iOS solamente. SwiftUI, iOS 16+, sin dependencias externas salvo que sea imprescindible.
2. Arquitectura: la app NO scrapea. Un backend mínimo scrapea dos fuentes, valida cruzado y publica JSON estático. La app consume ese JSON. Razón: si cambia el HTML se arregla sin pasar por App Store.
3. Backend: Python 3, solo stdlib, corriendo como cron de GitHub Actions que escribe JSON a GitHub Pages (costo cero, sin servidor). Push notifications quedan para fase 2.
4. Nombre provisorio: **Sorteos AR**. El nombre final NO puede contener "Quini", "Brinco" ni "Lotería de Santa Fe".
5. Identidad visual: INSPIRADA en la familia cromática de los juegos, nunca copia. Tipografía de sistema (SF Pro). Sin logos de ninguna lotería.

## 3. Reglas legales (obligatorias en todo el código y textos)

- "Quini 6" es marca registrada de la Provincia de Santa Fe. La provincia litiga por uso indebido (fallo contra Meta, julio 2025, Juzgado Federal Nº 2 de Santa Fe, por "nombre, identidad visual y prestigio").
- La app usa los nombres de los juegos solo de forma descriptiva (como un diario). Nunca en el nombre de la app, el ícono ni el bundle id.
- Disclaimer visible en pantalla principal y en la ficha de App Store: "Aplicación informativa independiente. No está afiliada a Lotería de Santa Fe ni a ningún organismo oficial. No permite apostar. Ante cualquier discrepancia vale el extracto oficial. Jugar compulsivamente es perjudicial para la salud. +18."
- Sin links a apuestas online, sin llamados a "jugá", "apostá", "comprá".
- Clasificación App Store: 17+. Categoría: News o Utilities. Guideline 5.3: no vender ni facilitar cupones.

## 4. Fuentes de datos (verificadas el 07/09/2026)

Dos fuentes no oficiales, públicas, accesibles con GET simple, coincidieron número por número en el sorteo 3406 del 06/09/2026:

Fuente A — tujugada.com.ar
- Quini 6 último: https://www.tujugada.com.ar/quini6.asp
- Quini 6 histórico: https://www.tujugada.com.ar/quini6.asp?sorteo=NNNN
- Brinco: https://www.tujugada.com.ar/brinco.asp
- HTML ASP con tablas. Cabecera "QUINI 6 Nro: 3406 - 6/9/2026". Por modalidad: tabla de 6 números (sin cero a la izquierda) y tabla Aciertos/Ganad./Premio. "PROXIMO POZO $ 12.860.000.000".
- robots.txt: reportado por terceros como Allow / y Disallow /data/. SIN VERIFICAR: leerlo y dejarlo en el log antes del primer scrape.

Fuente B — quini-6-resultados.com.ar
- Quini 6 último: https://www.quini-6-resultados.com.ar/
- Histórico: https://www.quini-6-resultados.com.ar/quini6/sorteo-NNNN-del-dia-DD-MM-AAAA.htm (índice en /quini6/sorteos-anteriores.aspx)
- Brinco: https://www.quini-6-resultados.com.ar/brinco/brincoresultados.aspx
- Números con dos dígitos separados por " - ". Cabecera "Sorteo del dia 06/09/2026 Nro. Sorteo: 3406". "POZO ACUMULADO: $12.860.000.000". Tiene /webmasters.aspx ("Resultados en tu WEB"): revisar si es un feed usable.
- robots.txt: SIN VERIFICAR.

Diferencias a normalizar: A "2" / B "02" → entero. A premios redondeados / B con decimales → comparar enteros truncados. A "SEGUNDA VUELTA" / B "LA SEGUNDA" → clave "segunda".

Fuente oficial (solo validación manual, NO scrapear: bloquea bots): https://www.loteriasantafe.gov.ar/index.php/resultados/quini-6 y YouTube @loteriadesantafe3533. El endpoint apps.loteriasantafe.gov.ar:8443 es un entorno DEV: no usarlo.

Respaldo pago si las fuentes fallan: API "Loterias y quinielas argentinas" de Downtack en RapidAPI (precio sin cotizar).

Datos de referencia para tests (sorteo 3406, 06/09/2026):
Tradicional 2,16,20,21,22,38 (6 aciertos: vacante, $1.855.130.508) · Segunda 12,16,23,26,28,34 · Revancha 0,3,22,32,37,41 · Siempre Sale 0,3,4,13,23,42 · Pozo Extra 718 ganadores $278.551 · Próximo pozo $12.860.000.000, sorteo 3407 el mié 09/09/2026.
Quini 6 sortea miércoles y domingos 21:15 (hora Argentina). Números del 0 al 45.

## 5. Scraper Quini 6 (ya escrito, probado solo contra fixtures sintéticos)

Guardalo como `backend/quini6_scraper.py`. Primer paso obligatorio: correrlo contra los sitios reales. Guarda el HTML real en `fixtures/` y un log en `scraper.log`. Salida esperada: JSON con `"estado": "OK"` y `"diferencias": []`. Si da MISMATCH o ERROR, ajustar los regex usando el HTML real de `fixtures/` y volver a correr hasta OK. Después convertir los HTML reales en fixtures de test permanentes.

```python
#!/usr/bin/env python3
# Sorteos AR - scraper Quini 6. Solo stdlib. Lee dos fuentes, compara, emite JSON.
import json, re, sys, os, html, urllib.request
from html.parser import HTMLParser
from datetime import datetime

UA = "Mozilla/5.0 (Macintosh) SorteosAR/0.1"
SRC_A = "https://www.tujugada.com.ar/quini6.asp"
SRC_B = "https://www.quini-6-resultados.com.ar/"
ROBOTS = ["https://www.tujugada.com.ar/robots.txt",
          "https://www.quini-6-resultados.com.ar/robots.txt"]
FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scraper.log")

def log(msg):
    line = f"{datetime.now().isoformat(timespec='seconds')} {msg}"
    print(line)
    with open(LOG, "a") as f:
        f.write(line + "\n")

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
    for enc in ("utf-8", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            pass
    return raw.decode("utf-8", "replace")

class Stripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.out = []
        self.skip = 0
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
        self.out.append(" ")
    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.skip:
            self.skip -= 1
        self.out.append(" ")
    def handle_data(self, d):
        if not self.skip:
            self.out.append(d)

def to_text(h):
    s = Stripper(); s.feed(h)
    t = html.unescape("".join(s.out)).replace("\xa0", " ")
    return re.sub(r"\s+", " ", t).upper()

def money(s):
    return int(re.sub(r"[^\d]", "", s.split(",")[0]))

SIX_A = r"\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\b"
SIX_B = r"\s+(\d{2})\s*-\s*(\d{2})\s*-\s*(\d{2})\s*-\s*(\d{2})\s*-\s*(\d{2})\s*-\s*(\d{2})\b"

def six(text, label, pat):
    m = re.search(re.escape(label) + pat, text)
    if not m:
        raise ValueError(f"no encontre {label}")
    return sorted(int(x) for x in m.groups())

def parse_a(h):
    t = to_text(h)
    m = re.search(r"QUINI 6 NRO:\s*(\d+)\s*-\s*(\d{1,2})/(\d{1,2})/(\d{4})", t)
    if not m:
        raise ValueError("A: no encontre cabecera de sorteo")
    d = {"sorteo": int(m.group(1)),
         "fecha": f"{int(m.group(4)):04d}-{int(m.group(3)):02d}-{int(m.group(2)):02d}",
         "tradicional": six(t, "TRADICIONAL", SIX_A),
         "segunda": six(t, "SEGUNDA VUELTA", SIX_A),
         "revancha": six(t, "REVANCHA", SIX_A),
         "siempre_sale": six(t, "SIEMPRE SALE", SIX_A)}
    m = re.search(r"PROXIMO POZO\s*\$\s*([\d.]+)", t)
    d["proximo_pozo"] = money(m.group(1)) if m else None
    m = re.search(r"PREMIOS TRADICIONAL.*?6 NROS\.\s+(\S+)\s+\$\s*([\d.]+)", t)
    d["tradicional_6_premio"] = money(m.group(2)) if m else None
    return d

def parse_b(h):
    t = to_text(h)
    m = re.search(r"SORTEO DEL DIA\s*(\d{2})/(\d{2})/(\d{4})\s*NRO\.?\s*SORTEO:\s*(\d+)", t)
    if not m:
        raise ValueError("B: no encontre cabecera de sorteo")
    d = {"sorteo": int(m.group(4)),
         "fecha": f"{m.group(3)}-{m.group(2)}-{m.group(1)}",
         "tradicional": six(t, "TRADICIONAL", SIX_B),
         "segunda": six(t, "LA SEGUNDA", SIX_B),
         "revancha": six(t, "REVANCHA", SIX_B),
         "siempre_sale": six(t, "SIEMPRE SALE", SIX_B)}
    m = re.search(r"POZO ACUMULADO:\s*\$\s*([\d.]+)", t)
    d["proximo_pozo"] = money(m.group(1)) if m else None
    m = re.search(r"TRADICIONAL\s+6\s+(\S+)\s+\$\s*([\d.,]+)", t)
    d["tradicional_6_premio"] = money(m.group(2)) if m else None
    return d

def main():
    os.makedirs(FIX, exist_ok=True)
    for u in ROBOTS:
        try:
            log(f"ROBOTS {u}\n{fetch(u).strip()[:600]}")
        except Exception as e:
            log(f"ROBOTS {u} ERROR {e}")
    res = {}
    for name, url, parser in (("A", SRC_A, parse_a), ("B", SRC_B, parse_b)):
        try:
            h = fetch(url)
            with open(os.path.join(FIX, f"quini6_{name}.html"), "w") as f:
                f.write(h)
            res[name] = parser(h)
            log(f"{name} OK sorteo {res[name]['sorteo']}")
        except Exception as e:
            res[name] = {"error": str(e)}
            log(f"{name} ERROR {e}")
    keys = ["sorteo", "fecha", "tradicional", "segunda", "revancha", "siempre_sale",
            "proximo_pozo", "tradicional_6_premio"]
    diffs = [k for k in keys if "error" in res["A"] or "error" in res["B"]
             or res["A"].get(k) != res["B"].get(k)]
    out = {"fuentes": res, "diferencias": diffs,
           "estado": "OK" if not diffs else "MISMATCH",
           "generado": datetime.now().isoformat(timespec="seconds")}
    print(json.dumps(out, ensure_ascii=False, indent=2))
    with open(os.path.join(FIX, "quini6_out.json"), "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    log(f"ESTADO {out['estado']} diferencias={diffs}")
    sys.exit(0 if not diffs else 1)

if __name__ == "__main__":
    main()
```

## 6. Plan de trabajo (en orden, cada paso con su verificación)

### Fase 1 — Motor de datos
1. Correr el scraper contra los sitios reales. Criterio: `estado OK`. Leer y guardar los robots.txt de ambas fuentes.
2. Tests con el HTML real como fixture (`backend/tests/`), sin red. Criterio: `python3 -m unittest` en verde.
3. Scraper de Brinco con la misma estructura (dos fuentes, validación cruzada). Brinco: 6 números del 0 al 39, sorteo domingos. Criterio: OK contra el último sorteo real.
4. Histórico: bajar los últimos 50 sorteos de Quini 6 desde fuente A (`?sorteo=NNNN`), con pausa de 2 s entre pedidos, y guardarlos en `data/quini6/NNNN.json`. Criterio: 50 archivos, todos con 4 modalidades de 6 números.
5. Formato del JSON publicado (fijo, la app depende de esto):
   - `data/quini6/latest.json` y `data/brinco/latest.json`:
     `{"juego":"quini6","sorteo":3406,"fecha":"2026-09-06","modalidades":{"tradicional":{"numeros":[2,16,20,21,22,38],"premios":[{"aciertos":6,"ganadores":0,"premio":1855130508}]},"segunda":...,"revancha":...,"siempre_sale":...},"pozo_extra":{"ganadores":718,"premio":278551},"proximo":{"sorteo":3407,"fecha":"2026-09-09","pozo":12860000000},"validado":true,"fuentes":["A","B"],"generado":"2026-09-06T21:40:00-03:00"}`
   - `data/quini6/index.json`: lista de `{sorteo,fecha}` disponibles.
   - Si las dos fuentes no coinciden, NO se publica: se deja el anterior y se loguea el conflicto.
6. GitHub Actions: workflow con cron cada 5 minutos entre 21:00 y 23:59 hora Argentina (UTC-3) los miércoles y domingos, más una corrida diaria a las 12:00. Commitea `data/` y publica en GitHub Pages. Criterio: la URL pública de `latest.json` responde 200 con el sorteo vigente.

### Fase 2 — App iOS
7. Proyecto Xcode `SorteosAR`, SwiftUI, iOS 16+. Bundle id sin marcas (ej. `ar.sorteos.app`). Estructura: `Models/`, `Services/` (cliente HTTP del JSON con caché en disco y modo offline), `Views/`, `Design/` (paleta y espaciados como tokens).
8. Pantallas mínimas:
   - Inicio: tarjetas por juego (Quini 6, Brinco) con último sorteo, fecha, próximo pozo y cuenta regresiva al próximo sorteo.
   - Detalle del juego: las modalidades con sus 6 números en bolillas, tabla de premios, pozo extra.
   - Histórico: lista de sorteos anteriores, tocar abre el detalle.
   - Control de jugada: el usuario carga sus 6 números (guardados localmente, sin cuenta ni servidor) y la app marca aciertos por modalidad. Solo compara, no aconseja.
   - Ajustes: disclaimer completo, fuentes, versión, borrar jugadas guardadas.
9. Diseño: paleta inspirada (verdes/amarillos para Quini 6, otra familia para Brinco), tipografía de sistema, bolillas circulares con número grande, soporte dark mode y Dynamic Type. Sin logos ajenos. Sin la palabra "oficial" en ningún lado.
10. Criterios de la fase: compila sin warnings, funciona offline con el último JSON cacheado, muestra estado "sin conexión" en vez de fallar, y VoiceOver lee los números.

### Fase 3 — Publicación
11. Textos de App Store (nombre, subtítulo, descripción, palabras clave) sin marcas en nombre/subtítulo y con el disclaimer. Capturas. Política de privacidad (no recolecta datos: las jugadas quedan en el dispositivo).
12. Push notifications (requiere servicio: evaluar APNs directo desde un worker o un proveedor gratuito). Solo cuando el JSON pase de `validado:false` a `validado:true` de un sorteo nuevo.

## 7. Lo que hace falta del dueño del proyecto

- Mac con Xcode instalado.
- Cuenta Apple Developer (USD 99/año) antes de publicar; para desarrollo local no hace falta.
- Repositorio en GitHub con Pages habilitado para el backend.
- Decidir el nombre definitivo (ver regla 4).

## 8. Registro de errores y estado

Mantené un archivo `ESTADO.md` en la raíz del repo con: objetivo, tabla de resultados con estado (✅ ⏳ 🔴 🔎), reglas numeradas aprendidas, pendientes con dueño, y secciones numeradas por sesión con fecha. Nunca se borra nada: lo que resultó falso se marca ❌ y se corrige en una sección nueva. Cuando te equivocás, no pedís perdón: lo anotás con la causa.
