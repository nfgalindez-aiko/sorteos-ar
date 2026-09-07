#!/usr/bin/env python3
# Sorteos AR - scraper de quinielas. Solo stdlib. Dos fuentes por provincia cuando existen.
# Uso: python quiniela_scraper.py [--offline] [--no-publish] [--solo ciudad,provincia]
#
# Publica data/quiniela/<prov>/<YYYY-MM-DD>.json, latest.json e index.json. La validacion es POR TURNO:
# un turno queda validado:true solo si las dos fuentes dan los mismos 20 numeros. Los turnos con una
# sola fuente se publican con validado:false (la app los muestra como "pendiente de confirmacion").
import re, sys, os, glob
from datetime import date
import common
from common import (fetch, save_fixture, read_fixture, log, log_robots, to_text, now_art, dump,
                    write_json, read_json, FIX)

JUEGO = "quiniela"
A_BASE = "https://www.tujugada.com.ar/"
B_BASE = "https://www.quini-6-resultados.com.ar/"
M_URL = "https://quinielamontevideo.com/"

TURNOS = ["previa", "primera", "matutina", "vespertina", "nocturna"]
HORAS = {"previa": "10:15", "primera": "12:00", "matutina": "15:00", "vespertina": "18:00", "nocturna": "21:00"}

PROVINCIAS = {
    "ciudad": {"nombre": "Ciudad de Buenos Aires", "digitos": 4, "A": "quiniela-nacional.asp", "B": "quinielas/nacional/"},
    "provincia": {"nombre": "Provincia de Buenos Aires", "digitos": 4, "A": "quiniela_provincia_buenos_aires.asp", "B": "quinielas/provincia-buenos-aires-hoy.aspx"},
    "santafe": {"nombre": "Santa Fe", "digitos": 4, "A": "quiniela_santa_fe.asp", "B": "quinielas/provincia-santa-fe-hoy.aspx"},
    "cordoba": {"nombre": "Córdoba", "digitos": 4, "A": "quiniela_cordoba.asp", "B": "quinielas/provincia-cordoba-hoy.aspx"},
    "uruguay": {"nombre": "Montevideo (Uruguay)", "digitos": 3, "A": "quiniela_uruguay.asp", "M": M_URL,
                "horas": {"vespertina": "15:00", "nocturna": "21:00"}},
    "mendoza": {"nombre": "Mendoza", "digitos": 4, "A": "quiniela_mendoza.asp"},
    "entrerios": {"nombre": "Entre Ríos", "digitos": 4, "A": "quiniela_entre_rios.asp"},
}
ORDEN = ["ciudad", "provincia", "santafe", "cordoba", "uruguay", "mendoza", "entrerios"]

MESES = {"ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4, "MAYO": 5, "JUNIO": 6, "JULIO": 7,
         "AGOSTO": 8, "SEPTIEMBRE": 9, "SETIEMBRE": 9, "OCTUBRE": 10, "NOVIEMBRE": 11, "DICIEMBRE": 12}
DIAS = r"(?:LUNES|MARTES|MI[ÉE]RCOLES|JUEVES|VIERNES|S[ÁA]BADO|DOMINGO)"
RUIDO_A = re.compile(r"---MENSAJE PARA EL VISITANTE DE ESTE SITIO---.*?WWW\.TUJUGADA\.COM\.AR!!!", re.S)


def norm_turno(s):
    s = s.upper().strip()
    s = re.sub(r"^(LA|EL)\s+", "", s)
    s = s.replace("PRIMERO", "PRIMERA").replace("VESPERTINO", "VESPERTINA").replace("NOCTURNO", "NOCTURNA")
    s = s.replace("MATUTINO", "MATUTINA")
    return s.lower()


def veinte(seg, digitos):
    """Toma pares 'ubicacion numero' y devuelve la lista de 20 numeros (strings, ceros a la izquierda)."""
    pares = re.findall(r"\b(\d{1,2}) (\d{%d})\b" % digitos, seg)
    pos = {}
    for u, n in pares:
        u = int(u)
        if 1 <= u <= 20 and u not in pos:
            pos[u] = n
        if len(pos) == 20:
            break
    if len(pos) != 20:
        raise ValueError(f"extracto incompleto ({len(pos)}/20)")
    return [pos[i] for i in range(1, 21)]


