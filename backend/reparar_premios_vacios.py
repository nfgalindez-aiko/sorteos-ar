#!/usr/bin/env python3
# Sorteos AR - arreglo puntual, de una sola vez: saca de data/ las filas de premios que quedaron
# publicadas en 0 ganadores y $0.
#
# Por que existe (regla 56): la fuente B dejo de publicar las filas de 5 y 4 aciertos de Loto Plus.
# Los sorteos 3921 y 3922 se confirmaron en el momento en que NINGUNA de las dos fuentes habia
# cargado esas filas, asi que quedaron en cero, y despues la guarda de la regla 38 las congelo.
# La app renderiza "0 ganadores" como **Vacante**, o sea que esta diciendo "nadie gano" en premios
# que si se pagaron. Eso es peor que no mostrar la fila.
#
# Ninguna de las dos fuentes sirve sorteos viejos: las dos devuelven el ultimo sin importar el
# parametro `?sorteo=`. El dato no se puede recuperar, asi que la opcion honesta es sacar la fila
# y dejar anotado cuales faltan.
#
# NO es parte del cron. Se corre a mano y queda como registro de lo que se toco:
#   python reparar_premios_vacios.py --dry-run
#   python reparar_premios_vacios.py
import glob
import os
import sys

import common
from common import fila_vacia, read_json, write_json, log, rebuild_index


def reparar(juego, dry_run=False):
    tocados = []
    for path in sorted(glob.glob(os.path.join(common.DATA, juego, "[0-9]*.json"))):
        j = read_json(path)
        faltantes = []
        for mod, d in j.get("modalidades", {}).items():
            quedan = []
            for p in d.get("premios", []):
                if fila_vacia(p):
                    faltantes.append(f"modalidades.{mod}.premios.{p['aciertos']}")
                else:
                    quedan.append(p)
            d["premios"] = quedan
        if not faltantes:
            continue
        j["premios_faltantes"] = sorted(faltantes)
        j["nota"] = ("Las filas que faltan no se publicaron porque ninguna de las dos fuentes las "
                     "tenia cuando se cerro el sorteo, y despues ya no se pudieron recuperar. "
                     "Ante cualquier discrepancia vale el extracto oficial.")
        tocados.append((j["sorteo"], j["fecha"], len(faltantes), path))
        if not dry_run:
            write_json(path, j)
    if tocados and not dry_run:
        rebuild_index(juego)
        latest = os.path.join(common.DATA, juego, "latest.json")
        if os.path.exists(latest):
            ult = read_json(latest)
            arreglado = os.path.join(common.DATA, juego, f"{ult['sorteo']}.json")
            if os.path.exists(arreglado):
                write_json(latest, read_json(arreglado))
    return tocados


def main(argv):
    dry = "--dry-run" in argv
    total = 0
    for juego in ("quini6", "brinco", "lotoplus"):
        for sorteo, fecha, n, path in reparar(juego, dry):
            print(f"{'(simulacro) ' if dry else ''}{juego} {sorteo} ({fecha}): {n} fila(s) sacadas")
            total += 1
    if not total:
        print("no quedan filas en 0 ganadores y $0")
    elif not dry:
        log(f"REPARACION: {total} sorteo(s) con filas de premios en cero, sacadas (regla 56)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
