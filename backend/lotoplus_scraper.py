#!/usr/bin/env python3
# Sorteos AR - scraper Loto Plus (Loteria de la Ciudad). Dos fuentes, cruce, mismo formato que Quini 6
# mas "numero_plus". Sortea miercoles y sabados 21:30.
# Uso: python lotoplus_scraper.py [--offline] [--no-publish]
import re, sys, os
from common import (fetch, save_fixture, read_fixture, log, log_robots, to_text, money, count,
                    six, SIX_A, SIX_SP, next_draw, build, publish, dump, write_json, FIX)

JUEGO = "lotoplus"
SRC_A = "https://www.tujugada.com.ar/loto.asp"
SRC_B = "https://www.quini-6-resultados.com.ar/loto/"
LO, HI = 0, 45
DIAS = (2, 5)  # miercoles y sabado
MODS = ("tradicional", "match", "desquite", "sale_o_sale")
LABELS = {"tradicional": "TRADICIONAL", "match": "MATCH", "desquite": "DESQUITE", "sale_o_sale": "SALE O SALE"}


def money_us(s):
    """'$3,867,231,609.72' -> 3867231609 (formato de la fuente B en Loto)."""
    return int(re.sub(r"[^\d]", "", s.split(".")[0]))


def premios_a(t, label):
    m = re.search(r"PREMIOS (?:SORTEO )?" + re.escape(label) + r" CANT GAN\. PREMIO \$((?: \d (?:VAC\.?|[\d.]+) \$ [\d.,]+)+)", t)
    if not m:
        raise ValueError(f"A: no encontre premios {label}")
    rows = re.findall(r"(\d) (VAC\.?|[\d.]+) \$ ([\d.,]+)", m.group(1))
    return [{"aciertos": int(a), "ganadores": count(g), "premio": money(p)} for a, g, p in rows]


def parse_a(h):
    t = to_text(h)
    m = re.search(r"LOTO PLUS NRO:\s*(\d+)\s*-\s*(\d{1,2})/(\d{1,2})/(\d{4})", t)
    if not m:
        raise ValueError("A: no encontre cabecera de sorteo")
    t = t[m.start():]
    sorteo = int(m.group(1))
    fecha = f"{int(m.group(4)):04d}-{int(m.group(3)):02d}-{int(m.group(2)):02d}"
    mods = {k: {"numeros": six(t, l, SIX_A, LO, HI), "premios": premios_a(t, l)} for k, l in LABELS.items()}
    m = re.search(r"N.MERO PLUS:\s*(\d)", t)
    plus = int(m.group(1)) if m else None
    m = re.search(r"PROXIMO POZO LOTO PLUS\s*\$\s*([\d.]+)", t)
    return {"sorteo": sorteo, "fecha": fecha, "modalidades": mods, "numero_plus": plus, "pozo_extra": None,
            "proximo": {"sorteo": sorteo + 1, "fecha": next_draw(fecha, DIAS), "pozo": money(m.group(1)) if m else None}}


def parse_b(h):
    t = to_text(h)
    m = re.search(r"SORTEO (\d+) (\d{2})-(\d{2})-(\d{4})", t)
    if not m:
        raise ValueError("B: no encontre cabecera de sorteo")
    t = t[m.start():]
    sorteo = int(m.group(1))
    fecha = f"{m.group(4)}-{m.group(3)}-{m.group(2)}"
    m = re.search(r"N.MERO PLUS (\d{2})", t)
    plus = int(m.group(1)) if m else None
    mods = {}
    for k, l in LABELS.items():
        nums = six(t, l, SIX_SP, LO, HI)
        ms = re.search(r"LOTO " + re.escape(l) + r" GANADORES Y REPARTO DE PREMIOS ACIERTOS GANADORES PREMIO((?: \d \d+ \$[\d,]+(?:\.\d+)?)+)", t)
        if not ms:
            raise ValueError(f"B: no encontre premios {l}")
        rows = re.findall(r"(\d) (\d+) \$([\d,]+(?:\.\d+)?)", ms.group(1))
        mods[k] = {"numeros": nums, "premios": [{"aciertos": int(a), "ganadores": int(g), "premio": money_us(p)} for a, g, p in rows]}
    return {"sorteo": sorteo, "fecha": fecha, "modalidades": mods, "numero_plus": plus, "pozo_extra": None,
            "proximo": {"sorteo": sorteo + 1, "fecha": next_draw(fecha, DIAS), "pozo": None}}


def scrape(offline=False):
    res = {}
    for name, url, parser in (("A", SRC_A, parse_a), ("B", SRC_B, parse_b)):
        fx = f"{JUEGO}_{name}.html"
        try:
            h = read_fixture(fx) if offline else fetch(url)
            if not offline:
                save_fixture(fx, h)
            res[name] = parser(h)
            log(f"{JUEGO} {name} OK sorteo {res[name]['sorteo']}")
        except Exception as e:
            res[name] = {"error": f"{type(e).__name__}: {e}"}
            log(f"{JUEGO} {name} ERROR {e}")
    return res


def main(argv):
    offline = "--offline" in argv
    if not offline:
        log_robots()
    res = scrape(offline)
    out, diffs = build(JUEGO, res)
    estado = "OK" if out["validado"] else "MISMATCH"
    report = {"fuentes": res, "diferencias": diffs, "estado": estado, "salida": out}
    print(dump(report))
    write_json(os.path.join(FIX, f"{JUEGO}_out.json"), report)
    log(f"{JUEGO} ESTADO {estado} diferencias={diffs}")
    if "--no-publish" not in argv and "sorteo" in out:
        publish(JUEGO, out)
    sys.exit(0 if estado == "OK" else 1)


if __name__ == "__main__":
    main(sys.argv[1:])
