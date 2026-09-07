#!/usr/bin/env python3
# Sorteos AR - corre los scrapers de todos los juegos en un solo proceso (lo usa el cron).
# Sale con 1 si algun juego no quedo validado, para que el job se vea en rojo; data/ se commitea igual.
import sys, os
from common import log, log_robots, build, publish, write_json, FIX
import quini6_scraper, brinco_scraper

JUEGOS = (quini6_scraper, brinco_scraper)


def main():
    log_robots()
    fallos = []
    for mod in JUEGOS:
        res = mod.scrape()
        out, diffs = build(mod.JUEGO, res)
        estado = "OK" if out["validado"] else "MISMATCH"
        write_json(os.path.join(FIX, f"{mod.JUEGO}_out.json"),
                   {"fuentes": res, "diferencias": diffs, "estado": estado, "salida": out})
        log(f"{mod.JUEGO} ESTADO {estado} diferencias={diffs}")
        if "sorteo" in out:
            publish(mod.JUEGO, out)
        if estado != "OK":
            fallos.append(f"{mod.JUEGO}:{diffs}")
    log(f"RUN_ALL fin fallos={fallos}")
    sys.exit(1 if fallos else 0)


if __name__ == "__main__":
    main()
