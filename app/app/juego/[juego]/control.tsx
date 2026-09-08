// El usuario carga sus 6 números (guardados solo en el dispositivo). Cada jugada queda atada a un
// sorteo ("para el sorteo 3407") o marcada como "la juego siempre". Cuando sale su sorteo, el
// resultado se congela y la jugada pasa a "Anteriores", con opción de repetirla. Solo compara: no aconseja.
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { Text, useEscala } from "../../../src/texto";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useResultados } from "../../../src/api";
import { Boton, Chip, FilaBolillas, Tarjeta, Vacio } from "../../../src/componentes";
import { Espacio, Radio, usePaleta, useTema } from "../../../src/design";
import { dosDigitos, fechaCorta, fechaLarga } from "../../../src/formato";
import { aciertos, useJugadas } from "../../../src/jugadas";
import { JUEGOS, JuegoId, Jugada, ResultadoJugada, Sorteo, esJuego, nombreModalidad } from "../../../src/modelos";

export default function ControlJugada() {
  const { juego } = useLocalSearchParams<{ juego: string }>();
  if (!esJuego(juego)) return <Vacio texto="Juego desconocido." />;
  return <Cuerpo juego={juego} />;
}

/** Cómo se muestra una jugada según su objetivo y el último sorteo publicado. */
type Estado =
  | { tipo: "siempre" }
  | { tipo: "pendiente"; objetivo: number }
  | { tipo: "resuelta"; resultado: ResultadoJugada };

function estadoDe(j: Jugada, ultimo?: Sorteo): Estado {
  if (j.objetivo == null) return { tipo: "siempre" };
  if (j.resultado) return { tipo: "resuelta", resultado: j.resultado };
  if (ultimo && ultimo.sorteo >= j.objetivo) {
    // el sorteo ya salió pero todavía no se congeló (se resuelve en el efecto de abajo)
    return { tipo: "pendiente", objetivo: j.objetivo };
  }
  return { tipo: "pendiente", objetivo: j.objetivo };
}

function Cuerpo({ juego }: { juego: JuegoId }) {
  const t = useTema();
  const p = usePaleta(juego);
  const r = useResultados();
  const js = useJugadas();
  const [alta, setAlta] = useState<{ numeros?: number[]; nombre?: string } | null>(null);
  const router = useRouter();
  const ultimo = r.ultimos[juego];
  const lista = js.de(juego);
  const proximoSorteo = ultimo?.proximo?.sorteo ?? (ultimo ? ultimo.sorteo + 1 : null);

  // Congelar el resultado de las jugadas cuyo sorteo objetivo ya salió.
  useEffect(() => {
    if (!ultimo) return;
    const porResolver = lista.filter((j) => j.objetivo != null && !j.resultado && ultimo.sorteo >= (j.objetivo as number));
    if (porResolver.length === 0) return;
    let vivo = true;
    (async () => {
      for (const j of porResolver) {
        const n = j.objetivo as number;
        try {
          const s = n === ultimo.sorteo ? ultimo : await r.sorteo(juego, n);
          if (!vivo) return;
          await js.actualizar(j.id, { resultado: { sorteo: s.sorteo, fecha: s.fecha, aciertos: aciertos(j, s) } });
        } catch {
          /* sin red o sorteo no publicado: se reintenta en la próxima apertura */
        }
      }
    })();
    return () => {
      vivo = false;
    };
  }, [ultimo, lista, juego, r, js]);

  const { vigentes, anteriores } = useMemo(() => {
    const v: Jugada[] = [], a: Jugada[] = [];
    for (const j of lista) (estadoDe(j, ultimo).tipo === "resuelta" ? a : v).push(j);
    a.sort((x, y) => (y.resultado?.sorteo ?? 0) - (x.resultado?.sorteo ?? 0));
    return { vigentes: v, anteriores: a };
  }, [lista, ultimo]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Controlar jugada",
          headerRight: () => (
            <Pressable onPress={() => setAlta({})} accessibilityLabel="Agregar jugada" hitSlop={12}>
              <Text style={{ color: p.primario, fontSize: 26, fontWeight: "600" }}>＋</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m }}>
        <View style={{ flexDirection: "row" }}>
          <Boton titulo="Nueva jugada" color={p.primario} relleno onPress={() => setAlta({})} />
        </View>
        <Text style={{ color: t.textoSec, fontSize: 13 }}>
          {ultimo
            ? `Último sorteo publicado: ${ultimo.sorteo} (${fechaCorta(ultimo.fecha)}).${proximoSorteo ? ` Próximo: ${proximoSorteo}.` : ""}`
            : "Sin sorteo cargado para comparar. Las jugadas se guardan igual."}
        </Text>

        {vigentes.length === 0 && anteriores.length === 0 && <Vacio texto="No hay jugadas guardadas. Tocá ＋ para cargar tus 6 números." />}

        {vigentes.map((j) => (
          <FilaJugada key={j.id} jugada={j} estado={estadoDe(j, ultimo)} ultimo={ultimo} juego={juego} onBorrar={() => js.borrar(j.id)} onRepetir={() => setAlta({ numeros: j.numeros, nombre: j.nombre })} />
        ))}

        {anteriores.length > 0 && (
          <>
            <Text style={{ color: t.textoSec, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginTop: Espacio.s }}>Anteriores</Text>
            {anteriores.map((j) => (
              <FilaJugada key={j.id} jugada={j} estado={estadoDe(j, ultimo)} ultimo={ultimo} juego={juego} onBorrar={() => js.borrar(j.id)} onRepetir={() => setAlta({ numeros: j.numeros, nombre: j.nombre })} />
            ))}
          </>
        )}

        <Text style={{ color: t.textoSec, fontSize: 11, lineHeight: 15 }}>
          Las jugadas quedan guardadas únicamente en este dispositivo. Esta pantalla solo compara números: no recomienda ni sugiere jugadas. Ante cualquier discrepancia vale el extracto oficial.
        </Text>
        <View style={{ flexDirection: "row" }}>
          <Boton titulo="¿Ves algún error? Dejámelo acá" color={t.textoSec} onPress={() => router.push(`/reporte?pantalla=control&juego=${juego}&sorteo=${ultimo?.sorteo ?? ""}`)} />
        </View>
      </ScrollView>
      <NuevaJugada
        visible={alta !== null}
        juego={juego}
        proximoSorteo={proximoSorteo}
        inicial={alta ?? undefined}
        onCerrar={() => setAlta(null)}
        onGuardar={(nums, nombre, objetivo) => js.agregar(juego, nums, nombre, objetivo)}
      />
    </>
  );
}

