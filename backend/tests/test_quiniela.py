# Tests sin red del scraper de quinielas, sobre HTML real del 07/09/2026.
import os, sys, unittest, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import common
import quiniela_scraper as q

FX = os.path.join(HERE, "fixtures")


def fx(name):
    with open(os.path.join(FX, name), "rb") as f:
        raw = f.read()
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("latin-1")


# Ciudad, primera del 07/09/2026 (las dos fuentes coinciden)
PRIMERA_CIUDAD = ["2187", "4674", "1242", "1428", "2182", "5582", "5744", "2168", "5969", "0537",
                  "0906", "1772", "5485", "0741", "4222", "2817", "3564", "9123", "5275", "5181"]


class TestParseA(unittest.TestCase):
    def test_ciudad_bloques_y_ruido(self):
        d = q.parse_a(fx("quiniela_ciudad_A.html"), 4)
        hoy = d["2026-09-07"]
        self.assertEqual(set(hoy), {"previa", "primera", "matutina"})
        self.assertEqual(hoy["primera"]["numeros"], PRIMERA_CIUDAD)  # el texto anti-copia va entre la 2 y su numero
        self.assertEqual(hoy["primera"]["letras"], "UJRZ")
        self.assertEqual(hoy["primera"]["hora"], "12:00")
        self.assertEqual(hoy["previa"]["numeros"][0], "7556")
        self.assertIn("2026-09-05", d)  # la pagina trae dias anteriores

    def test_uruguay_tres_digitos(self):
        d = q.parse_a(fx("quiniela_uruguay_A.html"), 3)
        self.assertEqual(d["2026-09-07"]["vespertina"]["numeros"][:3], ["765", "458", "562"])
        self.assertEqual(len(d["2026-09-07"]["vespertina"]["numeros"]), 20)

    def test_ceros_a_la_izquierda(self):
        d = q.parse_a(fx("quiniela_provincia_A.html"), 4)
        self.assertIn("0009", d["2026-09-07"]["primera"]["numeros"])


class TestParseB(unittest.TestCase):
    def test_ciudad(self):
        d = q.parse_b(fx("quiniela_ciudad_B.html"), 4)
        hoy = d["2026-09-07"]
        self.assertEqual(set(hoy), {"primera", "matutina"})  # vespertina y nocturna: "NO HAY EXTRACTO"
        self.assertEqual(hoy["primera"]["numeros"], PRIMERA_CIUDAD)
        self.assertEqual(hoy["primera"]["letras"], "UJRZ")

    def test_provincia_el_primero(self):
        d = q.parse_b(fx("quiniela_provincia_B.html"), 4)
        self.assertEqual(d["2026-09-07"]["primera"]["numeros"][:2], ["8790", "0009"])


class TestParseM(unittest.TestCase):
    def test_montevideo_solo_quiniela_no_tombola(self):
        d = q.parse_m(fx("quiniela_uruguay_M.html"), 3)
        self.assertEqual(d["2026-09-07"]["vespertina"]["numeros"][:2], ["765", "458"])
        self.assertEqual(d["2026-09-05"]["nocturna"]["numeros"][0], "389")


class TestCombinar(unittest.TestCase):
    def res(self, prov, fuentes):
        cfg = q.PROVINCIAS[prov]
        return {n: q.FUENTES[n][1](fx(f"quiniela_{prov}_{n}.html"), cfg["digitos"]) for n in fuentes}

    def test_ciudad_valida_por_turno(self):
        out = q.combinar("ciudad", self.res("ciudad", ["A", "B"]))["2026-09-07"]
        por = {t["turno"]: t for t in out["turnos"]}
        self.assertEqual([t["turno"] for t in out["turnos"]], ["previa", "primera", "matutina"])
        self.assertTrue(por["primera"]["validado"])
        self.assertEqual(por["primera"]["fuentes"], ["A", "B"])
        self.assertFalse(por["previa"]["validado"])  # B no publica la previa
        self.assertEqual(por["previa"]["fuentes"], ["A"])
        self.assertFalse(out["validado"])
        self.assertEqual(por["primera"]["hora"], "12:00")

    def test_uruguay_a_mas_montevideo(self):
        out = q.combinar("uruguay", self.res("uruguay", ["A", "M"]))["2026-09-07"]
        self.assertEqual(out["turnos"][0]["turno"], "vespertina")
        self.assertTrue(out["turnos"][0]["validado"])
        self.assertEqual(out["digitos"], 3)

    def test_conflicto_no_publica_numeros(self):
        r = self.res("ciudad", ["A", "B"])
        r["B"]["2026-09-07"]["primera"]["numeros"][5] = "0000"
        with tempfile.TemporaryDirectory() as tmp:
            old_log = common.LOG
            common.LOG = os.path.join(tmp, "log")  # que el MISMATCH simulado no ensucie scraper.log
            try:
                out = q.combinar("ciudad", r)["2026-09-07"]
            finally:
                common.LOG = old_log
        por = {t["turno"]: t for t in out["turnos"]}
        self.assertIsNone(por["primera"]["numeros"])
        self.assertTrue(por["primera"].get("conflicto"))
        self.assertFalse(por["primera"]["validado"])

    def test_publicar_no_pisa_validado_con_no_validado(self):
        r = self.res("ciudad", ["A", "B"])
        with tempfile.TemporaryDirectory() as tmp:
            old = common.DATA, common.LOG
            common.DATA, common.LOG = tmp, os.path.join(tmp, "log")
            try:
                q.publicar_prov("ciudad", q.combinar("ciudad", r))
                p = os.path.join(tmp, "quiniela", "ciudad", "2026-09-07.json")
                self.assertTrue(common.read_json(p)["turnos"][1]["validado"])
                # segunda corrida: B cayo, primera queda con una sola fuente -> se conserva la validada
                solo_a = q.combinar("ciudad", {"A": r["A"]})
                q.publicar_prov("ciudad", solo_a)
                j = common.read_json(p)
                self.assertTrue(j["turnos"][1]["validado"])
                self.assertEqual(j["turnos"][1]["fuentes"], ["A", "B"])
                latest = common.read_json(os.path.join(tmp, "quiniela", "ciudad", "latest.json"))
                self.assertEqual(latest["fecha"], "2026-09-07")
                idx = common.read_json(os.path.join(tmp, "quiniela", "ciudad", "index.json"))
                self.assertEqual(idx["fechas"][0]["fecha"], "2026-09-07")
            finally:
                common.DATA, common.LOG = old


if __name__ == "__main__":
    unittest.main()
