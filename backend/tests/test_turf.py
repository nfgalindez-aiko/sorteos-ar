# Tests sin red del scraper de turf, sobre el parte de dividendos real de San Isidro
# (reunion 84 del sabado 12/09/2026) y sobre un dia sin carreras.
import os, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import common
import turf_scraper as ts
from tests.apoyo import entorno

FX = os.path.join(HERE, "fixtures")


def fx(name):
    with open(os.path.join(FX, name), encoding="utf-8") as f:
        return f.read()


class TestParteDividendos(unittest.TestCase):
    def setUp(self):
        self.d = ts.parse(fx("turf_sanisidro_20260912.html"), "2026-09-12")

    def test_cabecera(self):
        # el HTML trae "Reuni&oacute;n Nro.84" con la entidad SIN resolver. Si el regex no la
        # contempla, el scraper cree que no hubo carreras y no publica nada. Paso en el primer
        # intento y no dio error: devolvio cero reuniones, en silencio.
        self.assertEqual(self.d["reunion"], 84)
        self.assertEqual(self.d["fecha"], "2026-09-12")
        self.assertEqual(self.d["hipodromo"], "sanisidro")
        self.assertEqual(len(self.d["carreras"]), 14)

    def test_las_carreras_estan_numeradas_de_1_a_14(self):
        self.assertEqual([c["numero"] for c in self.d["carreras"]], list(range(1, 15)))

    def test_primera_carrera_contra_el_parte_oficial(self):
        c = self.d["carreras"][0]
        self.assertEqual([p["puesto"] for p in c["posiciones"]], ["GAN", "SEG", "TER"])
        gan = c["posiciones"][0]
        self.assertEqual((gan["orden"], gan["competidor"]), (7, "INNER CIRCLE"))
        self.assertEqual(gan["dividendos"], [2.05, 1.65, 1.80])
        self.assertEqual(c["posiciones"][1]["dividendos"], [3.00, 2.95])   # el segundo no paga ganador
        self.assertEqual(c["posiciones"][2]["dividendos"], [4.20])         # el tercero paga solo tercero
        self.assertEqual(c["apuestas"],
                         [{"apuesta": "Exacta", "marcador": "07 10", "dividendo": 33500.00},
                          {"apuesta": "Trifecta", "marcador": "07 10 05", "dividendo": 519700.00}])

    def test_los_centavos_del_dividendo_no_se_pierden(self):
        # 49.10 es lo que paga cada peso apostado: truncar a 49, como hace money() con los premios
        # de la loteria, aca diria otra cosa
        self.assertEqual(self.d["carreras"][1]["posiciones"][0]["dividendos"][0], 49.10)
        self.assertIsInstance(self.d["carreras"][0]["posiciones"][0]["dividendos"][0], float)

    def test_una_carrera_con_muchas_apuestas(self):
        c = self.d["carreras"][13]
        nombres = [a["apuesta"] for a in c["apuestas"]]
        for esperado in ("Imperfecta", "Cuatrifecta", "Doble", "Triplo", "Cuaterna", "Quintuplo"):
            self.assertIn(esperado, nombres)
        cuaterna = next(a for a in c["apuestas"] if a["apuesta"] == "Cuaterna")
        self.assertEqual(cuaterna["dividendo"], 25000000.00)

    def test_carrera_sin_tercero(self):
        # la 5a solo pago ganador y segundo
        self.assertEqual([p["puesto"] for p in self.d["carreras"][4]["posiciones"]], ["GAN", "SEG"])

    def test_dia_sin_carreras_devuelve_None(self):
        # el endpoint contesta igual los dias sin reunion, con "Reunion Nro. -" y sin tablas.
        # NO es un error: hay que distinguir "no se corrio" de "la fuente se cayo".
        self.assertIsNone(ts.parse(fx("turf_sanisidro_sincarreras.html"), "2026-09-13"))

    def test_html_basura_no_rompe(self):
        self.assertIsNone(ts.parse("<html><body>nada</body></html>", "2026-09-12"))


class TestPublicar(unittest.TestCase):
    def test_publica_con_fuente_oficial_y_arma_indice(self):
        d = ts.parse(fx("turf_sanisidro_20260912.html"), "2026-09-12")
        with entorno() as tmp:
            ts.publicar([d])
            base = os.path.join(tmp, "turf", "sanisidro")
            j = common.read_json(os.path.join(base, "2026-09-12.json"))
            # una sola fuente, pero es el parte oficial: se marca validado y la app tiene que
            # decir "fuente oficial", nunca "2 fuentes" (decision del 15/09/2026)
            self.assertTrue(j["validado"])
            self.assertEqual(j["fuentes"], ["oficial"])
            self.assertEqual(common.read_json(os.path.join(base, "latest.json"))["reunion"], 84)
            idx = common.read_json(os.path.join(base, "index.json"))
            self.assertEqual(idx["fechas"][0], {"fecha": "2026-09-12", "reunion": 84, "carreras": 14})


if __name__ == "__main__":
    unittest.main()