function FilaJugada({ jugada, estado, ultimo, juego, onBorrar, onRepetir }: { jugada: Jugada; estado: Estado; ultimo?: Sorteo; juego: JuegoId; onBorrar: () => void; onRepetir: () => void }) {
  const t = useTema();
  const p = usePaleta(juego);
  const meta = JUEGOS[juego];

  // contra qué se compara y qué aciertos se muestran
  let titulo = "";
  let hits: Record<string, number[]> | null = null;
  let modalidades: string[] = [];
  if (estado.tipo === "siempre") {
    titulo = ultimo ? `Contra el sorteo ${ultimo.sorteo} del ${fechaCorta(ultimo.fecha)} · la jugás siempre` : "La jugás siempre";
    if (ultimo) {
      hits = aciertos(jugada, ultimo);
      modalidades = meta.modalidades.filter((m) => ultimo.modalidades[m]);
    }
  } else if (estado.tipo === "resuelta") {
    titulo = `Sorteo ${estado.resultado.sorteo} · ${fechaLarga(estado.resultado.fecha)}`;
    hits = estado.resultado.aciertos;
    modalidades = meta.modalidades.filter((m) => hits && hits[m]);
  } else {
    titulo = `Para el sorteo ${estado.objetivo}${ultimo && ultimo.sorteo >= estado.objetivo ? " · buscando el resultado…" : " · todavía no se sorteó"}`;
  }
  const todos = hits ? Array.from(new Set(Object.values(hits).flat())) : [];
  const mejor = hits ? Math.max(0, ...Object.values(hits).map((h) => h.length)) : 0;

  return (
    <Tarjeta style={{ gap: Espacio.s, opacity: estado.tipo === "resuelta" ? 0.92 : 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: t.texto, fontWeight: "600", fontSize: 16 }}>{jugada.nombre || "Jugada"}</Text>
        <View style={{ flexDirection: "row", gap: Espacio.m }}>
          <Pressable onPress={onRepetir} accessibilityLabel="Repetir esta jugada para el próximo sorteo" hitSlop={12}>
            <Text style={{ color: p.primario, fontSize: 13, fontWeight: "600" }}>Repetir</Text>
          </Pressable>
          <Pressable
            onPress={() => Alert.alert("¿Borrar esta jugada?", undefined, [{ text: "Cancelar", style: "cancel" }, { text: "Borrar", style: "destructive", onPress: onBorrar }])}
            accessibilityLabel="Borrar jugada"
            hitSlop={12}
          >
            <Text style={{ color: t.textoSec, fontSize: 13 }}>Borrar</Text>
          </Pressable>
        </View>
      </View>
      <Text style={{ color: t.textoSec, fontSize: 12 }}>{titulo}</Text>
      <FilaBolillas titulo="Tus números" numeros={jugada.numeros} paleta={p} resaltados={todos} />
      {hits &&
        modalidades.map((clave) => {
          const h = hits![clave] ?? [];
          const fuerte = h.length >= 4;
          return (
            <View key={clave} style={{ flexDirection: "row", justifyContent: "space-between" }} accessible>
              <Text style={{ color: t.texto, fontSize: 14 }}>{nombreModalidad(clave)}</Text>
              <Text style={{ color: fuerte ? p.primario : t.textoSec, fontWeight: fuerte ? "700" : "400", fontSize: 14 }}>
                {h.length === 0 ? "0 aciertos" : `${h.length} ${h.length === 1 ? "acierto" : "aciertos"}: ${h.join(", ")}`}
              </Text>
            </View>
          );
        })}
      {estado.tipo === "resuelta" && mejor >= 4 && <Chip texto={`Mejor: ${mejor} aciertos. Verificá con el extracto oficial.`} color={p.primario} />}
    </Tarjeta>
  );
}

