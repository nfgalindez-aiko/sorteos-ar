#!/usr/bin/env python3
# Sorteos AR - scraper de turf. Por ahora solo el Hipodromo de San Isidro (Jockey Club).
#
# UNA SOLA FUENTE, y a proposito: es el parte de dividendos OFICIAL del hipodromo, no un sitio de
# terceros. Cruzar dos diarios que copian del mismo parte no agrega nada. Por eso estos dias se
# publican con `fuentes: ["oficial"]` y la app NO puede mostrarles el sello "2 fuentes": les
# corresponde "fuente oficial" (ver ESTADO, decision del 15/09/2026).
#
# La pagina /partediv/ arma la tabla con JavaScript, asi que no sirve bajarla derecho. Adentro
# hace `$.get("/wacP/public/partediv/AAAAMMDD")`, que devuelve el HTML ya armado y SI se puede
# leer con la biblioteca estandar. Ese es el endpoint que usamos.
#
# Los dias sin carreras contestan igual, pero con "Reunion Nro. -" sin numero y sin tablas: eso
# no es un error, es que no se corrio.
#
# Uso: python turf_scraper.py [--offline] [--no-publish] [--dias 7]
import re, sys, os, glob, html
from datetime import timedelta

import common
from common import (fetch, save_fixture, read_fixture, log, now_art, dump, write_json, read_json)

JUEGO = "turf"
HIPODROMO = "sanisidro"
NOMBRE = "San Isidro"
SRC = "https://hipodromosanisidro.com/wacP/public/partediv/{fecha}?nocache=1"
DIAS_ATRAS = 7          # cuantos dias hacia atras revisar en cada corrida


def celdas(fila):
    """Texto de cada <td> de una fila, en orden y sin etiquetas."""
    out = []
    for c in re.findall(r"<td[^>]*>(.*?)</td>", fila, re.S | re.I):
        t = html.unescape(re.sub(r"<[^>]+>", " ", c))
        out.append(re.sub(r"\s+", " ", t).strip())
    return out


def numero(s):
    """'2.05' -> 2.05, '' -> None. El dividendo del turf lleva centavos y hay que conservarlos:
    2.05 es lo que paga cada peso apostado, no 2 pesos."""
    s = (s or "").strip()
    if not re.fullmatch(r"\d+(?:\.\d+)?", s):
        return None
    return float(s)


def parse(h, fecha):
    """HTML del endpoint -> dict del dia, o None si ese dia no hubo reunion."""
    # el HTML viene con entidades sin resolver: "Reuni&oacute;n Nro.84"
    m = re.search(r"Reuni(?:&oacute;|ó|o)n\s*Nro\.\s*(\d+)", h)
    if not m:
        return None
    reunion = int(m.group(1))
    carreras = []
    # cada carrera es una fila de la tabla exterior: <td><h6><strong>N</strong></h6></td> y al lado
    # dos tablas, la de posiciones (GAN/SEG/TER) y la de apuestas (Exacta, Trifecta, ...).
    bloques = re.split(r"<td[^>]*>\s*<h6[^>]*>\s*<strong>\s*(\d+)\s*</strong>", h, flags=re.I)
    for i in range(1, len(bloques) - 1, 2):
        num, cuerpo = int(bloques[i]), bloques[i + 1]
        posiciones, apuestas = [], []
        for fila in re.findall(r"<tr[^>]*>(.*?)</tr>", cuerpo, re.S | re.I):
            c = celdas(fila)
            if len(c) >= 3 and c[0] in ("GAN", "SEG", "TER") and c[2]:
                divs = [numero(x) for x in c[3:6]]
                posiciones.append({"puesto": c[0], "orden": int(c[1]) if c[1].isdigit() else None,
                                   "competidor": c[2],
                                   "dividendos": [d for d in divs if d is not None]})
            elif len(c) == 3 and c[0] and c[2] and numero(c[2]) is not None and c[0] not in ("Apuesta",):
                apuestas.append({"apuesta": c[0], "marcador": c[1], "dividendo": numero(c[2])})
        if posiciones:
            carreras.append({"numero": num, "posiciones": posiciones, "apuestas": apuestas})
    if not carreras:
        return None
    return {"hipodromo": HIPODROMO, "nombre": NOMBRE, "reunion": reunion, "fecha": fecha,
            "carreras": carreras}


def bajar(fecha, offline=False):
    """fecha en 'AAAA-MM-DD'. Devuelve el dict del dia o None si no hubo reunion."""
    compacta = fecha.replace("-", "")
    fx = f"{JUEGO}_{HIPODROMO}_{compacta}.html"
    if offline:
        try:
            h = read_fixture(fx)
        except Exception:
            return None
    else:
        h = fetch(SRC.format(fecha=compacta))
    d = parse(h, fecha)
    if d and not offline:
        save_fixture(f"{JUEGO}_{HIPODROMO}.html", h)  # ultimo dia con carreras, para los tests
    return d


def publicar(dias):
    """dias = lista de dicts del parser. Escribe data/turf/sanisidro/ igual que la quiniela."""
    d = os.path.join(common.DATA, JUEGO, HIPODROMO)
    cambios = 0
    for out in dias:
        out = dict(out)
        out["validado"] = True          # es el parte oficial: no hay con que cruzarlo ni hace falta
        out["fuentes"] = ["oficial"]
        out["generado"] = now_art()
        if write_json(os.path.join(d, f"{out['fecha']}.json"), out):
            cambios += 1
    archivos = sorted(glob.glob(os.path.join(d, "[0-9]*.json")))
    if not archivos:
        return cambios
    ultimo = read_json(archivos[-1])
    write_json(os.path.join(d, "latest.json"), ultimo)
    idx = []
    for p in archivos[-90:]:
        j = read_json(p)
        idx.append({"fecha": j["fecha"], "reunion": j["reunion"], "carreras": len(j["carreras"])})
    idx.sort(key=lambda x: x["fecha"], reverse=True)
    write_json(os.path.join(d, "index.json"),
               {"juego": JUEGO, "hipodromo": HIPODROMO, "nombre": NOMBRE, "fechas": idx,
                "generado": now_art()})
    return cambios


def correr(offline=False, publicar_=True, dias_atras=DIAS_ATRAS):
    hoy = common.datetime.now(common.ART).date()
    encontrados, fallos = [], []
    for i in range(dias_atras):
        fecha = (hoy - timedelta(days=i)).isoformat()
        try:
            d = bajar(fecha, offline)
        except Exception as e:
            log(f"{JUEGO}/{HIPODROMO} {fecha} ERROR {e}")
            fallos.append(f"{fecha}: {e}")
            continue
        if d:
            encontrados.append(d)
    if encontrados:
        ult = encontrados[0]
        log(f"{JUEGO}/{HIPODROMO} OK {len(encontrados)} reunion(es); ultima {ult['fecha']} "
            f"Nro.{ult['reunion']} con {len(ult['carreras'])} carreras")
    else:
        log(f"{JUEGO}/{HIPODROMO} sin reuniones en los ultimos {dias_atras} dias")
    if publicar_ and encontrados:
        publicar(encontrados)
    return encontrados, fallos


def main(argv):
    offline = "--offline" in argv
    dias = int(argv[argv.index("--dias") + 1]) if "--dias" in argv else DIAS_ATRAS
    encontrados, fallos = correr(offline, "--no-publish" not in argv, dias)
    print(dump({"reuniones": [{"fecha": d["fecha"], "reunion": d["reunion"],
                               "carreras": len(d["carreras"])} for d in encontrados],
                "fallos": fallos}))
    sys.exit(1 if fallos else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
