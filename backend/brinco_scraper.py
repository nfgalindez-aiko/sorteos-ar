#!/usr/bin/env python3
# Sorteos AR - scraper Brinco. Solo stdlib. Dos fuentes, validacion cruzada, JSON.
# Uso: python brinco_scraper.py [--offline] [--no-publish]
import re, sys, os
from common import (fetch, save_fixture, read_fixture, log, log_robots, to_text, money, count,
                    six, SIX_A, SIX_SP, next_draw, build, publish, dump, write_json, FIX)

JUEGO = "brinco"
SRC_A = "https://www.tujugada.com.ar/brinco.asp"
SRC_B = "https://www.quini-6-resultados.com.ar/brinco/brincoresultados.aspx"
LO, HI = 0, 39
DIAS = (6,)  # domingos


def premios_a(t, label):
    m = re.search(r"PREMIOS " + re.escape(label) + r" ACIERTOS GANAD\. PREMIO((?: \d NROS\. (?:VAC\.|[\d.]+) \$ [\d.,]+)+)", t)
    if not m:
        raise ValueError(f"A: no encontre premios {label}")
    rows = re.findall(r"(\d) NROS\. (VAC\.|[\d.]+) \$ ([\d.,]+)", m.group(1))
    return [{"aciertos": int(a), "ganadores": count(g), "premio": money(p)} for a, g, p in rows]


def parse_a(h):
    t = to_text(h)
    m = re.search(r"BRINCO SORTEO:\s*(\d+)\s*-\s*(\d{1,2})/(\d{1,2})/(\d{4})", t)
    if not m:
        raise ValueError("A: no encontre cabecera de sorteo")
    t = t[m.start():]
    sorteo = int(m.group(1))
    fecha = f"{int(m.group(4)):04d}-{int(m.group(3)):02d}-{int(m.group(2)):02d}"
    mods = {"tradicional": {"numeros": six(t, "MODALIDAD TRADICIONAL", SIX_A, LO, HI),
                            "premios": premios_a(t, "TRADICIONAL")},
            "junior": {"numeros": six(t, "MODALIDAD JUNIOR", SIX_A, LO, HI),
                       "premios": premios_a(t, "JUNIOR")}}
    m = re.search(r"BRINCO: PROXIMO POZO\s*\$\s*([\d.]+)", t)
    return {"sorteo": sorteo, "fecha": fecha, "modalidades": mods, "pozo_extra": None,
            "proximo": {"sorteo": sorteo + 1, "fecha": next_draw(fecha, DIAS),
                        "pozo": money(m.group(1)) if m else None}}


def parse_b(h):
    t = to_text(h)
    m = re.search(r"RESULTADOS DEL BRINCO SORTEO (\d+) DEL \w+ (\d{2})/(\d{2})/(\d{4})", t)
    if not m:
        raise ValueError("B: no encontre cabecera de sorteo")
    t = t[m.start():]
    sorteo = int(m.group(1))
    fecha = f"{m.group(4)}-{m.group(3)}-{m.group(2)}"
    trad = six(t, "BRINCO TRADICIONAL", SIX_SP, LO, HI)
    jun = six(t, "BRINCO JUNIOR SIEMPRE SALE", SIX_SP, LO, HI)
    i, j = t.find("REPARTO DE PREMIOS"), t.find("BRINCO JUNIOR SIEMPRE SALE")
    if i < 0 or j < 0:
        raise ValueError("B: no encontre reparto de premios")
    rows = re.findall(r"(\d) ACIERTOS (\d[\d.]*) ([\d.,]+)", t[i:j])
    if not rows:
        raise ValueError("B: premios tradicional vacios")
    prem_t = [{"aciertos": int(a), "ganadores": count(g), "premio": money(p)} for a, g, p in rows]
    k = t.find("EN CASO DE DISCREPANCIA", j)
    sec_j = t[j:k if k > 0 else len(t)]
    # Formato siempre sale: "1ER PREMIO 6 (CON 5 ACIERTOS) 5.457.092,31" -> 6 ganadores con 5 aciertos
    m = re.search(r"PREMIO (\d[\d.]*) \(CON (\d) ACIERTOS\) ([\d.,]+)", sec_j)
    if m:
        prem_j = [{"aciertos": int(m.group(2)), "ganadores": count(m.group(1)), "premio": money(m.group(3))}]
    else:
        rows = re.findall(r"(\d) ACIERTOS (\d[\d.]*) ([\d.,]+)", sec_j)
        if not rows:
            raise ValueError("B: premios junior vacios")
        prem_j = [{"aciertos": int(a), "ganadores": count(g), "premio": money(p)} for a, g, p in rows]
    mods = {"tradicional": {"numeros": trad, "premios": prem_t},
            "junior": {"numeros": jun, "premios": prem_j}}
    return {"sorteo": sorteo, "fecha": fecha, "modalidades": mods, "pozo_extra": None,
            "proximo": {"sorteo": sorteo + 1, "fecha": next_draw(fecha, DIAS), "pozo": None}}


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