def parse_a(h, digitos):
    """tujugada: bloques 'LUNES 7/9/2026 - MATUTINA 15:00 HS. 69 - LOS VICIOS UBIC NUMERO ... 1 8669 11 8963 ... LETRAS: FNNS'.
    Devuelve {fecha_iso: {turno: {...}}} con todos los dias que trae la pagina."""
    t = RUIDO_A.sub(" ", to_text(h))
    t = re.sub(r"\s+", " ", t)
    pat = re.compile(DIAS + r" (\d{1,2})/(\d{1,2})/(\d{4}) - ([A-ZÁÉÍÓÚ. ]+?) (\d{1,2}:\d{2}) HS\.(.*?)(?=" + DIAS + r" \d{1,2}/\d{1,2}/\d{4} - |QUINIELAS DEL |EN CASO DE DISCREPANCIA|$)")
    out = {}
    for d, m, y, turno, hora, cuerpo in pat.findall(t):
        turno = norm_turno(turno)
        if turno not in TURNOS or "UBIC NUMERO" not in cuerpo:
            continue
        fecha = f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
        seg = cuerpo.split("UBIC NUMERO UBIC NUMERO", 1)[1]
        try:
            nums = veinte(seg, digitos)
        except ValueError as e:
            log(f"quiniela A {fecha} {turno}: {e}")
            continue
        ml = re.search(r"LETRAS: ([A-Z]{4})", seg)
        out.setdefault(fecha, {})[turno] = {"hora": hora, "numeros": nums, "letras": ml.group(1) if ml else None}
    if not out:
        raise ValueError("A: no encontre ningun extracto")
    return out


def parse_b(h, digitos):
    """quini-6-resultados: 'LA PRIMERA - FECHA: LUNES, 7 DE SEPTIEMBRE DE 2026 1 2187 11 0906 ... CLAVE LETRAS U J R Z'."""
    t = to_text(h)
    pat = re.compile(r"\b((?:LA |EL )?[A-ZÁÉÍÓÚ]+) - FECHA: " + DIAS + r", (\d{1,2}) DE ([A-ZÁÉÍÓÚ]+) DE (\d{4})(.*?)(?=\b(?:LA |EL )?[A-ZÁÉÍÓÚ]+ - FECHA: |\b[A-ZÁÉÍÓÚ]+ NO HAY EXTRACTO|EN CASO DE DISCREPANCIA|$)")
    out = {}
    for turno, d, mes, y, cuerpo in pat.findall(t):
        turno = norm_turno(turno.split()[-1])
        if turno not in TURNOS or mes not in MESES:
            continue
        fecha = f"{int(y):04d}-{MESES[mes]:02d}-{int(d):02d}"
        try:
            nums = veinte(cuerpo, digitos)
        except ValueError as e:
            log(f"quiniela B {fecha} {turno}: {e}")
            continue
        ml = re.search(r"CLAVE LETRAS ((?:[A-Z] ){3}[A-Z])", cuerpo)
        out.setdefault(fecha, {})[turno] = {"hora": None, "numeros": nums, "letras": ml.group(1).replace(" ", "") if ml else None}
    if not out:
        raise ValueError("B: no encontre ningun extracto")
    return out


def parse_m(h, digitos):
    """quinielamontevideo.com: 'SORTEO VESPERTINO, 07/09/2026 01 765 11 542 ...' (solo la seccion QUINIELA, no la TOMBOLA)."""
    t = to_text(h)
    i = t.find("SORTEOS AL MINUTO DE LA T")
    if i > 0:
        t = t[:i]
    pat = re.compile(r"SORTEO (VESPERTINO|NOCTURNO), (\d{2})/(\d{2})/(\d{4})(.*?)(?=SORTEO (?:VESPERTINO|NOCTURNO), |$)")
    out = {}
    for turno, d, m, y, cuerpo in pat.findall(t):
        turno = norm_turno(turno)
        fecha = f"{y}-{m}-{d}"
        try:
            nums = veinte(cuerpo, digitos)
        except ValueError as e:
            log(f"quiniela M {fecha} {turno}: {e}")
            continue
        out.setdefault(fecha, {})[turno] = {"hora": None, "numeros": nums, "letras": None}
    if not out:
        raise ValueError("M: no encontre ningun extracto")
    return out


FUENTES = {"A": (lambda cfg: A_BASE + cfg["A"], parse_a),
           "B": (lambda cfg: B_BASE + cfg["B"], parse_b),
           "M": (lambda cfg: cfg["M"], parse_m)}


def scrape_prov(prov, offline=False):
    cfg = PROVINCIAS[prov]
    res = {}
    for name, (url_fn, parser) in FUENTES.items():
        if name not in cfg:
            continue
        fx = f"quiniela_{prov}_{name}.html"
        try:
            h = read_fixture(fx) if offline else fetch(url_fn(cfg))
            if not offline:
                save_fixture(fx, h)
            res[name] = parser(h, cfg["digitos"])
            log(f"quiniela {prov} {name} OK fechas={sorted(res[name])[-2:]}")
        except Exception as e:
            res[name] = {"error": f"{type(e).__name__}: {e}"}
            log(f"quiniela {prov} {name} ERROR {e}")
    return res


