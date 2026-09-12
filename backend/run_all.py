#!/usr/bin/env python3
# Sorteos AR - corre los scrapers de todos los juegos en un solo proceso (lo usa el cron).
# Sale con 1 si algun juego no quedo validado, para que el job se vea en rojo; data/ se commitea igual.
import sys, os
from common import log, log_robots, build, publish, write_json, FIX
import quini6_scraper, brinco_scraper, lotoplus_scraper, quiniela_scraper, poceada_scraper

JUEGOS = (quini6_scraper, brinco_scraper, lotoplus_scraper)


def main():
    log_robots()
    fallos = []
    for mod in JUEGOS:
        res = mod.scrape()
        out, diffs = build(mod.JUEGO, res)
        estado = "OK" if out["validado"] else ("CONFLICTO" if diffs else "1 fuente")
        write_json(os.path.join(FIX, f"{mod.JUEGO}_out.json"),
                   {"fuentes": res, "diferencias": diffs, "estado": estado, "salida": out})
        log(f"{mod.JUEGO} ESTADO {estado} conflictos={diffs}")
        if "sorteo" in out:
            publish(mod.JUEGO, out)
        # Solo es fallo un conflicto real entre fuentes o quedarse sin datos. Que una fuente vaya
        # atrasada (desfasaje) o este caida es normal: se publica con 1 fuente y el job sigue verde.
        if diffs:
            fallos.append(f"{mod.JUEGO}:{diffs}")
        elif "sorteo" not in out:
            fallos.append(f"{mod.JUEGO}:sin datos")
    try:
        fallos_q = quiniela_scraper.correr()
        fallos += [f"quiniela:{p}" for p in fallos_q]
    except Exception as e:
        log(f"quiniela ERROR general {e}")
        fallos.append(f"quiniela:{e}")
    try:
        out, diffs = poceada_scraper.correr()  # despues de quinielas: cruza con la nocturna de Ciudad
        if out is None:
            fallos.append("poceada:sin datos")
    except Exception as e:
        log(f"poceada ERROR general {e}")
        fallos.append(f"poceada:{e}")
    log(f"RUN_ALL fin fallos={fallos}")
    sys.exit(1 if fallos else 0)


if __name__ == "__main__":
    main()
