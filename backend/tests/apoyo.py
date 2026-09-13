# Sorteos AR - utilidades compartidas de los tests.
#
# Varios tests simulan a proposito casos rotos: MISMATCH entre fuentes, desfasaje, conflicto.
# Esos mensajes NO pueden salir por stdout ni escribir backend/scraper.log. En el log de GitHub
# Actions se leen igual que un problema real de produccion y ya hicieron perder tiempo buscando
# un sorteo roto que nunca existio (reglas 20 y 37 de ESTADO.md).
#
# Usar SIEMPRE este contexto en un test que llame a algo que loguee o escriba en data/.
import contextlib, io, os, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import common


@contextlib.contextmanager
def entorno(datos=True):
    """common.LOG (y opcionalmente common.DATA) en un temporal, con stdout silenciado.

    Devuelve la carpeta temporal. `datos=False` cuando el test solo loguea y no escribe JSON.
    """
    with tempfile.TemporaryDirectory() as tmp:
        viejo = common.DATA, common.LOG
        common.LOG = os.path.join(tmp, "log")
        if datos:
            common.DATA = tmp
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                yield tmp
        finally:
            common.DATA, common.LOG = viejo
