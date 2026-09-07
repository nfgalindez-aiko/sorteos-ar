#!/usr/bin/env python3
# Sorteos AR - scraper Quini 6. Solo stdlib. Lee dos fuentes, compara, emite JSON.
# Uso: python quini6_scraper.py            -> scrapea el ultimo sorteo y publica en ../data/quini6
#      python quini6_scraper.py --offline  -> parsea backend/fixtures/quini6_{A,B}.html sin red
#      python quini6_scraper.py --no-publish
import re, sys, os
from common import (fetch, save_fixture, read_fixture, log, log_robots, to_text, money, count,
                    six, SIX_A, SIX_B, next_draw, build, publish, dump, write_json, FIX)

JUEGO = "quini6"
SRC_A = "https://www.tujugada.com.ar/quini6.asp"
SRC_A_HIST = "https://www.tujugada.com.ar/quini6.asp?sorteo={n}"
SRC_B = "https://www.quini-6-resultados.com.ar/"
SRC_B_HIST = "https://www.quini-6-resultados.com.ar/quini6/sorteo-{n}-del-dia-{d}-{m}-{y}.htm"
LO, HI = 0, 45
DIAS = (2, 6)  # miercoles y domingo
MODS = ("tradicional", "segunda", "revancha", "siempre_sale")


def premios_a(t, label):
    """Tabla 'PREMIOS <label> ACIERTOS GANAD. PREMIO 6 NROS. VAC. $ 1.855.130.508 5 NROS. 27 $ ...'"""
    m = re.search(r"PREMIOS " + re.escape(label) + r" ACIERTOS GANAD\. PREMIO((?: \d NROS\. (?:VAC\.|[\d.]+) \$ [\d.,]+)+)", t)
    if not m:
        raise ValueError(f"A: no encontre premios {label}")
    rows = re.findall(r"(\d) NROS\. (VAC\.|[\d.]+) \$ ([\d.,]+)", m.group(1))
    return [{"aciertos": int(a), "ganadores": count(g), "premio": money(p)} for a, g, p in rows]


def parse_a(h):
    t = to_text(h)
    m = re.search(r"QUINI 6 NRO:\s*(\d+)\s*-\s*(\d{1,2})/(\d{1,2})/(\d{4})", t)
    if not m:
        raise ValueError("A: no encontre cabecera de sorteo")
    t = t[m.start():]
    sorteo = int(m.group(1))
    fecha = f"{int(m.group(4)):04d}-{int(m.group(3)):02d}-{int(m.group(2)):02d}"
    labels = {"tradicional": ("TRADICIONAL", "TRADICIONAL"),
              "segunda": ("SEGUNDA VUELTA", "2DA VUELTA"),
              "revancha": ("REVANCHA", "REVANCHA"),
              "siempre_sale": ("SIEMPRE SALE", "SIEMPRE SALE")}
    mods = {}
    for k, (lnum, lprem) in labels.items():
        mods[k] = {"numeros": six(t, lnum, SIX_A, LO, HI), "premios": premios_a(t, lprem)}
    m = re.search(r"PREMIOS POZO EXTRA GANAD\. PREMIO (VAC\.|[\d.]+) \$ ([\d.,]+)", t)
    pozo_extra = {"ganadores": count(m.group(1)), "premio": money(m.group(2))} if m else None
    m = re.search(r"PROXIMO POZO\s*\$\s*([\d.]+)", t)
    return {"sorteo": sorteo, "fecha": fecha, "modalidades": mods, "pozo_extra": pozo_extra,
            "proximo": {"sorteo": sorteo + 1, "fecha": next_draw(fecha, DIAS),
                        "pozo": money(m.group(1)) if m else None}}


def premios_b(seccion):
    rows = re.findall(r"(\d) (VACANTE|[\d.]+) \$ ([\d.,]+)", seccion)
    if not rows:
        raise ValueError("B: seccion de premios vacia")
    return [{"aciertos": int(a), "ganadores": count(g), "premio": money(p)} for a, g, p in rows]


def six_any(t, labels, pat):
    for l in labels:
        try:
            return six(t, l, pat, LO, HI)
        except ValueError:
            pass
    raise ValueError(f"no encontre {labels[-1]}")


