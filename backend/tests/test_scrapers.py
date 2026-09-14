# Sorteos AR - tests sin red sobre HTML real congelado en tests/fixtures/.
# Correr desde backend/:  python -m unittest -v
import os, sys, unittest, json, tempfile, contextlib, io

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import common
import quini6_scraper as q
import brinco_scraper as b
import verificador
from datetime import datetime, date

FX = os.path.join(HERE, "fixtures")


def fx(name):
    with open(os.path.join(FX, name), encoding="utf-8") as f:
        return f.read()


# Datos de referencia del brief (sorteo 3406 del 06/09/2026)
REF_3406 = {
    "tradicional": [2, 16, 20, 21, 22, 38],
    "segunda": [12, 16, 23, 26, 28, 34],
    "revancha": [0, 3, 22, 32, 37, 41],
    "siempre_sale": [0, 3, 4, 13, 23, 42],
}


class TestQuini6Latest(unittest.TestCase):
    def setUp(self):
        self.a = q.parse_a(fx("quini6_A_3406.html"))
        self.b = q.parse_b(fx("quini6_B_3406.html"))

    def test_cabecera(self):
        for d in (self.a, self.b):
            self.assertEqual(d["sorteo"], 3406)
            self.assertEqual(d["fecha"], "2026-09-06")

    def test_numeros_referencia(self):
        for d in (self.a, self.b):
            for k, v in REF_3406.items():
                self.assertEqual(d["modalidades"][k]["numeros"], v, k)

    def test_premios_tradicional(self):
        for d in (self.a, self.b):
            p = d["modalidades"]["tradicional"]["premios"]
            self.assertEqual(p[0], {"aciertos": 6, "ganadores": 0, "premio": 1855130508})
            self.assertEqual(p[1]["aciertos"], 5)
            self.assertEqual(p[1]["ganadores"], 27)
            self.assertEqual(p[2], {"aciertos": 4, "ganadores": 1628, "premio": 10341})

    def test_revancha_y_siempre_sale(self):
        for d in (self.a, self.b):
            self.assertEqual(d["modalidades"]["revancha"]["premios"],
                             [{"aciertos": 6, "ganadores": 0, "premio": 7032378571}])
            ss = d["modalidades"]["siempre_sale"]["premios"]
            self.assertEqual(len(ss), 1)
            self.assertEqual((ss[0]["aciertos"], ss[0]["ganadores"], ss[0]["premio"]), (5, 16, 31448574))

    def test_pozo_extra(self):
        for d in (self.a, self.b):
            self.assertEqual(d["pozo_extra"], {"ganadores": 718, "premio": 278551})

    def test_proximo(self):
        self.assertEqual(self.a["proximo"], {"sorteo": 3407, "fecha": "2026-09-09", "pozo": 12860000000})
        self.assertEqual(self.b["proximo"], {"sorteo": 3407, "fecha": "2026-09-09", "pozo": 12860000000})

    def test_redondeo_a_vs_centavos_b(self):
        # A redondea (2.439.886), B trae centavos (2.439.885,91 -> 2439885): difieren en 1 y se acepta
        pa = self.a["modalidades"]["segunda"]["premios"][1]["premio"]
        pb = self.b["modalidades"]["segunda"]["premios"][1]["premio"]
        self.assertEqual((pa, pb), (2439886, 2439885))
        self.assertTrue(common.premio_eq(pa, pb))
        self.assertFalse(common.premio_eq(pa, pb - 1))

    def test_cruce_sin_diferencias(self):
        self.assertEqual(common.compare(self.a, self.b), [])

    def test_build_formato_publicado(self):
        out, diffs = common.build("quini6", {"A": self.a, "B": self.b})
        self.assertEqual(diffs, [])
        self.assertTrue(out["validado"])
        self.assertEqual(out["fuentes"], ["A", "B"])
        self.assertEqual(out["juego"], "quini6")
        self.assertEqual(set(out), {"juego", "sorteo", "fecha", "modalidades", "pozo_extra",
                                    "proximo", "validado", "fuentes", "generado"})
        self.assertEqual(set(out["modalidades"]), set(REF_3406))
        self.assertTrue(out["generado"].endswith("-03:00"))
        # el premio publicado es el de B (centavos truncados)
        self.assertEqual(out["modalidades"]["segunda"]["premios"][1]["premio"], 2439885)
        json.dumps(out)  # serializable


