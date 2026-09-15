#!/usr/bin/env python3
# Sorteos AR - verificador externo. Corre aparte del scraper (otro workflow), lee los JSON
# PUBLICOS tal como los lee la app, y falla si algo esta roto o desactualizado.
# No escribe nada en data/: su unica salida es el reporte (exit 1 = hay problemas).
# Uso: python verificador.py [--base URL] [--ahora 2026-09-09T22:30]
import sys, json, re, urllib.request
from datetime import datetime, timedelta, date, time

BASE = "https://nfgalindez-aiko.github.io/sorteos-ar/data/"
ART = timedelta(hours=-3)
TOLERANCIA_MIN = 75  # minutos despues de la hora del sorteo para exigir el resultado
PROVINCIAS = ["ciudad", "provincia", "santafe", "cordoba", "uruguay", "mendoza", "entrerios"]
PROBLEMAS = []
AVISOS = []


def problema(msg):
    PROBLEMAS.append(msg)
    print("  PROBLEMA:", msg)


def aviso(msg):
    AVISOS.append(msg)
    print("  aviso:", msg)


def bajar(base, path):
    req = urllib.request.Request(base + path, headers={"User-Agent": "SorteosAR-verificador/0.1", "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def ultimo_sorteo_esperado(ahora, dias, hora):
    """Fecha del ultimo sorteo cuyo resultado ya deberia estar publicado (hora + tolerancia)."""
    d = ahora.date()
    for _ in range(8):
        if d.weekday() in dias:
            h, m = map(int, hora.split(":"))
            limite = datetime.combine(d, time(h, m)) + timedelta(minutes=TOLERANCIA_MIN)
            if ahora >= limite:
                return d
        d -= timedelta(days=1)
    return None


def check_poceado(base, juego, dias, hora, rango, mods, ahora):
    print(f"[{juego}]")
    try:
        j = bajar(base, f"{juego}/latest.json")
    except Exception as e:
        problema(f"{juego}/latest.json no se puede leer: {e}")
        return
    for k in ("sorteo", "fecha", "modalidades", "proximo", "validado", "fuentes", "generado"):
        if k not in j:
            problema(f"{juego}: falta '{k}' en latest.json")
    # Un sorteo recien publicado puede tener una sola fuente mientras la otra se pone al dia
    # (regla 37): eso es un aviso. Si sigue sin confirmarse despues de 2 dias, si es un problema.
    if not j.get("validado"):
        try:
            antiguedad = (ahora.date() - date.fromisoformat(j["fecha"])).days
        except (KeyError, ValueError):
            antiguedad = 99
        (problema if antiguedad > 2 else aviso)(
            f"{juego}: el sorteo {j.get('sorteo')} sigue con una sola fuente"
            + (f" despues de {antiguedad} dias" if antiguedad > 2 else " (la otra todavia no lo publico)"))
    if j.get("pozos_en_disputa"):
        # regla 43: nadie gano esa fila, las fuentes dan distinta cifra del pozo vacante.
        # Se avisa para que quede a la vista, pero no invalida el sorteo.
        aviso(f"{juego}: el sorteo {j.get('sorteo')} tiene pozos vacantes con cifras distintas "
              f"entre las fuentes: {j['pozos_en_disputa']}")
    for m in mods:
        mod = j.get("modalidades", {}).get(m)
        if not mod:
            problema(f"{juego}: falta modalidad {m}")
            continue
        n = mod.get("numeros", [])
        if len(n) != 6 or len(set(n)) != 6 or any(x < rango[0] or x > rango[1] for x in n):
            problema(f"{juego}: numeros invalidos en {m}: {n}")
        if n != sorted(n):
            problema(f"{juego}: numeros sin ordenar en {m}")
        if not mod.get("premios"):
            problema(f"{juego}: sin tabla de premios en {m}")
    try:
        fecha = date.fromisoformat(j["fecha"])
        if fecha.weekday() not in dias:
            problema(f"{juego}: la fecha {j['fecha']} no cae en dia de sorteo")
        esperado = ultimo_sorteo_esperado(ahora, dias, hora)
        if esperado and fecha < esperado:
            problema(f"{juego}: DESACTUALIZADO. Ultimo publicado {j['fecha']} (sorteo {j['sorteo']}); "
                     f"ya deberia estar el del {esperado}")
        prox = j.get("proximo") or {}
        if prox.get("sorteo") != j["sorteo"] + 1:
            aviso(f"{juego}: proximo.sorteo={prox.get('sorteo')} y sorteo={j['sorteo']}")
        if prox.get("fecha") and date.fromisoformat(prox["fecha"]) <= fecha:
            problema(f"{juego}: proximo.fecha {prox['fecha']} no es posterior a {j['fecha']}")
    except (KeyError, ValueError) as e:
        problema(f"{juego}: fecha invalida: {e}")
    try:
        idx = bajar(base, f"{juego}/index.json")["sorteos"]
        if not idx or idx[0]["sorteo"] < j["sorteo"]:
            problema(f"{juego}: index.json atrasado respecto de latest ({idx[0]['sorteo'] if idx else None} < {j['sorteo']})")
        nums = [s["sorteo"] for s in idx]
        if nums != sorted(nums, reverse=True):
            problema(f"{juego}: index.json no esta ordenado")
    except Exception as e:
        problema(f"{juego}/index.json: {e}")


def check_poceada_ciudad(base, ahora):
    print("[poceada]")
    try:
        j = bajar(base, "poceada/latest.json")
    except Exception as e:
        # latest.json solo existe cuando hubo un sorteo validado (cruce con la nocturna de Ciudad de 2 fuentes)
        try:
            bajar(base, "poceada/index.json")
            aviso(f"poceada: todavia sin sorteo validado publicado ({e})")
        except Exception:
            problema(f"poceada/latest.json no se puede leer: {e}")
        return
    n = j.get("numeros", [])
    if len(n) != 20 or len(set(n)) != 20 or any(not re.fullmatch(r"\d{2}", x) for x in n) or n != sorted(n):
        problema(f"poceada: numeros invalidos {n}")
    if not j.get("validado"):
        try:
            antiguedad = (ahora.date() - date.fromisoformat(j["fecha"])).days
        except (KeyError, ValueError):
            antiguedad = 99
        (problema if antiguedad > 2 else aviso)(
            f"poceada: el sorteo {j.get('sorteo')} sigue con una sola fuente"
            + (f" despues de {antiguedad} dias" if antiguedad > 2 else ""))
    try:
        fecha = date.fromisoformat(j["fecha"])
        esperado = ultimo_sorteo_esperado(ahora, (0, 1, 2, 3, 4, 5), "21:00")
        if esperado and fecha < esperado:
            problema(f"poceada: DESACTUALIZADO. Ultimo publicado {j['fecha']} (sorteo {j['sorteo']}); ya deberia estar el del {esperado}")
    except (KeyError, ValueError) as e:
        problema(f"poceada: fecha invalida: {e}")


def horarios(prov, dia):
    """Turnos que ESE dia tienen sorteo, con su hora. Domingo no hay quiniela."""
    if dia.weekday() == 6:
        return {}
    if prov == "uruguay":
        # Montevideo los sabados sortea SOLO la nocturna (verificado en los datos publicados
        # del 05/09 y del 12/09/2026). Exigirle la vespertina hacia fallar el verificador
        # todos los sabados entre las 16:15 y las 22:15.
        return {"nocturna": "21:00"} if dia.weekday() == 5 else {"vespertina": "15:00", "nocturna": "21:00"}
    # Las provincias argentinas SI tienen los cinco turnos el sabado (verificado el 12/09/2026).
    return {"previa": "10:15", "primera": "12:00", "matutina": "15:00",
            "vespertina": "18:00", "nocturna": "21:00"}


def vencidos_de(prov, ahora):
    """Turnos de hoy cuya hora + tolerancia ya paso: el resultado ya deberia estar publicado."""
    hoy = ahora.date()
    out = []
    for turno, hora in horarios(prov, hoy).items():
        h, m = map(int, hora.split(":"))
        if ahora >= datetime.combine(hoy, time(h, m)) + timedelta(minutes=TOLERANCIA_MIN):
            out.append(turno)
    return out


def dias_de_sorteo_entre(desde, hasta):
    """Dias de sorteo (lunes a sabado) posteriores a `desde` y hasta `hasta` inclusive."""
    n, d = 0, desde + timedelta(days=1)
    while d <= hasta:
        if d.weekday() != 6:
            n += 1
        d += timedelta(days=1)
    return n


def check_extractos(prov, j):
    dig = j.get("digitos", 4)
    for t in j.get("turnos", []):
        n = t.get("numeros")
        if t.get("conflicto"):
            aviso(f"quiniela/{prov} {j['fecha']} {t['turno']}: las fuentes no coinciden (sin numeros publicados)")
            continue
        if not n or len(n) != 20 or any(not re.fullmatch(r"\d{%d}" % dig, x) for x in n):
            problema(f"quiniela/{prov} {j['fecha']} {t['turno']}: extracto invalido {n}")


def check_frescura(prov, j, ahora, alguna_publico_hoy):
    """Cada turno de hoy cuya hora ya paso tiene que estar publicado.

    Un feriado nacional (la quiniela no sortea) se ve igual que una fuente caida: no hay datos
    de hoy. Se distinguen mirando al resto: si NINGUNA quiniela publico hoy es feriado o la
    fuente esta caida, y eso es un aviso, no siete problemas. Pasa a problema si el atraso
    supera los 2 dias de sorteo, que ya no lo explica ningun feriado.
    """
    hoy = ahora.date()
    vencidos = vencidos_de(prov, ahora)
    if not vencidos:
        return
    if j.get("fecha") != hoy.isoformat():
        if alguna_publico_hoy:
            problema(f"quiniela/{prov}: DESACTUALIZADO. Ultimo dia publicado {j.get('fecha')}, "
                     f"hoy {hoy} ya paso {vencidos} y las demas quinielas si publicaron")
            return
        try:
            atraso = dias_de_sorteo_entre(date.fromisoformat(j["fecha"]), hoy)
        except (KeyError, ValueError):
            atraso = 99
        (aviso if atraso <= 2 else problema)(
            f"quiniela/{prov}: sin datos del {hoy} (ultimo dia {j.get('fecha')}, {atraso} dia(s) de sorteo sin publicar)"
            + ("; ninguna quiniela publico hoy: feriado o fuente caida" if atraso <= 2 else "; DESACTUALIZADO"))
        return
    presentes = {t["turno"] for t in j["turnos"]}
    faltan = [t for t in vencidos if t not in presentes]
    if faltan:
        # la previa y algunos turnos no estan en todas las fuentes: aviso, no problema, salvo que falte todo
        (problema if len(faltan) == len(vencidos) else aviso)(f"quiniela/{prov} {hoy}: faltan turnos {faltan}")


def check_quinielas(base, provincias, ahora):
    datos = {}
    for prov in provincias:
        print(f"[quiniela/{prov}]")
        try:
            datos[prov] = bajar(base, f"quiniela/{prov}/latest.json")
        except Exception as e:
            problema(f"quiniela/{prov}/latest.json no se puede leer: {e}")
            continue
        check_extractos(prov, datos[prov])
    hoy = ahora.date().isoformat()
    alguna_publico_hoy = any(j.get("fecha") == hoy for j in datos.values())
    for prov, j in datos.items():
        check_frescura(prov, j, ahora, alguna_publico_hoy)


def check_turf(base, hipodromo, ahora):
    """El turf tiene UNA fuente y es la oficial: no hay cruce que verificar, solo que el JSON
    publicado este sano y que el indice acompane. La frescura no se chequea porque las reuniones
    no tienen un calendario fijo: hay semanas con una y semanas con tres."""
    print(f"[turf/{hipodromo}]")
    try:
        j = bajar(base, f"turf/{hipodromo}/latest.json")
    except Exception as e:
        # todavia puede no existir si no hubo ninguna reunion desde que se agrego el scraper
        try:
            bajar(base, f"turf/{hipodromo}/index.json")
            aviso(f"turf/{hipodromo}: sin reuniones publicadas todavia ({e})")
        except Exception:
            problema(f"turf/{hipodromo}/latest.json no se puede leer: {e}")
        return
    for k in ("reunion", "fecha", "carreras", "validado", "fuentes", "generado"):
        if k not in j:
            problema(f"turf/{hipodromo}: falta '{k}' en latest.json")
            return
    if j["fuentes"] != ["oficial"]:
        problema(f"turf/{hipodromo}: fuentes={j['fuentes']}, deberia ser ['oficial']")
    if not j["carreras"]:
        problema(f"turf/{hipodromo}: la reunion {j['reunion']} no tiene carreras")
    for c in j["carreras"]:
        if not c.get("posiciones"):
            problema(f"turf/{hipodromo} reunion {j['reunion']}: carrera {c.get('numero')} sin posiciones")
            continue
        puestos = [p["puesto"] for p in c["posiciones"]]
        if puestos != ["GAN", "SEG", "TER"][:len(puestos)]:
            problema(f"turf/{hipodromo} reunion {j['reunion']}: carrera {c['numero']} con puestos {puestos}")
        for p in c["posiciones"]:
            if not p.get("competidor") or not p.get("dividendos"):
                problema(f"turf/{hipodromo} reunion {j['reunion']}: carrera {c['numero']} "
                         f"puesto {p.get('puesto')} incompleto")
    try:
        date.fromisoformat(j["fecha"])
    except (KeyError, ValueError) as e:
        problema(f"turf/{hipodromo}: fecha invalida: {e}")
    try:
        idx = bajar(base, f"turf/{hipodromo}/index.json")["fechas"]
        if not idx or idx[0]["fecha"] < j["fecha"]:
            problema(f"turf/{hipodromo}: index.json atrasado respecto de latest")
        fechas = [f["fecha"] for f in idx]
        if fechas != sorted(fechas, reverse=True):
            problema(f"turf/{hipodromo}: index.json no esta ordenado")
    except Exception as e:
        problema(f"turf/{hipodromo}/index.json: {e}")


def main(argv):
    base = argv[argv.index("--base") + 1] if "--base" in argv else BASE
    if "--ahora" in argv:
        ahora = datetime.fromisoformat(argv[argv.index("--ahora") + 1])
    else:
        ahora = datetime.utcnow() + ART
    print(f"Verificador Sorteos AR · base {base} · ahora (ART) {ahora:%Y-%m-%d %H:%M}")
    check_poceado(base, "quini6", (2, 6), "21:15", (0, 45), ["tradicional", "segunda", "revancha", "siempre_sale"], ahora)
    check_poceado(base, "brinco", (6,), "21:00", (0, 39), ["tradicional", "junior"], ahora)
    check_poceado(base, "lotoplus", (2, 5), "21:30", (0, 45), ["tradicional", "match", "desquite", "sale_o_sale"], ahora)
    check_poceada_ciudad(base, ahora)
    check_quinielas(base, PROVINCIAS, ahora)
    check_turf(base, "sanisidro", ahora)
    print("[novedades]")
    try:
        nov = bajar(base, "novedades.json")["novedades"]
        print(f"  {len(nov)} novedades, ultima: {nov[0] if nov else None}")
    except Exception as e:
        problema(f"novedades.json: {e}")
    print()
    print(f"RESULTADO: {len(PROBLEMAS)} problemas, {len(AVISOS)} avisos")
    for p in PROBLEMAS:
        print(" -", p)
    sys.exit(1 if PROBLEMAS else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
