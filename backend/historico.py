#!/usr/bin/env python3
# Sorteos AR - baja los ultimos N sorteos de Quini 6 (fuente A, cruzados con B cuando se puede)
# y los guarda en data/quini6/NNNN.json. Pausa de 2 s entre pedidos.
# Uso: python historico.py [N=50] [--desde NNNN] [--solo-faltantes]
import sys, os, time
from common import fetch, save_fixture, log, build, write_json, read_json, rebuild_index, DATA
import quini6_scraper as q

PAUSA = 2.0


def ultimo_sorteo():
    latest = os.path.join(DATA, "quini6", "latest.json")
    if os.path.exists(latest):
        return read_json(latest)["sorteo"]
    h = fetch(q.SRC_A)
    return q.parse_a(h)["sorteo"]


def bajar(n, fecha_siguiente=None):
    res = {}
    try:
        h = fetch(q.SRC_A_HIST.format(n=n))
        save_fixture(f"hist_quini6_A_{n}.html", h)
        res["A"] = q.parse_a(h)
        if res["A"]["sorteo"] != n:
            raise ValueError(f"A devolvio sorteo {res['A']['sorteo']} en vez de {n}")
    except Exception as e:
        res["A"] = {"error": f"{type(e).__name__}: {e}"}
        log(f"HIST {n} A ERROR {e}")
    time.sleep(PAUSA)
    if "error" not in res["A"]:
        candidatas = [res["A"]["fecha"]]
    elif fecha_siguiente:
        # A solo sirve los ultimos 20 sorteos. Para los anteriores se calcula la fecha hacia atras
        # (miercoles/domingo) y se verifica contra el numero de sorteo que devuelve B.
        candidatas = fechas_anteriores(fecha_siguiente, 3)
    else:
        candidatas = []
    res["B"] = {"error": "sin fecha candidata para B"}
    for fecha in candidatas:
        y, m, d = fecha.split("-")
        try:
            h = fetch(q.SRC_B_HIST.format(n=n, d=d, m=m, y=y))
            save_fixture(f"hist_quini6_B_{n}.html", h)
            pb = q.parse_b(h)
            if pb["sorteo"] != n:
                raise ValueError(f"B devolvio sorteo {pb['sorteo']} en vez de {n}")
            res["B"] = pb
            break
        except Exception as e:
            res["B"] = {"error": f"{type(e).__name__}: {e}"}
            log(f"HIST {n} B ({fecha}) ERROR {e}")
        finally:
            time.sleep(PAUSA)
    return res


def fechas_anteriores(fecha_iso, cuantas):
    """Fechas de sorteo (mie/dom) estrictamente anteriores a fecha_iso, de la mas cercana a la mas lejana."""
    from datetime import date, timedelta
    d = date.fromisoformat(fecha_iso)
    out = []
    while len(out) < cuantas:
        d -= timedelta(days=1)
        if d.weekday() in q.DIAS:
            out.append(d.isoformat())
    return out


def main(argv):
    cant = int(argv[0]) if argv and argv[0].isdigit() else 50
    desde = int(argv[argv.index("--desde") + 1]) if "--desde" in argv else ultimo_sorteo()
    solo_faltantes = "--solo-faltantes" in argv
    d = os.path.join(DATA, "quini6")
    ok = fail = 0
    fecha_sig = None
    for n in range(desde, desde - cant, -1):
        path = os.path.join(d, f"{n}.json")
        sig = os.path.join(d, f"{n + 1}.json")
        if fecha_sig is None and os.path.exists(sig):
            fecha_sig = read_json(sig)["fecha"]
        if solo_faltantes and os.path.exists(path) and read_json(path).get("validado"):
            fecha_sig = read_json(path)["fecha"]
            continue
        res = bajar(n, fecha_sig)
        out, diffs = build("quini6", res)
        if "sorteo" not in out:
            fail += 1
            fecha_sig = None
            log(f"HIST {n} SIN DATOS")
            continue
        fecha_sig = out["fecha"]
        write_json(path, out)
        ok += 1
        log(f"HIST {n} {'OK' if out['validado'] else 'NO VALIDADO ' + str(diffs)} fuentes={out['fuentes']}")
    items = rebuild_index("quini6")
    log(f"HIST fin: escritos={ok} fallidos={fail} index={len(items)}")
    sys.exit(0 if fail == 0 else 1)


if __name__ == "__main__":
    main(sys.argv[1:])