class TestQuini6Historico(unittest.TestCase):
    def test_a_historico(self):
        d = q.parse_a(fx("quini6_A_3405.html"))
        self.assertEqual((d["sorteo"], d["fecha"]), (3405, "2026-09-02"))
        self.assertEqual(d["modalidades"]["tradicional"]["numeros"], [0, 5, 10, 22, 26, 45])
        self.assertEqual(d["pozo_extra"], {"ganadores": 853, "premio": 234466})
        self.assertEqual(d["proximo"]["fecha"], "2026-09-06")

    def test_b_historico_formato_distinto(self):
        d = q.parse_b(fx("quini6_B_3405.html"))
        self.assertEqual((d["sorteo"], d["fecha"]), (3405, "2026-09-02"))
        self.assertEqual(d["modalidades"]["segunda"]["numeros"], [2, 3, 16, 22, 24, 44])
        self.assertEqual(d["modalidades"]["siempre_sale"]["premios"][0]["ganadores"], 30)
        self.assertEqual(d["pozo_extra"], {"ganadores": 853, "premio": 234466})
        self.assertIsNone(d["proximo"]["pozo"])

    def test_cruce_historico(self):
        a = q.parse_a(fx("quini6_A_3405.html"))
        b = q.parse_b(fx("quini6_B_3405.html"))
        self.assertEqual(common.compare(a, b), [])
        out, _ = common.build("quini6", {"A": a, "B": b})
        self.assertTrue(out["validado"])
        self.assertEqual(out["proximo"]["pozo"], 12000000000)  # lo completa A


class TestBrinco(unittest.TestCase):
    def setUp(self):
        self.a = b.parse_a(fx("brinco_A_1370.html"))
        self.b = b.parse_b(fx("brinco_B_1370.html"))

    def test_cabecera_y_numeros(self):
        for d in (self.a, self.b):
            self.assertEqual((d["sorteo"], d["fecha"]), (1370, "2026-09-06"))
            self.assertEqual(d["modalidades"]["tradicional"]["numeros"], [5, 13, 21, 22, 25, 36])
            self.assertEqual(d["modalidades"]["junior"]["numeros"], [0, 1, 18, 20, 21, 23])

    def test_premios(self):
        for d in (self.a, self.b):
            p = d["modalidades"]["tradicional"]["premios"]
            self.assertEqual([(x["aciertos"], x["ganadores"]) for x in p],
                             [(6, 0), (5, 10), (4, 366), (3, 5316)])
            self.assertEqual(p[0]["premio"], 265513676)
            self.assertEqual(p[3]["premio"], 1500)
            j = d["modalidades"]["junior"]["premios"]
            self.assertEqual((j[0]["aciertos"], j[0]["ganadores"]), (5, 6))
            self.assertTrue(common.premio_eq(j[0]["premio"], 5457092))

    def test_proximo_y_cruce(self):
        self.assertEqual(self.a["proximo"], {"sorteo": 1371, "fecha": "2026-09-13", "pozo": 360000000})
        self.assertIsNone(self.b["proximo"]["pozo"])
        self.assertEqual(common.compare(self.a, self.b), [])
        out, _ = common.build("brinco", {"A": self.a, "B": self.b})
        self.assertTrue(out["validado"])
        self.assertEqual(out["proximo"]["pozo"], 360000000)
        self.assertIsNone(out["pozo_extra"])


