// El usuario carga sus 6 números (guardados solo en el dispositivo) y la app marca
// cuáles salieron en cada modalidad del último sorteo. Solo compara: no aconseja.
import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useResultados } from "../../../src/api";
import { Boton, Chip, FilaBolillas, Tarjeta, Vacio } from "../../../src/componentes";
import { Espacio, Radio, usePaleta, useTema } from "../../../src/design";
import { dosDigitos, fechaCorta } from "../../../src/formato";
import { aciertos, useJugadas } from "../../../src/jugadas";
import { JUEGOS, JuegoId, Jugada, Sorteo, esJuego, modalidadesOrdenadas, nombreModalidad } from "../../../src/modelos";

export default function ControlJugada() {
  const { juego } = useLocalSearchParams<{ juego: string }>();
  if (!esJuego(juego)) return <Vacio texto="Juego desconocido." />;
  return <Cuerpo juego={juego} />;
}

function Cuerpo({ juego }: { juego: JuegoId }) {
  const t = useTema();
  const p = usePaleta(juego);
  const r = useResultados();
  const js = useJugadas();
  const [alta, setAlta] = useState(false);
  const sorteo = r.ultimos[juego];
  const lista = js.de(juego);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Controlar jugada",
          headerRight: () => (
            <Pressable onPress={() => setAlta(true)} accessibilityLabel="Agregar jugada" hitSlop={12}>
              <Text style={{ color: p.primario, fontSize: 26, fontWeight: "600" }}>＋</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m }}>
        <Text style={{ color: t.textoSec, fontSize: 13 }}>
          {sorteo ? `Comparando contra el sorteo ${sorteo.sorteo} del ${fechaCorta(sorteo.fecha)}.` : "Sin sorteo cargado para comparar. Las jugadas se guardan igual."}
        </Text>
        {lista.length === 0 && <Vacio texto="No hay jugadas guardadas. Tocá ＋ para cargar tus 6 números." />}
        {lista.map((j) => (
          <FilaJugada key={j.id} jugada={j} sorteo={sorteo} juego={juego} onBorrar={() => js.borrar(j.id)} />
        ))}
        <Text style={{ color: t.textoSec, fontSize: 11, lineHeight: 15 }}>
          Las jugadas quedan guardadas únicamente en este dispositivo. Esta pantalla solo compara números: no recomienda ni sugiere jugadas. Ante cualquier discrepancia vale el extracto oficial.
        </Text>
      </ScrollView>
      <NuevaJugada visible={alta} juego={juego} onCerrar={() => setAlta(false)} onGuardar={(nums, nombre) => js.agregar(juego, nums, nombre)} />
    </>
  );
}

function FilaJugada({ jugada, sorteo, juego, onBorrar }: { jugada: Jugada; sorteo?: Sorteo; juego: JuegoId; onBorrar: () => void }) {
  const t = useTema();
  const p = usePaleta(juego);
  const meta = JUEGOS[juego];
  const hits = sorteo ? aciertos(jugada, sorteo) : {};
  const todos = Array.from(new Set(Object.values(hits).flat()));
  return (
    <Tarjeta style={{ gap: Espacio.s }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: t.texto, fontWeight: "600", fontSize: 16 }}>{jugada.nombre || "Jugada"}</Text>
        <Pressable
          onPress={() => Alert.alert("¿Borrar esta jugada?", undefined, [{ text: "Cancelar", style: "cancel" }, { text: "Borrar", style: "destructive", onPress: onBorrar }])}
          accessibilityLabel="Borrar jugada"
          hitSlop={12}
        >
          <Text style={{ color: t.textoSec, fontSize: 13 }}>Borrar</Text>
        </Pressable>
      </View>
      <FilaBolillas titulo="Tus números" numeros={jugada.numeros} paleta={p} resaltados={todos} />
      {sorteo &&
        modalidadesOrdenadas(sorteo, meta).map(({ clave }) => {
          const h = hits[clave] ?? [];
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
    </Tarjeta>
  );
}

function NuevaJugada({ visible, juego, onCerrar, onGuardar }: { visible: boolean; juego: JuegoId; onCerrar: () => void; onGuardar: (n: number[], nombre: string) => void }) {
  const t = useTema();
  const p = usePaleta(juego);
  const meta = JUEGOS[juego];
  const [nombre, setNombre] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const rango = Array.from({ length: meta.max - meta.min + 1 }, (_, i) => meta.min + i);
  const cerrar = () => {
    setSel([]);
    setNombre("");
    onCerrar();
  };
  const toggle = (n: number) => {
    setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : s.length < 6 ? [...s, n] : s));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={cerrar}>
      <View style={{ flex: 1, backgroundColor: t.fondo }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Espacio.m }}>
          <Pressable onPress={cerrar} hitSlop={12} accessibilityRole="button">
            <Text style={{ color: p.primario, fontSize: 16 }}>Cancelar</Text>
          </Pressable>
          <Text style={{ color: t.texto, fontWeight: "600", fontSize: 16 }}>Nueva jugada · {meta.nombre}</Text>
          <Pressable
            onPress={() => {
              onGuardar(sel, nombre);
              cerrar();
            }}
            disabled={sel.length !== 6}
            hitSlop={12}
            accessibilityRole="button"
          >
            <Text style={{ color: p.primario, fontSize: 16, fontWeight: "700", opacity: sel.length === 6 ? 1 : 0.4 }}>Guardar</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m }}>
          <TextInput
            placeholder="Nombre (opcional)"
            placeholderTextColor={t.textoSec}
            value={nombre}
            onChangeText={setNombre}
            style={{ backgroundColor: t.superficie, color: t.texto, padding: 12, borderRadius: Radio.chip, borderWidth: 1, borderColor: t.borde, fontSize: 16 }}
          />
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
                    width: 46,
                    height: 46,
                    borderRadius: 23,
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
            <Boton titulo="Guardar jugada" color={p.primario} relleno disabled={sel.length !== 6} onPress={() => { onGuardar(sel, nombre); cerrar(); }} />
          </View>
          <Chip texto="Solo compara números. No recomienda jugadas." color={t.textoSec} />
        </ScrollView>
      </View>
    </Modal>
  );
}
