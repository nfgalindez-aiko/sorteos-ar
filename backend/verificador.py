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
    if not j.get("validado"):
        problema(f"{juego}: latest.json no esta validado (nunca deberia publicarse asi)")
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
        problema("poceada: latest.json no esta validado")
    try:
        fecha = date.fromisoformat(j["fecha"])
        esperado = ultimo_sorteo_esperado(ahora, (0, 1, 2, 3, 4, 5), "21:00")
        if esperado and fecha < esperado:
            problema(f"poceada: DESACTUALIZADO. Ultimo publicado {j['fecha']} (sorteo {j['sorteo']}); ya deberia estar el del {esperado}")
    except (KeyError, ValueError) as e:
        problema(f"poceada: fecha invalida: {e}")


def check_quiniela(base, prov, ahora):
    print(f"[quiniela/{prov}]")
    try:
        j = bajar(base, f"quiniela/{prov}/latest.json")
    except Exception as e:
        problema(f"quiniela/{prov}/latest.json no se puede leer: {e}")
        return
    dig = j.get("digitos", 4)
    for t in j.get("turnos", []):
        n = t.get("numeros")
        if t.get("conflicto"):
            aviso(f"quiniela/{prov} {j['fecha']} {t['turno']}: las fuentes no coinciden (sin numeros publicados)")
            continue
        if not n or len(n) != 20 or any(not re.fullmatch(r"\d{%d}" % dig, x) for x in n):
            problema(f"quiniela/{prov} {j['fecha']} {t['turno']}: extracto invalido {n}")
    # frescura: de lunes a sabado, cada turno cuya hora + tolerancia ya paso tiene que estar
    hoy = ahora.date()
    if hoy.weekday() == 6:
        return
    horas = {"vespertina": "15:00", "nocturna": "21:00"} if prov == "uruguay" else \
            {"previa": "10:15", "primera": "12:00", "matutina": "15:00", "vespertina": "18:00", "nocturna": "21:00"}
    if prov in ("provincia", "santafe", "cordoba", "mendoza", "entrerios", "ciudad") and hoy.weekday() == 5:
        horas.pop("vespertina", None)  # sabados sin vespertina en varias provincias
    vencidos = []
    for turno, hora in horas.items():
        h, m = map(int, hora.split(":"))
        if ahora >= datetime.combine(hoy, time(h, m)) + timedelta(minutes=TOLERANCIA_MIN):
            vencidos.append(turno)
    if not vencidos:
        return
    if j.get("fecha") != hoy.isoformat():
        problema(f"quiniela/{prov}: DESACTUALIZADO. Ultimo dia publicado {j.get('fecha')}, hoy {hoy} ya paso {vencidos}")
        return
    presentes = {t["turno"] for t in j["turnos"]}
    faltan = [t for t in vencidos if t not in presentes]
    if faltan:
        # la previa y algunos turnos no estan en todas las fuentes: aviso, no problema, salvo que falte todo
        (problema if len(faltan) == len(vencidos) else aviso)(f"quiniela/{prov} {hoy}: faltan turnos {faltan}")


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
    for prov in PROVINCIAS:
        check_quiniela(base, prov, ahora)
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
