// Detalle de una reunión de turf: cada carrera con su ganador, segundo, tercero y los dividendos.
//
// La fuente es el parte oficial del hipódromo, una sola. No se reusa el sello de "2 fuentes":
// le corresponde "Fuente oficial", que dice más y es cierto.
import React from "react";
import { Alert, Pressable, View } from "react-native";
import { Text } from "./texto";
import { Espacio, Paleta, useTema } from "./design";
import { fechaLarga } from "./formato";
import { Carrera, PUESTOS, Reunion, TURF } from "./modelos";
import { Tarjeta } from "./componentes";

export function paletaTurf(oscuro: boolean): Paleta {
  return oscuro
    ? { primario: "#C8A96A", secundario: "#8FB8A0", bolilla: "#3A3020", textoBolilla: "#F6EEDC", fondoTarjeta: "#241E14" }
    : { primario: "#7A5C18", secundario: "#2F6B4F", bolilla: "#F0E4C6", textoBolilla: "#3A2D0B", fondoTarjeta: "#FBF6EA" };
}

/** Un dividendo del turf: "2.05" es lo que paga cada peso apostado, con centavos. */
export function dividendo(n: number): string {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Sello de fuente propio del turf. Una sola fuente, pero es la oficial del hipódromo. */
export function ChipOficial({ color }: { color: string }) {
  const texto = `Fuente oficial: ${TURF.fuente}`;
  return (
    <Pressable
      onPress={() =>
        Alert.alert(
          texto,
          `Los resultados y dividendos salen del parte oficial que publica el ${TURF.fuente}.\n\n` +
            "No se cruzan con un segundo sitio como los de la lotería, porque no hace falta: " +
            "esta es la fuente de la que copian los demás.\n\n" +
            "Ante cualquier discrepancia vale el parte oficial.",
        )
      }
      accessibilityRole="button"
      accessibilityLabel={`${texto}. Tocá para saber qué significa`}
      hitSlop={6}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: "flex-start" })}
    >
      <View
        style={{
          backgroundColor: color + "24",
          paddingHorizontal: Espacio.s,
          paddingVertical: Espacio.xs,
          borderRadius: 999,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Text style={{ color, fontSize: 12, fontWeight: "600" }}>{texto}</Text>
        <Text style={{ color, fontSize: 11 }}>ⓘ</Text>
      </View>
    </Pressable>
  );
}

function FilaPosicion({ p, paleta }: { p: Reunion["carreras"][number]["posiciones"][number]; paleta: Paleta }) {
  const t = useTema();
  // El ganador cobra a ganador, segundo y tercero; el segundo a segundo y tercero; el tercero solo
  // a tercero. Por eso los dividendos vienen alineados al final y hay que etiquetarlos al revés.
  const etiquetas = ["Ganador", "Segundo", "Tercero"].slice(3 - p.dividendos.length);
  return (
    <View
      style={{ flexDirection: "row", alignItems: "flex-start", gap: Espacio.s, paddingVertical: 6 }}
      accessible
      accessibilityLabel={
        `${PUESTOS[p.puesto] ?? p.puesto}: ${p.competidor}, número ${p.orden ?? "sin dato"}. ` +
        etiquetas.map((e, i) => `${e} paga ${dividendo(p.dividendos[i])}`).join(", ")
      }
    >
      <View style={{ minWidth: 30, height: 30, borderRadius: 15, backgroundColor: paleta.bolilla, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
        <Text style={{ color: paleta.textoBolilla, fontWeight: "700", fontSize: 14, fontVariant: ["tabular-nums"] }}>{p.orden ?? "–"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.texto, fontWeight: p.puesto === "GAN" ? "700" : "500", fontSize: 15 }}>{p.competidor}</Text>
        <Text style={{ color: t.textoSec, fontSize: 12 }}>
          {PUESTOS[p.puesto] ?? p.puesto}
          {p.dividendos.length > 0 && " · " + etiquetas.map((e, i) => `${e} ${dividendo(p.dividendos[i])}`).join(" · ")}
        </Text>
      </View>
    </View>
  );
}

function TarjetaCarrera({ c, paleta }: { c: Carrera; paleta: Paleta }) {
  const t = useTema();
  return (
    <Tarjeta fondo={paleta.fondoTarjeta} style={{ borderColor: paleta.primario + "40", gap: Espacio.xs }}>
      <Text style={{ color: paleta.primario, fontSize: 16, fontWeight: "700" }}>{c.numero}ª carrera</Text>
      <View style={{ borderTopWidth: 1, borderTopColor: t.borde }}>
        {c.posiciones.map((p) => (
          <FilaPosicion key={p.puesto} p={p} paleta={paleta} />
        ))}
      </View>
      {c.apuestas.length > 0 && (
        <View style={{ borderTopWidth: 1, borderTopColor: t.borde, paddingTop: Espacio.xs, gap: 2 }}>
          {c.apuestas.map((a, i) => (
            <View
              key={`${a.apuesta}-${i}`}
              style={{ flexDirection: "row", justifyContent: "space-between", gap: Espacio.s }}
              accessible
              accessibilityLabel={`${a.apuesta}, marcador ${a.marcador || "sin marcador"}, paga ${dividendo(a.dividendo)}`}
            >
              <Text style={{ color: t.textoSec, fontSize: 13, flex: 1 }}>
                {a.apuesta}
                {a.marcador ? ` · ${a.marcador}` : ""}
              </Text>
              <Text style={{ color: t.texto, fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{dividendo(a.dividendo)}</Text>
            </View>
          ))}
        </View>
      )}
    </Tarjeta>
  );
}

export function ReunionDetalle({ reunion }: { reunion: Reunion }) {
  const t = useTema();
  const p = paletaTurf(t.oscuro);
  return (
    <View style={{ gap: Espacio.m }}>
      <View style={{ gap: Espacio.xs }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Espacio.s }}>
          <Text style={{ color: p.primario, fontSize: 22, fontWeight: "700" }}>{reunion.nombre}</Text>
          <Text style={{ color: t.textoSec, fontSize: 13 }}>Reunión {reunion.reunion}</Text>
        </View>
        <Text style={{ color: t.textoSec, fontSize: 14 }}>
          {fechaLarga(reunion.fecha)} · {reunion.carreras.length} carreras
        </Text>
        <ChipOficial color={p.primario} />
      </View>
      {reunion.carreras.map((c) => (
        <TarjetaCarrera key={c.numero} c={c} paleta={p} />
      ))}
    </View>
  );
}