def parse_b(h):
    """Soporta la portada ('SORTEO DEL DIA 06/09/2026 NRO. SORTEO: 3406') y las paginas
    historicas ('SORTEO NRO. 3405 DEL DIA MIERCOLES 2-9-2026')."""
    t = to_text(h)
    m = re.search(r"SORTEO DEL DIA\s*(\d{2})/(\d{2})/(\d{4})\s*NRO\.?\s*SORTEO:\s*(\d+)", t)
    if m:
        sorteo = int(m.group(4))
        fecha = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    else:
        m = re.search(r"SORTEO NRO\.\s*(\d+)\s*DEL DIA\s*\w+\s*(\d{1,2})-(\d{1,2})-(\d{4})", t)
        if not m:
            raise ValueError("B: no encontre cabecera de sorteo")
        sorteo = int(m.group(1))
        fecha = f"{int(m.group(4)):04d}-{int(m.group(3)):02d}-{int(m.group(2)):02d}"
    t = t[m.start():]
    labels = {"tradicional": "TRADICIONAL", "segunda": "LA SEGUNDA",
              "revancha": "REVANCHA", "siempre_sale": "SIEMPRE SALE"}
    nums = {"tradicional": six_any(t, ["TRADICIONAL"], SIX_B),
            "segunda": six_any(t, ["LA SEGUNDA DEL QUINI", "LA SEGUNDA"], SIX_B),
            "revancha": six_any(t, ["REVANCHA"], SIX_B),
            "siempre_sale": six_any(t, ["SIEMPRE SALE"], SIX_B)}
    i = t.find("DETALLE DE GANADORES")
    if i < 0:
        raise ValueError("B: no encontre detalle de ganadores")
    det = t[i:]
    for fin in ("EN CASO DE DISCREPANCIA", "JUGAR COMPULSIVAMENTE"):
        j = det.find(fin)
        if j > 0:
            det = det[:j]
            break
    order = ["TRADICIONAL", "LA SEGUNDA", "REVANCHA", "SIEMPRE SALE", "POZO EXTRA"]
    pos = {l: det.find(" " + l + " ") for l in order}
    if any(p < 0 for p in pos.values()):
        raise ValueError(f"B: faltan secciones de premios {pos}")
    secs = {}
    for idx, l in enumerate(order):
        end = pos[order[idx + 1]] if idx + 1 < len(order) else len(det)
        secs[l] = det[pos[l]:end]
    mods = {k: {"numeros": nums[k], "premios": premios_b(secs[l])} for k, l in labels.items()}
    m = re.search(r"POZO EXTRA (?:\d|-) (VACANTE|[\d.]+) \$ ([\d.,]+)", secs["POZO EXTRA"])
    pozo_extra = {"ganadores": count(m.group(1)), "premio": money(m.group(2))} if m else None
    prox = {"sorteo": sorteo + 1, "fecha": next_draw(fecha, DIAS), "pozo": None}
    m = re.search(r"PR.XIMO SORTEO EL D.A \w+ (\d{2})/(\d{2})/(\d{4})", t)
    if m:
        prox["fecha"] = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    m = re.search(r"POZO ACUMULADO:\s*\$\s*([\d.]+)", t)
    if m:
        prox["pozo"] = money(m.group(1))
    m = re.search(r"SER. EL SORTEO N.MERO (\d+)", t)
    if m:
        prox["sorteo"] = int(m.group(1))
    return {"sorteo": sorteo, "fecha": fecha, "modalidades": mods, "pozo_extra": pozo_extra,
            "proximo": prox}


def scrape(offline=False):
    res = {}
    for name, url, parser in (("A", SRC_A, parse_a), ("B", SRC_B, parse_b)):
        fx = f"{JUEGO}_{name}.html"
        try:
            if offline:
                h = read_fixture(fx)
            else:
                h = fetch(url)
                save_fixture(fx, h)
            res[name] = parser(h)
            log(f"{JUEGO} {name} OK sorteo {res[name]['sorteo']}")
        except Exception as e:
            res[name] = {"error": f"{type(e).__name__}: {e}"}
            log(f"{JUEGO} {name} ERROR {e}")
    return res


def main(argv):
    offline = "--offline" in argv
    no_publish = "--no-publish" in argv
    if not offline:
        log_robots()
    res = scrape(offline)
    out, diffs = build(JUEGO, res)
    estado = "OK" if out["validado"] else "MISMATCH"
    report = {"fuentes": res, "diferencias": diffs, "estado": estado, "salida": out}
    print(dump(report))
    write_json(os.path.join(FIX, f"{JUEGO}_out.json"), report)
    log(f"{JUEGO} ESTADO {estado} diferencias={diffs}")
    if not no_publish and "sorteo" in out:
        publish(JUEGO, out)
    sys.exit(0 if estado == "OK" else 1)


if __name__ == "__main__":
    main(sys.argv[1:])
