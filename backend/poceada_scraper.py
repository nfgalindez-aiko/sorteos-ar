#!/usr/bin/env python3
# Sorteos AR - scraper Quiniela Poceada (Loteria de la Ciudad). Una sola fuente HTML (A), pero el sorteo
# se resuelve con la nocturna de la Quiniela de la Ciudad: los 20 numeros de la Poceada son las dos
# ultimas cifras de los 20 numeros de esa nocturna. Se valida cruzando con data/quiniela/ciudad/<fecha>.json
# (que a su vez viene de dos fuentes). Sortea lunes a sabado 21:00.
# Uso: python poceada_scraper.py [--offline] [--no-publish]
import re, sys, os
import common
from common import (fetch, save_fixture, read_fixture, log, log_robots, to_text, money, count,
                    now_art, dump, write_json, read_json, rebuild_index, registrar_novedad, FIX)

JUEGO = "poceada"
SRC_A = "https://www.tujugada.com.ar/poceada.asp"
DIAS = (0, 1, 2, 3, 4, 5)  # lunes a sabado


def parse_a(h):
    t = to_text(h)
    m = re.search(r"QUINIELA POCEADA NRO:\s*(\d+)\s*-\s*(\d{1,2})/(\d{1,2})/(\d{4})", t)
    if not m:
        raise ValueError("A: no encontre cabecera de sorteo")
    t = t[m.start():]
    sorteo = int(m.group(1))
    fecha = f"{int(m.group(4)):04d}-{int(m.group(3)):02d}-{int(m.group(2)):02d}"
    m = re.search(r"NUMEROS GANADORES((?: \d{1,2}){20})\b", t)
    if not m:
        raise ValueError("A: no encontre los 20 numeros")
    nums = sorted(int(x) for x in m.group(1).split())
    if len(set(nums)) != 20 or any(n < 0 or n > 99 for n in nums):
        raise ValueError(f"A: numeros invalidos {nums}")
    ml = re.search(r"LETRAS: ([A-Z]{4})", t)
    mp = re.search(r"PREMIOS DEL SORTEO CANT GAN\. PREMIO \$((?: \d (?:VAC\.?|[\d.]+) \$ [\d.,]+)+)", t)
    if not mp:
        raise ValueError("A: no encontre premios")
    rows = re.findall(r"(\d) (VAC\.?|[\d.]+) \$ ([\d.,]+)", mp.group(1))
    premios = [{"aciertos": int(a), "ganadores": count(g), "premio": money(p)} for a, g, p in rows]
    mr = re.search(r"HUBIERON ([\d.]+) GANADORES CON 5 ACIERTOS", t)
    if mr:
        premios.append({"aciertos": 5, "ganadores": count(mr.group(1)), "premio": 0, "nota": "recuperan la apuesta"})
    mz = re.search(r"PROXIMO POZO POCEADA\s*\$\s*([\d.]+)", t)
    return {"sorteo": sorteo, "fecha": fecha, "numeros": [f"{n:02d}" for n in nums],
            "letras": ml.group(1) if ml else None, "premios": premios,
            "proximo": {"sorteo": sorteo + 1, "fecha": common.next_draw(fecha, DIAS),
                        "pozo": money(mz.group(1)) if mz else None}}


def nocturna_ciudad(fecha):
    """Devuelve (numeros_poceada_derivados, validada_por_2_fuentes) o (None, False)."""
    p = os.path.join(common.DATA, "quiniela", "ciudad", f"{fecha}.json")
    if not os.path.exists(p):
        return None, False
    for t in read_json(p)["turnos"]:
        if t["turno"] == "nocturna" and t.get("numeros"):
            # Si dos numeros de la nocturna terminan igual, el extracto oficial agrega un numero extra
            # (visto el 05/09/2026: dos "..52" y aparece el 62). Por eso se devuelve el conjunto de
            # terminaciones distintas, que tiene que estar CONTENIDO en la Poceada.
            return sorted({n[-2:] for n in t["numeros"]}), t["validado"]
    return None, False


def cruzar(a):
    """Compara la Poceada de A con las terminaciones de la nocturna de Ciudad."""
    derivados, noct_validada = nocturna_ciudad(a["fecha"])
    if derivados is None:
        return a, ["sin nocturna de Ciudad para cruzar"], ["A"]
    faltan = [n for n in derivados if n not in a["numeros"]]
    if faltan or (len(derivados) == 20 and derivados != a["numeros"]):
        log(f"{JUEGO} {a['sorteo']} MISMATCH A={a['numeros']} nocturna={derivados} faltan={faltan}")
        return a, ["numeros vs nocturna de Ciudad"], ["A", "ciudad-nocturna"]
    if not noct_validada:
        # la nocturna vino de una sola fuente: el cruce confirma consistencia pero no independencia
        return a, ["nocturna de Ciudad con una sola fuente"], ["A", "ciudad-nocturna"]
    return a, [], ["A", "ciudad-nocturna(A+B)"]


def scrape(offline=False):
    fx = f"{JUEGO}_A.html"
    h = read_fixture(fx) if offline else fetch(SRC_A)
    if not offline:
        save_fixture(fx, h)
    return parse_a(h)


def correr(offline=False, publicar=True):
    try:
        a = scrape(offline)
        log(f"{JUEGO} A OK sorteo {a['sorteo']}")
    except Exception as e:
        log(f"{JUEGO} A ERROR {e}")
        return None, [f"A: {e}"]
    a, diffs, fuentes = cruzar(a)
    out = {"juego": JUEGO}
    out.update(a)
    out["validado"] = not diffs
    out["fuentes"] = fuentes
    out["generado"] = now_art()
    log(f"{JUEGO} ESTADO {'OK' if out['validado'] else 'NO VALIDADO'} {diffs} fuentes={fuentes}")
    if publicar:
        common.publish(JUEGO, out)
    return out, diffs


def main(argv):
    offline = "--offline" in argv
    if not offline:
        log_robots()
    out, diffs = correr(offline, "--no-publish" not in argv)
    print(dump({"salida": out, "diferencias": diffs}))
    sys.exit(0 if out and out["validado"] else 1)


if __name__ == "__main__":
    main(sys.argv[1:])