class TestCommon(unittest.TestCase):
    def setUp(self):
        """Los avisos de estos tests no van al scraper.log ni al log de GitHub Actions: leidos
        ahi confunden con datos reales (ya pasó con MISMATCH, regla 20)."""
        self._log, self._tmp = common.LOG, tempfile.TemporaryDirectory()
        common.LOG = os.path.join(self._tmp.name, "log")
        self._pila = contextlib.ExitStack()
        self._pila.enter_context(contextlib.redirect_stdout(io.StringIO()))

    def tearDown(self):
        self._pila.close()
        common.LOG = self._log
        self._tmp.cleanup()

    def test_money_y_count(self):
        self.assertEqual(common.money("$ 2.078.421,33"), 2078421)
        self.assertEqual(common.money("1.855.130.508"), 1855130508)
        self.assertEqual(common.money("VAC."), 0)
        self.assertEqual(common.money("VACANTE"), 0)
        self.assertEqual(common.count("5.316"), 5316)
        self.assertEqual(common.count("1628"), 1628)
        # typo real de la fuente B en el sorteo 3398: coma como separador de miles
        self.assertEqual(common.money("494,443,71"), 494443)
        self.assertEqual(common.money("1,500"), 1500)
        self.assertEqual(common.money("68.181,82"), 68181)

    def test_next_draw(self):
        self.assertEqual(common.next_draw("2026-09-06", (2, 6)), "2026-09-09")  # dom -> mie
        self.assertEqual(common.next_draw("2026-09-09", (2, 6)), "2026-09-13")  # mie -> dom
        self.assertEqual(common.next_draw("2026-09-06", (6,)), "2026-09-13")   # brinco

    def test_six_rechaza_invalidos(self):
        with self.assertRaises(ValueError):
            common.six("X 1 2 3 4 5 5", "X", common.SIX_A, 0, 45)   # repetido
        with self.assertRaises(ValueError):
            common.six("X 1 2 3 4 5 46", "X", common.SIX_A, 0, 45)  # fuera de rango

    def test_compare_detecta_mismatch(self):
        a = q.parse_a(fx("quini6_A_3406.html"))
        b2 = q.parse_b(fx("quini6_B_3406.html"))
        b2["modalidades"]["revancha"]["numeros"][0] = 1
        b2["pozo_extra"]["ganadores"] = 1
        self.assertEqual(common.compare(a, b2), ["modalidades.revancha.numeros", "pozo_extra"])
        out, diffs = common.build("quini6", {"A": a, "B": b2})
        self.assertFalse(out["validado"])

    def test_build_una_sola_fuente_no_valida(self):
        a = q.parse_a(fx("quini6_A_3406.html"))
        out, conflictos = common.build("quini6", {"A": a, "B": {"error": "boom"}})
        self.assertFalse(out["validado"])
        self.assertEqual(out["fuentes"], ["A"])
        self.assertEqual(conflictos, [])  # una fuente caida no es un conflicto entre fuentes

    def test_desfasaje_no_es_conflicto(self):
        """La fuente A ya publico el sorteo nuevo y B todavia no: se toma el nuevo con 1 fuente."""
        a = q.parse_a(fx("quini6_A_3406.html"))
        b_viejo = q.parse_b(fx("quini6_B_3405.html"))
        out, conflictos = common.build("quini6", {"A": a, "B": b_viejo})
        self.assertEqual(conflictos, [])
        self.assertEqual(out["sorteo"], 3406)
        self.assertFalse(out["validado"])
        self.assertEqual(out["fuentes"], ["A"])
        # y al reves: si la atrasada es A, se toma el de B
        a_viejo = q.parse_a(fx("quini6_A_3405.html"))
        b = q.parse_b(fx("quini6_B_3406.html"))
        out2, conflictos2 = common.build("quini6", {"A": a_viejo, "B": b})
        self.assertEqual(conflictos2, [])
        self.assertEqual((out2["sorteo"], out2["fuentes"]), (3406, ["B"]))

    def test_publish_avanza_con_una_fuente_y_confirma_despues(self):
        a = q.parse_a(fx("quini6_A_3406.html"))
        bb = q.parse_b(fx("quini6_B_3406.html"))
        with tempfile.TemporaryDirectory() as tmp:
            old_data, old_log = common.DATA, common.LOG
            common.DATA, common.LOG = tmp, os.path.join(tmp, "log")
            try:
                out, _ = common.build("quini6", {"A": a, "B": bb})
                self.assertTrue(common.publish("quini6", out))
                latest = os.path.join(tmp, "quini6", "latest.json")
                self.assertEqual(common.read_json(latest)["sorteo"], 3406)

                # llega el 3407 solo por A (la otra fuente todavia no lo tiene):
                # latest AVANZA con 1 fuente, porque el dato nuevo vale mas que el viejo
                a2 = json.loads(json.dumps(a)); a2["sorteo"] = 3407
                b_atrasada = json.loads(json.dumps(bb))
                out2, conflictos = common.build("quini6", {"A": a2, "B": b_atrasada})
                self.assertEqual(conflictos, [])
                self.assertTrue(common.publish("quini6", out2))
                j = common.read_json(latest)
                self.assertEqual((j["sorteo"], j["validado"], j["fuentes"]), (3407, False, ["A"]))
                nov = common.read_json(os.path.join(tmp, "novedades.json"))["novedades"]
                self.assertEqual([n["sorteo"] for n in nov], [3406])  # sin novedad todavia

                # cuando B se pone al dia, el mismo sorteo pasa a confirmado y recien ahi hay novedad
                b2 = json.loads(json.dumps(bb)); b2["sorteo"] = 3407
                out3, _ = common.build("quini6", {"A": a2, "B": b2})
                self.assertTrue(out3["validado"])
                self.assertTrue(common.publish("quini6", out3))
                j = common.read_json(latest)
                self.assertEqual((j["sorteo"], j["validado"], j["fuentes"]), (3407, True, ["A", "B"]))
                nov = common.read_json(os.path.join(tmp, "novedades.json"))["novedades"]
                self.assertEqual(sorted(n["sorteo"] for n in nov), [3406, 3407])
            finally:
                common.DATA, common.LOG = old_data, old_log

    def test_publish_no_degrada_un_sorteo_ya_confirmado(self):
        """El bug del 3915: una corrida con menos fuentes no puede marcar '1 fuente' lo confirmado."""
        a = q.parse_a(fx("quini6_A_3406.html"))
        bb = q.parse_b(fx("quini6_B_3406.html"))
        with tempfile.TemporaryDirectory() as tmp:
            old_data, old_log = common.DATA, common.LOG
            common.DATA, common.LOG = tmp, os.path.join(tmp, "log")
            try:
                out, _ = common.build("quini6", {"A": a, "B": bb})
                common.publish("quini6", out)
                flojo, _ = common.build("quini6", {"A": a, "B": {"error": "caida"}})
                common.publish("quini6", flojo)
                j = common.read_json(os.path.join(tmp, "quini6", "3406.json"))
                self.assertTrue(j["validado"])
                self.assertEqual(j["fuentes"], ["A", "B"])
            finally:
                common.DATA, common.LOG = old_data, old_log

    def test_conflicto_real_no_toca_latest(self):
        """Mismo sorteo con numeros distintos: eso si es conflicto y latest no se mueve."""
        a = q.parse_a(fx("quini6_A_3406.html"))
        bb = q.parse_b(fx("quini6_B_3406.html"))
        with tempfile.TemporaryDirectory() as tmp:
            old_data, old_log = common.DATA, common.LOG
            common.DATA, common.LOG = tmp, os.path.join(tmp, "log")
            try:
                common.publish("quini6", common.build("quini6", {"A": a, "B": bb})[0])
                a2 = json.loads(json.dumps(a)); a2["sorteo"] = 3407
                b2 = json.loads(json.dumps(bb)); b2["sorteo"] = 3407
                b2["modalidades"]["tradicional"]["numeros"] = [1, 2, 3, 4, 5, 6]
                out, conflictos = common.build("quini6", {"A": a2, "B": b2})
                self.assertIn("modalidades.tradicional.numeros", conflictos)
                self.assertFalse(out["validado"])
                common.publish("quini6", out)
                self.assertEqual(common.read_json(os.path.join(tmp, "quini6", "latest.json"))["sorteo"], 3407)
            finally:
                common.DATA, common.LOG = old_data, old_log