/** Alta de jugada: grilla de números del rango del juego, se eligen exactamente 6, y para qué sorteo va. */
function NuevaJugada({ visible, juego, proximoSorteo, inicial, onCerrar, onGuardar }: {
  visible: boolean;
  juego: JuegoId;
  proximoSorteo: number | null;
  inicial?: { numeros?: number[]; nombre?: string };
  onCerrar: () => void;
  onGuardar: (n: number[], nombre: string, objetivo: number | null) => void;
}) {
  const t = useTema();
  const p = usePaleta(juego);
  const meta = JUEGOS[juego];
  const [nombre, setNombre] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [siempre, setSiempre] = useState(false);
  const esc = useEscala();
  const celda = 46 * esc;
  const rango = Array.from({ length: meta.max - meta.min + 1 }, (_, i) => meta.min + i);

  useEffect(() => {
    if (visible) {
      setSel(inicial?.numeros ?? []);
      setNombre(inicial?.nombre ?? "");
      setSiempre(false);
    }
  }, [visible, inicial]);

  const cerrar = () => onCerrar();
  const toggle = (n: number) => setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : s.length < 6 ? [...s, n] : s));
  const guardar = () => {
    onGuardar(sel, nombre, siempre ? null : proximoSorteo);
    cerrar();
  };
  const lista = siempre ? "Se compara con cada sorteo nuevo." : proximoSorteo ? `Queda para el sorteo ${proximoSorteo}; cuando salga, el resultado se guarda.` : "Sin próximo sorteo cargado: se compara con el último.";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={cerrar}>
      <View style={{ flex: 1, backgroundColor: t.fondo }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Espacio.m }}>
          <Pressable onPress={cerrar} hitSlop={12} accessibilityRole="button">
            <Text style={{ color: p.primario, fontSize: 16 }}>Cancelar</Text>
          </Pressable>
          <Text style={{ color: t.texto, fontWeight: "600", fontSize: 16 }}>Nueva jugada · {meta.nombre}</Text>
          <Pressable onPress={guardar} disabled={sel.length !== 6} hitSlop={12} accessibilityRole="button">
            <Text style={{ color: p.primario, fontSize: 16, fontWeight: "700", opacity: sel.length === 6 ? 1 : 0.4 }}>Guardar</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m }}>
          <TextInput
            allowFontScaling={false}
            placeholder="Nombre (opcional)"
            placeholderTextColor={t.textoSec}
            value={nombre}
            onChangeText={setNombre}
            style={{ backgroundColor: t.superficie, color: t.texto, padding: 12, borderRadius: Radio.chip, borderWidth: 1, borderColor: t.borde, fontSize: 16 * esc }}
          />
          <Tarjeta style={{ gap: Espacio.xs }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: t.texto, fontSize: 15, fontWeight: "600" }}>La juego siempre</Text>
              <Switch value={siempre} onValueChange={setSiempre} trackColor={{ true: p.primario }} accessibilityLabel="La juego siempre" />
            </View>
            <Text style={{ color: t.textoSec, fontSize: 12 }}>{lista}</Text>
          </Tarjeta>
          <Text style={{ color: t.textoSec, fontSize: 13 }}>
            Elegí 6 números del {meta.min} al {meta.max}. Seleccionados: {sel.length} de 6.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Espacio.s }}>
            {rango.map((n) => {
              const activo = sel.includes(n);
              const bloqueado = !activo && sel.length >= 6;
              return (
                <Pressable
                  key={n}
                  onPress={() => toggle(n)}
                  disabled={bloqueado}
                  accessibilityRole="button"
                  accessibilityLabel={`Número ${n}`}
                  accessibilityState={{ selected: activo, disabled: bloqueado }}
                  style={{
                    width: celda,
                    height: celda,
                    borderRadius: celda / 2,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: activo ? p.bolilla : t.superficie,
                    borderWidth: 1,
                    borderColor: activo ? p.bolilla : t.borde,
                    opacity: bloqueado ? 0.4 : 1,
                  }}
                >
                  <Text style={{ color: activo ? p.textoBolilla : t.texto, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{dosDigitos(n)}</Text>
                </Pressable>
              );
            })}
          </View>
          {sel.length === 6 && <FilaBolillas titulo="Tu jugada" numeros={[...sel].sort((a, b) => a - b)} paleta={p} />}
          <View style={{ flexDirection: "row" }}>
            <Boton titulo="Guardar jugada" color={p.primario} relleno disabled={sel.length !== 6} onPress={guardar} />
          </View>
          <Chip texto="Solo compara números. No recomienda jugadas." color={t.textoSec} />
        </ScrollView>
      </View>
    </Modal>
  );
}
