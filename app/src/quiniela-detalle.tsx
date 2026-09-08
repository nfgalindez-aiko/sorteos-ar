// Render de un día de quiniela: cada turno con sus 20 números (1-10 y 11-20), cabeza destacada y letras.
import React from "react";
import { Text, View } from "react-native";
import { ChipFuentes, Tarjeta } from "./componentes";
import { Espacio, Paleta, useTema } from "./design";
import { fechaLarga } from "./formato";
import { DiaQuiniela, TurnoQuiniela, nombreTurno } from "./modelos";

/** Paleta neutra para quinielas (no pertenecen a un solo juego ni a un solo organismo). */
export function paletaQuiniela(oscuro: boolean): Paleta {
  return oscuro
    ? { primario: "#C9A9FF", secundario: "#7FD1C7", bolilla: "#3A2F5C", textoBolilla: "#F0F2EF", fondoTarjeta: "#211B33" }
    : { primario: "#5B3FA6", secundario: "#0F8C7E", bolilla: "#EDE6FF", textoBolilla: "#2A1D52", fondoTarjeta: "#F4F0FF" };
}

export function QuinielaDia({ dia }: { dia: DiaQuiniela }) {
  const t = useTema();
  const p = paletaQuiniela(t.oscuro);
  return (
    <View style={{ gap: Espacio.m }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} accessible>
        <View>
          <Text style={{ color: t.texto, fontSize: 20, fontWeight: "700" }}>{dia.nombre}</Text>
          <Text style={{ color: t.textoSec, fontSize: 14 }}>{fechaLarga(dia.fecha)}</Text>
        </View>
      </View>
      {dia.turnos.map((turno) => (
        <TurnoView key={turno.turno} turno={turno} paleta={p} />
      ))}
      {dia.turnos.length === 0 && <Text style={{ color: t.textoSec }}>Todavía no hay sorteos publicados para este día.</Text>}
    </View>
  );
}

function TurnoView({ turno, paleta }: { turno: TurnoQuiniela; paleta: Paleta }) {
  const t = useTema();
  const nums = turno.numeros;
  const etiqueta = `${nombreTurno(turno.turno)}${turno.hora ? ` ${turno.hora} hs` : ""}`;
  return (
    <Tarjeta fondo={paleta.fondoTarjeta} style={{ gap: Espacio.s }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: paleta.primario, fontWeight: "700", fontSize: 16 }}>{etiqueta}</Text>
        <ChipFuentes fuentes={turno.fuentes} validado={turno.validado} conflicto={!!turno.conflicto} color={paleta.primario} />
      </View>
      {nums ? (
        <>
          <View
            accessible
            accessibilityLabel={`${etiqueta}. A la cabeza ${nums[0]}. Números: ${nums.map((n, i) => `${i + 1}: ${n}`).join(", ")}`}
            style={{ flexDirection: "row", gap: Espacio.m }}
          >
            {[0, 10].map((base) => (
              <View key={base} style={{ flex: 1, gap: 4 }}>
                {nums.slice(base, base + 10).map((n, i) => {
                  const pos = base + i + 1;
                  const cabeza = pos === 1;
                  return (
                    <View key={pos} style={{ flexDirection: "row", alignItems: "center", gap: Espacio.s }}>
                      <Text style={{ width: 22, textAlign: "right", color: t.textoSec, fontSize: 12, fontVariant: ["tabular-nums"] }}>{pos}</Text>
                      <View
                        style={{
                          flex: 1,
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          borderRadius: 8,
                          backgroundColor: cabeza ? paleta.primario : paleta.bolilla,
                        }}
                      >
                        <Text
                          style={{
                            color: cabeza ? "#FFFFFF" : paleta.textoBolilla,
                            fontWeight: cabeza ? "800" : "600",
                            fontSize: cabeza ? 18 : 16,
                            fontVariant: ["tabular-nums"],
                            letterSpacing: 1,
                          }}
                        >
                          {n}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
          {turno.letras && (
            <Text style={{ color: t.textoSec, fontSize: 13 }}>
              Letras: <Text style={{ color: t.texto, fontWeight: "600", letterSpacing: 2 }}>{turno.letras}</Text>
            </Text>
          )}
        </>
      ) : (
        <Text style={{ color: t.textoSec, fontSize: 13 }}>
          Las dos fuentes publicaron extractos distintos para este turno. No se muestran números hasta que coincidan. Vale el extracto oficial.
        </Text>
      )}
    </Tarjeta>
  );
}