class TestWriteJson(unittest.TestCase):
    def test_no_reescribe_si_solo_cambia_generado(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = os.path.join(tmp, "x.json")
            self.assertTrue(common.write_json(p, {"a": 1, "generado": "t1"}))
            self.assertFalse(common.write_json(p, {"a": 1, "generado": "t2"}))
            self.assertEqual(common.read_json(p)["generado"], "t1")
            self.assertTrue(common.write_json(p, {"a": 2, "generado": "t3"}))
            self.assertEqual(common.read_json(p)["a"], 2)


class TestRobots(unittest.TestCase):
    def test_robots_permiten_las_paginas_usadas(self):
        ra = fx("robots_www.tujugada.com.ar.txt")
        self.assertIn("Allow: /", ra)
        for path in ("/data/", "/cargas/", "/graba/", "/desa/", "/Control/", "/includes/"):
            self.assertIn(f"Disallow: {path}", ra)
        self.assertNotIn("Disallow: /quini6", ra)
        self.assertNotIn("Disallow: /brinco", ra)
        rb = fx("robots_www.quini-6-resultados.com.ar.txt")
        self.assertNotIn("Disallow", rb)


if __name__ == "__main__":
    unittest.main()


class TestVerificadorQuiniela(unittest.TestCase):
    """El verificador fallaba todos los sabados por pedirle a Montevideo un turno que no existe.

    Montevideo sortea solo la nocturna los sabados: entre las 16:15 y las 22:15 el ultimo dia
    publicado era el viernes y el verificador lo marcaba DESACTUALIZADO. Nueve corridas en rojo
    sin ningun dato roto (ver ESTADO, regla 40).
    """

    def setUp(self):
        self.v = verificador
        self.v.PROBLEMAS = []
        self.v.AVISOS = []
        self._stdout = contextlib.redirect_stdout(io.StringIO())
        self._stdout.__enter__()

    def tearDown(self):
        self._stdout.__exit__(None, None, None)

    @staticmethod
    def dia(fecha, turnos):
        return {"fecha": fecha, "digitos": 4,
                "turnos": [{"turno": t, "numeros": ["%04d" % i for i in range(20)]} for t in turnos]}

    # sabado 12/09/2026 a las 19:00 ART: la vespertina de las provincias ya vencio,
    # la nocturna (21:00) todavia no.
    SABADO_19 = datetime(2026, 9, 12, 19, 0)
    SABADO_1930 = datetime(2026, 9, 12, 19, 30)  # la vespertina (18:00) ya vencio
    SABADO_23 = datetime(2026, 9, 12, 23, 0)
    VIERNES_19 = datetime(2026, 9, 11, 19, 0)

    def test_montevideo_no_tiene_vespertina_el_sabado(self):
        self.assertEqual(self.v.horarios("uruguay", date(2026, 9, 12)), {"nocturna": "21:00"})
        self.assertIn("vespertina", self.v.horarios("uruguay", date(2026, 9, 11)))

    def test_las_provincias_si_tienen_vespertina_el_sabado(self):
        # verificado en los datos publicados del 12/09/2026: los cinco turnos
        self.assertEqual(len(self.v.horarios("ciudad", date(2026, 9, 12))), 5)

    def test_domingo_no_se_exige_nada(self):
        self.assertEqual(self.v.horarios("ciudad", date(2026, 9, 13)), {})
        self.assertEqual(self.v.vencidos_de("ciudad", datetime(2026, 9, 13, 23, 0)), [])

    def test_sabado_a_la_tarde_montevideo_con_el_viernes_no_es_problema(self):
        # el caso exacto que rompia: ultimo dia publicado el viernes, sabado 19:00
        self.v.check_frescura("uruguay", self.dia("2026-09-11", ["vespertina", "nocturna"]),
                              self.SABADO_19, alguna_publico_hoy=True)
        self.assertEqual(self.v.PROBLEMAS, [])
        self.assertEqual(self.v.AVISOS, [])

    def test_sabado_a_la_noche_montevideo_sin_la_nocturna_si_es_problema(self):
        self.v.check_frescura("uruguay", self.dia("2026-09-11", ["vespertina", "nocturna"]),
                              self.SABADO_23, alguna_publico_hoy=True)
        self.assertEqual(len(self.v.PROBLEMAS), 1)

    def test_sabado_montevideo_con_la_nocturna_esta_al_dia(self):
        self.v.check_frescura("uruguay", self.dia("2026-09-12", ["nocturna"]),
                              self.SABADO_23, alguna_publico_hoy=True)
        self.assertEqual(self.v.PROBLEMAS, [])

    def test_una_provincia_atrasada_mientras_las_otras_publicaron_es_problema(self):
        self.v.check_frescura("cordoba", self.dia("2026-09-11", ["nocturna"]),
                              self.SABADO_19, alguna_publico_hoy=True)
        self.assertEqual(len(self.v.PROBLEMAS), 1)
        self.assertIn("las demas quinielas si publicaron", self.v.PROBLEMAS[0])

    def test_feriado_ninguna_publico_es_aviso_no_problema(self):
        # viernes feriado: nadie sorteo. Un dia de atraso no puede distinguirse de un feriado.
        self.v.check_frescura("ciudad", self.dia("2026-09-10", ["nocturna"]),
                              self.VIERNES_19, alguna_publico_hoy=False)
        self.assertEqual(self.v.PROBLEMAS, [])
        self.assertEqual(len(self.v.AVISOS), 1)
        self.assertIn("feriado o fuente caida", self.v.AVISOS[0])

    def test_tres_dias_sin_publicar_ya_no_lo_explica_un_feriado(self):
        self.v.check_frescura("ciudad", self.dia("2026-09-07", ["nocturna"]),
                              self.VIERNES_19, alguna_publico_hoy=False)
        self.assertEqual(len(self.v.PROBLEMAS), 1)
        self.assertIn("DESACTUALIZADO", self.v.PROBLEMAS[0])

    def test_dias_de_sorteo_entre_saltea_los_domingos(self):
        # del viernes 11 al lunes 14: sabado y lunes, el domingo no cuenta
        self.assertEqual(self.v.dias_de_sorteo_entre(date(2026, 9, 11), date(2026, 9, 14)), 2)
        self.assertEqual(self.v.dias_de_sorteo_entre(date(2026, 9, 11), date(2026, 9, 12)), 1)

    def test_falta_un_turno_del_dia_es_aviso_y_faltar_todos_es_problema(self):
        self.v.check_frescura("ciudad", self.dia("2026-09-12", ["previa", "primera", "matutina"]),
                              self.SABADO_1930, alguna_publico_hoy=True)
        self.assertEqual(self.v.PROBLEMAS, [])
        self.assertEqual(len(self.v.AVISOS), 1)
        self.v.AVISOS = []
        self.v.check_frescura("ciudad", self.dia("2026-09-12", []),
                              self.SABADO_1930, alguna_publico_hoy=True)
        self.assertEqual(len(self.v.PROBLEMAS), 1)


class TestPozoVacante(unittest.TestCase):
    """Regla 43: una fila que las dos fuentes dan vacante no es un conflicto.

    Caso real del 13/09/2026, minutos despues del sorteo: Quini 6 3408, los seis numeros y
    todas las demas filas identicos en las dos fuentes, pero la segunda vuelta con 0 ganadores
    valia $2.944.608.430 en A y $2.840.789.977 en B. Cinco corridas seguidas en rojo por una
    cifra que nadie cobra.
    """

    @staticmethod
    def sorteo(premio_segunda, ganadores_segunda=0):
        return {"sorteo": 3408, "fecha": "2026-09-13",
                "modalidades": {
                    "tradicional": {"numeros": [5, 8, 22, 29, 34, 37],
                                    "premios": [{"aciertos": 6, "ganadores": 0, "premio": 2481211505},
                                                {"aciertos": 5, "ganadores": 23, "premio": 2431070}]},
                    "segunda": {"numeros": [4, 20, 25, 31, 39, 42],
                                "premios": [{"aciertos": 6, "ganadores": ganadores_segunda, "premio": premio_segunda},
                                            {"aciertos": 5, "ganadores": 11, "premio": 5083147}]}},
                "proximo": {"sorteo": 3409, "fecha": "2026-09-16", "pozo": 15250000000}}

    def setUp(self):
        self.a = self.sorteo(2944608430)
        self.b = self.sorteo(2840789977)

    def test_compare_sigue_viendo_la_diferencia(self):
        self.assertEqual(common.compare(self.a, self.b), ["modalidades.segunda.premios.6"])

    def test_se_clasifica_como_blanda_y_no_como_conflicto(self):
        duros, blandos = common.clasificar(self.a, self.b, common.compare(self.a, self.b))
        self.assertEqual(duros, [])
        self.assertEqual(blandos, ["modalidades.segunda.premios.6"])

    def test_el_sorteo_se_confirma_igual_y_queda_la_constancia(self):
        with contextlib.redirect_stdout(io.StringIO()):
            out, conflictos = common.build("quini6", {"A": self.a, "B": self.b})
        self.assertEqual(conflictos, [])          # el job no se pone en rojo
        self.assertTrue(out["validado"])          # los numeros coinciden: confirmado
        self.assertEqual(out["fuentes"], ["A", "B"])
        self.assertEqual(out["pozos_en_disputa"], ["modalidades.segunda.premios.6"])

    def test_si_alguien_gano_esa_fila_vuelve_a_ser_conflicto_duro(self):
        # con ganadores > 0 la cifra SI es un premio que alguien cobra: no se puede relajar
        a = self.sorteo(2944608430, ganadores_segunda=1)
        b = self.sorteo(2840789977, ganadores_segunda=1)
        duros, blandos = common.clasificar(a, b, common.compare(a, b))
        self.assertEqual(duros, ["modalidades.segunda.premios.6"])
        self.assertEqual(blandos, [])
        with contextlib.redirect_stdout(io.StringIO()):
            out, conflictos = common.build("quini6", {"A": a, "B": b})
        self.assertEqual(conflictos, ["modalidades.segunda.premios.6"])
        self.assertFalse(out["validado"])

    def test_una_sola_fuente_vacante_no_alcanza(self):
        # si una fuente dice vacante y la otra dice que hubo un ganador, es un conflicto real
        b = self.sorteo(2840789977, ganadores_segunda=2)
        duros, blandos = common.clasificar(self.a, b, common.compare(self.a, b))
        self.assertEqual(blandos, [])
        self.assertEqual(duros, ["modalidades.segunda.premios.6"])

    def test_diferencia_en_los_numeros_nunca_es_blanda(self):
        b = self.sorteo(2944608430)
        b["modalidades"]["segunda"]["numeros"] = [4, 20, 25, 31, 39, 43]
        duros, blandos = common.clasificar(self.a, b, common.compare(self.a, b))
        self.assertEqual(blandos, [])
        self.assertIn("modalidades.segunda.numeros", duros)

    def test_sin_diferencias_no_se_agrega_la_clave(self):
        with contextlib.redirect_stdout(io.StringIO()):
            out, conflictos = common.build("quini6", {"A": self.a, "B": self.a})
        self.assertEqual(conflictos, [])
        self.assertTrue(out["validado"])
        self.assertNotIn("pozos_en_disputa", out)
