# Tests sin red de Loto Plus y Poceada sobre HTML real (sorteos 3915 y 9712 del 05/09/2026).
import os, sys, unittest, tempfile, json

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import common
import lotoplus_scraper as lp
import poceada_scraper as po

FX = os.path.join(HERE, "fixtures")


def fx(name):
    with open(os.path.join(FX, name), "rb") as f:
        raw = f.read()
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("latin-1")


class TestLotoPlus(unittest.TestCase):
    def setUp(self):
        self.a = lp.parse_a(fx("lotoplus_A.html"))
        self.b = lp.parse_b(fx("lotoplus_B.html"))

    def test_cabecera_plus_y_numeros(self):
        for d in (self.a, self.b):
            self.assertEqual((d["sorteo"], d["fecha"], d["numero_plus"]), (3915, "2026-09-05", 1))
            self.assertEqual(d["modalidades"]["tradicional"]["numeros"], [8, 20, 23, 28, 39, 44])
            self.assertEqual(d["modalidades"]["match"]["numeros"], [1, 24, 25, 26, 37, 38])
            self.assertEqual(d["modalidades"]["desquite"]["numeros"], [0, 7, 30, 37, 38, 41])
            self.assertEqual(d["modalidades"]["sale_o_sale"]["numeros"], [0, 8, 15, 30, 37, 42])

    def test_premios_y_formato_de_dinero_de_b(self):
        self.assertEqual(lp.money_us("$3,867,231,609.72"), 3867231609)
        self.assertEqual(lp.money_us("$17,779.19"), 17779)
        pa = self.a["modalidades"]["tradicional"]["premios"]
        pb = self.b["modalidades"]["tradicional"]["premios"]
        self.assertEqual([(x["aciertos"], x["ganadores"]) for x in pa], [(6, 0), (5, 3), (4, 230)])
        self.assertEqual(pa[0]["premio"], 3867231610)   # A redondea
        self.assertEqual(pb[0]["premio"], 3867231609)   # B trunca centavos
        self.assertTrue(common.premio_eq(pa[0]["premio"], pb[0]["premio"]))
        self.assertEqual(self.b["modalidades"]["sale_o_sale"]["premios"], [{"aciertos": 5, "ganadores": 2, "premio": 26332065}])

    def test_proximo_y_cruce(self):
        self.assertEqual(self.a["proximo"], {"sorteo": 3916, "fecha": "2026-09-09", "pozo": 23858000000})  # sab -> mie
        self.assertIsNone(self.b["proximo"]["pozo"])
        self.assertEqual(common.compare(self.a, self.b), [])
        out, diffs = common.build("lotoplus", {"A": self.a, "B": self.b})
        self.assertTrue(out["validado"])
        self.assertEqual(out["numero_plus"], 1)
        self.assertEqual(out["proximo"]["pozo"], 23858000000)

    def test_numero_plus_distinto_es_diferencia(self):
        b2 = json.loads(json.dumps(self.b))
        b2["numero_plus"] = 7
        self.assertIn("numero_plus", common.compare(self.a, b2))


class TestPoceada(unittest.TestCase):
    def setUp(self):
        self.a = po.parse_a(fx("poceada_A.html"))

    def test_parse(self):
        self.assertEqual((self.a["sorteo"], self.a["fecha"]), (9712, "2026-09-05"))
        self.assertEqual(self.a["numeros"], ["05", "09", "11", "13", "15", "32", "39", "43", "48", "52",
                                             "55", "62", "65", "68", "72", "87", "90", "94", "96", "98"])
        self.assertEqual(self.a["letras"], "IMQS")
        self.assertEqual([(p["aciertos"], p["ganadores"], p["premio"]) for p in self.a["premios"]],
                         [(8, 0, 100000000), (7, 0, 3822827), (6, 22, 86882), (5, 196, 0)])
        self.assertEqual(self.a["proximo"], {"sorteo": 9713, "fecha": "2026-09-07", "pozo": 100000000})  # sab -> lun

    def nocturna(self, numeros, validado):
        return {"juego": "quiniela", "provincia": "ciudad", "fecha": "2026-09-05", "digitos": 4,
                "turnos": [{"turno": "nocturna", "hora": "21:00", "numeros": numeros, "letras": None,
                            "validado": validado, "fuentes": ["A", "B"] if validado else ["A"]}]}

    def con_data(self, doc, fn):
        with tempfile.TemporaryDirectory() as tmp:
            old = common.DATA, common.LOG
            common.DATA, common.LOG = tmp, os.path.join(tmp, "log")
            try:
                if doc:
                    common.write_json(os.path.join(tmp, "quiniela", "ciudad", "2026-09-05.json"), doc)
                return fn()
            finally:
                common.DATA, common.LOG = old

    # nocturna real del 05/09/2026: dos numeros terminan en 52 y la Poceada agrega el 62
    NOCT = ["5915", "4996", "2011", "1132", "7952", "6872", "7843", "8205", "9352", "4509",
            "6765", "8998", "4613", "5468", "6687", "9655", "3339", "1190", "9948", "8894"]

    def test_cruce_con_nocturna_validada(self):
        a, diffs, fuentes = self.con_data(self.nocturna(self.NOCT, True), lambda: po.cruzar(self.a))
        self.assertEqual(diffs, [])
        self.assertIn("ciudad-nocturna(A+B)", fuentes)

    def test_cruce_con_nocturna_de_una_fuente_no_valida(self):
        _, diffs, fuentes = self.con_data(self.nocturna(self.NOCT, False), lambda: po.cruzar(self.a))
        self.assertEqual(diffs, ["nocturna de Ciudad con una sola fuente"])

    def test_cruce_detecta_numero_que_no_esta(self):
        noct = list(self.NOCT)
        noct[0] = "5977"  # 77 no esta en la Poceada
        _, diffs, _ = self.con_data(self.nocturna(noct, True), lambda: po.cruzar(self.a))
        self.assertEqual(diffs, ["numeros vs nocturna de Ciudad"])

    def test_sin_nocturna(self):
        _, diffs, fuentes = self.con_data(None, lambda: po.cruzar(self.a))
        self.assertEqual(diffs, ["sin nocturna de Ciudad para cruzar"])
        self.assertEqual(fuentes, ["A"])


if __name__ == "__main__":
    unittest.main()
