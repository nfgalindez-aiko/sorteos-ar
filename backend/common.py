#!/usr/bin/env python3
# Sorteos AR - utilidades comunes de los scrapers. Solo stdlib.
import json, re, os, html, glob, copy, urllib.request
from html.parser import HTMLParser
from datetime import datetime, timedelta, timezone, date

ART = timezone(timedelta(hours=-3))  # Argentina no tiene horario de verano
UA = "Mozilla/5.0 (Macintosh) SorteosAR/0.1"
BASE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(BASE, "fixtures")
LOG = os.path.join(BASE, "scraper.log")
DATA = os.path.join(os.path.dirname(BASE), "data")
ROBOTS = ["https://www.tujugada.com.ar/robots.txt",
          "https://www.quini-6-resultados.com.ar/robots.txt"]


def now_art():
    return datetime.now(ART).isoformat(timespec="seconds")


def log(msg):
    line = f"{now_art()} {msg}"
    try:
        print(line)
    except UnicodeEncodeError:
        print(line.encode("ascii", "replace").decode())
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
    for enc in ("utf-8", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            pass
    return raw.decode("utf-8", "replace")


def save_fixture(name, text):
    os.makedirs(FIX, exist_ok=True)
    with open(os.path.join(FIX, name), "w", encoding="utf-8") as f:
        f.write(text)


def read_fixture(name):
    with open(os.path.join(FIX, name), encoding="utf-8") as f:
        return f.read()


def log_robots():
    for u in ROBOTS:
        try:
            txt = fetch(u)
            save_fixture("robots_" + u.split("/")[2] + ".txt", txt)
            log(f"ROBOTS {u} ({len(txt)} bytes)\n{txt.strip()}")
        except Exception as e:
            log(f"ROBOTS {u} ERROR {e}")


class Stripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.out = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
        self.out.append(" ")

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.skip:
            self.skip -= 1
        self.out.append(" ")

    def handle_data(self, d):
        if not self.skip:
            self.out.append(d)


def to_text(h):
    s = Stripper()
    s.feed(h)
    t = html.unescape("".join(s.out)).replace("\xa0", " ")
    return re.sub(r"\s+", " ", t).upper()


def money(s):
    """'$ 2.078.421,33' -> 2078421 (parte entera). 'VAC.'/'VACANTE' -> 0.
    Tolera el typo '494,443,71' (coma como separador de miles) de la fuente B: solo se toma
    como decimal una coma final seguida de 1 o 2 digitos."""
    s = s.strip()
    if s.startswith("VAC"):
        return 0
    m = re.match(r"^(.*?)(,\d{1,2})?$", s)
    return int(re.sub(r"[^\d]", "", m.group(1)))


def count(s):
    """'5.316' -> 5316, '1628' -> 1628, 'VAC.' -> 0."""
    return money(s)


SIX_A = r"\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\b"
SIX_B = r"\s+(\d{2})\s*-\s*(\d{2})\s*-\s*(\d{2})\s*-\s*(\d{2})\s*-\s*(\d{2})\s*-\s*(\d{2})\b"
SIX_SP = r"\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\b"


def six(text, label, pat, lo, hi):
    m = re.search(re.escape(label) + pat, text)
    if not m:
        raise ValueError(f"no encontre {label}")
    nums = sorted(int(x) for x in m.groups())
    if len(set(nums)) != 6 or any(n < lo or n > hi for n in nums):
        raise ValueError(f"{label}: numeros invalidos {nums}")
    return nums


def next_draw(fecha_iso, weekdays):
    """Proxima fecha estrictamente posterior a fecha_iso cuyo weekday este en weekdays (0=lunes)."""
    d = date.fromisoformat(fecha_iso)
    while True:
        d += timedelta(days=1)
        if d.weekday() in weekdays:
            return d.isoformat()


def premio_eq(x, y):
    # A redondea al peso, B trae centavos: se aceptan diferencias de 1 peso.
    if x is None or y is None:
        return x == y
    return abs(x - y) <= 1


def compare(a, b):
    """Devuelve lista de claves con diferencias entre dos dicts parseados."""
    diffs = []
    for k in ("sorteo", "fecha"):
        if a.get(k) != b.get(k):
            diffs.append(k)
    mods = set(a.get("modalidades", {})) | set(b.get("modalidades", {}))
    for mod in sorted(mods):
        ma, mb = a.get("modalidades", {}).get(mod), b.get("modalidades", {}).get(mod)
        if ma is None or mb is None:
            diffs.append(f"modalidades.{mod}")
            continue
        if ma["numeros"] != mb["numeros"]:
            diffs.append(f"modalidades.{mod}.numeros")
        pa, pb = ma["premios"], mb["premios"]
        if len(pa) != len(pb):
            diffs.append(f"modalidades.{mod}.premios")
        else:
            for ra, rb in zip(pa, pb):
                if (ra["aciertos"], ra["ganadores"]) != (rb["aciertos"], rb["ganadores"]) \
                        or not premio_eq(ra["premio"], rb["premio"]):
                    diffs.append(f"modalidades.{mod}.premios.{ra['aciertos']}")
    xa, xb = a.get("pozo_extra"), b.get("pozo_extra")
    if xa and xb:
        if xa["ganadores"] != xb["ganadores"] or not premio_eq(xa["premio"], xb["premio"]):
            diffs.append("pozo_extra")
    elif bool(xa) != bool(xb):
        diffs.append("pozo_extra")
    pa, pb = a.get("proximo", {}), b.get("proximo", {})
    for k in ("sorteo", "fecha", "pozo"):
        if pa.get(k) is not None and pb.get(k) is not None and pa[k] != pb[k]:
            diffs.append(f"proximo.{k}")
    return diffs


def merge(a, b):
    """Base B (trae centavos truncados), completa con A lo que a B le falta."""
    out = copy.deepcopy(b)
    for k in ("sorteo", "fecha", "pozo"):
        if out.setdefault("proximo", {}).get(k) is None and a.get("proximo", {}).get(k) is not None:
            out["proximo"][k] = a["proximo"][k]
    if not out.get("pozo_extra") and a.get("pozo_extra"):
        out["pozo_extra"] = a["pozo_extra"]
    return out


def build(juego, res):
    """res = {"A": dict|{"error"}, "B": dict|{"error"}} -> salida completa."""
    a, b = res.get("A", {}), res.get("B", {})
    ok_a, ok_b = "error" not in a, "error" not in b
    if ok_a and ok_b:
        diffs = compare(a, b)
        data = merge(a, b)
        fuentes = ["A", "B"]
    else:
        diffs = ["A" if not ok_a else "B"]
        data = copy.deepcopy(b if ok_b else a if ok_a else {})
        fuentes = ["B"] if ok_b else ["A"] if ok_a else []
    validado = ok_a and ok_b and not diffs
    out = {"juego": juego}
    out.update(data)
    out["validado"] = validado
    out["fuentes"] = fuentes
    out["generado"] = now_art()
    return out, diffs


def dump(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2)


def write_json(path, obj):
    """Escribe solo si el contenido (ignorando 'generado') cambio, para que el cron no
    commitee archivos identicos cada 5 minutos. Devuelve True si escribio."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        try:
            prev = read_json(path)
            sin_ts = lambda d: {k: v for k, v in d.items() if k != "generado"}
            if sin_ts(prev) == sin_ts(obj):
                return False
        except Exception:
            pass
    with open(path, "w", encoding="utf-8") as f:
        f.write(dump(obj) + "\n")
    return True


def read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def rebuild_index(juego):
    d = os.path.join(DATA, juego)
    items = []
    for p in glob.glob(os.path.join(d, "[0-9]*.json")):
        try:
            j = read_json(p)
            items.append({"sorteo": j["sorteo"], "fecha": j["fecha"], "validado": j.get("validado", False)})
        except Exception as e:
            log(f"INDEX {juego} salteo {p}: {e}")
    items.sort(key=lambda x: x["sorteo"], reverse=True)
    write_json(os.path.join(d, "index.json"), {"juego": juego, "sorteos": items,
                                                "generado": now_art()})
    return items


def publish(juego, out, force_latest=False):
    """Escribe data/<juego>/NNNN.json siempre que haya sorteo; latest.json solo si validado
    y es igual o mas nuevo que el actual. Devuelve True si actualizo latest."""
    if "sorteo" not in out:
        log(f"PUBLISH {juego}: sin datos, no escribo nada")
        return False
    d = os.path.join(DATA, juego)
    write_json(os.path.join(d, f"{out['sorteo']}.json"), out)
    updated = False
    if out["validado"] or force_latest:
        latest = os.path.join(d, "latest.json")
        prev = read_json(latest)["sorteo"] if os.path.exists(latest) else -1
        if out["sorteo"] >= prev:
            write_json(latest, out)
            updated = True
            log(f"PUBLISH {juego}: latest.json -> sorteo {out['sorteo']}")
        else:
            log(f"PUBLISH {juego}: sorteo {out['sorteo']} es anterior a latest {prev}, no toco latest")
    else:
        log(f"PUBLISH {juego}: sorteo {out['sorteo']} NO validado, latest.json queda como estaba")
    rebuild_index(juego)
    return updated