def combinar(prov, res):
    """Une las fuentes por fecha y turno. Devuelve {fecha: salida_publicable}."""
    cfg = PROVINCIAS[prov]
    horas = cfg.get("horas", HORAS)
    fechas = set()
    for r in res.values():
        if "error" not in r:
            fechas |= set(r)
    out = {}
    for fecha in fechas:
        turnos = []
        for turno in TURNOS:
            datos = {n: r[fecha][turno] for n, r in res.items() if "error" not in r and turno in r.get(fecha, {})}
            if not datos:
                continue
            listas = [d["numeros"] for d in datos.values()]
            coinciden = all(l == listas[0] for l in listas)
            validado = len(datos) >= 2 and coinciden
            if len(datos) >= 2 and not coinciden:
                log(f"quiniela {prov} {fecha} {turno} MISMATCH " + " vs ".join(f"{n}:{d['numeros'][:3]}..." for n, d in datos.items()))
            base = datos.get("A") or next(iter(datos.values()))
            if not coinciden:
                # ante discrepancia no se publican numeros: se deja el turno marcado
                turnos.append({"turno": turno, "hora": base["hora"] or horas.get(turno), "numeros": None,
                               "letras": None, "validado": False, "fuentes": sorted(datos), "conflicto": True})
                continue
            letras = next((d["letras"] for d in datos.values() if d["letras"]), None)
            turnos.append({"turno": turno, "hora": base["hora"] or horas.get(turno), "numeros": listas[0],
                           "letras": letras, "validado": validado, "fuentes": sorted(datos)})
        if not turnos:
            continue
        out[fecha] = {"juego": JUEGO, "provincia": prov, "nombre": cfg["nombre"], "digitos": cfg["digitos"],
                      "fecha": fecha, "turnos": turnos,
                      "validado": all(t["validado"] for t in turnos),
                      "fuentes": sorted({f for t in turnos for f in t["fuentes"]}),
                      "generado": now_art()}
    return out


def publicar_prov(prov, por_fecha):
    d = os.path.join(common.DATA, JUEGO, prov)
    cambios = 0
    for fecha, out in por_fecha.items():
        path = os.path.join(d, f"{fecha}.json")
        if os.path.exists(path):
            prev = read_json(path)
            # nunca pisar un turno validado con uno no validado, ni borrar turnos ya publicados
            prev_t = {t["turno"]: t for t in prev.get("turnos", [])}
            nuevos = []
            for t in out["turnos"]:
                p = prev_t.get(t["turno"])
                nuevos.append(p if p and p["validado"] and not t["validado"] else t)
            for k, p in prev_t.items():
                if k not in {t["turno"] for t in nuevos}:
                    nuevos.append(p)
            nuevos.sort(key=lambda t: TURNOS.index(t["turno"]))
            out = dict(out, turnos=nuevos, validado=all(t["validado"] for t in nuevos),
                       fuentes=sorted({f for t in nuevos for f in t["fuentes"]}))
        if write_json(path, out):
            cambios += 1
    archivos = sorted(glob.glob(os.path.join(d, "[0-9]*.json")))
    if archivos:
        ultimo = read_json(archivos[-1])
        write_json(os.path.join(d, "latest.json"), ultimo)
        idx = []
        for p in archivos[-60:]:
            j = read_json(p)
            idx.append({"fecha": j["fecha"], "turnos": len(j["turnos"]), "validado": j["validado"]})
        idx.sort(key=lambda x: x["fecha"], reverse=True)
        write_json(os.path.join(d, "index.json"), {"juego": JUEGO, "provincia": prov, "fechas": idx, "generado": now_art()})
    return cambios


def publicar_resumen():
    """data/quiniela/latest.json: una entrada por provincia con el ultimo dia (para la portada de la app)."""
    provs = []
    for prov in ORDEN:
        p = os.path.join(common.DATA, JUEGO, prov, "latest.json")
        if os.path.exists(p):
            j = read_json(p)
            provs.append({"provincia": prov, "nombre": j["nombre"], "digitos": j["digitos"], "fecha": j["fecha"],
                          "turnos": [{"turno": t["turno"], "hora": t["hora"], "cabeza": t["numeros"][0] if t["numeros"] else None,
                                      "validado": t["validado"]} for t in j["turnos"]]})
    write_json(os.path.join(common.DATA, JUEGO, "latest.json"), {"juego": JUEGO, "provincias": provs, "generado": now_art()})


def correr(provs=None, offline=False, publish=True):
    fallos = []
    for prov in provs or ORDEN:
        res = scrape_prov(prov, offline)
        por_fecha = combinar(prov, res)
        if not por_fecha:
            fallos.append(prov)
            log(f"quiniela {prov} SIN DATOS")
            continue
        hoy = max(por_fecha)
        resumen = {t["turno"]: ("OK" if t["validado"] else "CONFLICTO" if t.get("conflicto") else "1 fuente") for t in por_fecha[hoy]["turnos"]}
        log(f"quiniela {prov} {hoy} {resumen}")
        if publish:
            publicar_prov(prov, por_fecha)
    if publish:
        publicar_resumen()
    return fallos


def main(argv):
    offline = "--offline" in argv
    provs = argv[argv.index("--solo") + 1].split(",") if "--solo" in argv else None
    if not offline:
        log_robots()
    fallos = correr(provs, offline, publish="--no-publish" not in argv)
    log(f"quiniela fin fallos={fallos}")
    sys.exit(1 if fallos else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
