// Botón de compartir. Arma el texto del resultado y abre la hoja de compartir de iOS.
//
// El texto sale listo para pegar en WhatsApp, que es donde va a terminar. Lleva el nombre del
// sorteo, los números y el link a la app. No lleva nada de la persona ni de sus jugadas.
import React from "react";
import { Pressable, Share, View } from "react-native";
import { Text } from "./texto";
import { Espacio, useTema } from "./design";
import { fechaLarga } from "./formato";
import { dosDigitos } from "./formato";
import { DiaQuiniela, JUEGOS, JuegoId, Poceada, Reunion, Sorteo, TURF, nombreTurno } from "./modelos";

/** Link de la app en la App Store, para que el que recibe el mensaje sepa de dónde salió. */
export const APP_URL = "https://apps.apple.com/ar/app/sorteos-ar/id6809660906";

function pie(): string {
  return `\n\nSorteos AR · ${APP_URL}`;
}

export function textoSorteo(s: Sorteo): string {
  const meta = JUEGOS[s.juego as JuegoId];
  const lineas = Object.entries(s.modalidades).map(
    ([nombre, m]) => `${nombre.replace(/_/g, " ")}: ${m.numeros.map(dosDigitos).join(" ")}`,
  );
  return `${meta?.nombre ?? s.juego} · Sorteo ${s.sorteo} · ${fechaLarga(s.fecha)}\n${lineas.join("\n")}${pie()}`;
}

export function textoPoceada(p: Poceada): string {
  return `Poceada · Sorteo ${p.sorteo} · ${fechaLarga(p.fecha)}\n${p.numeros.join(" ")}${
    p.letras ? `\nLetras: ${p.letras}` : ""
  }${pie()}`;
}

export function textoQuinielaTurno(dia: DiaQuiniela, turno: string, provincia: string): string {
  const t = dia.turnos.find((x) => x.turno === turno);
  const nums = t?.numeros ?? [];
  return `Quiniela ${provincia} · ${nombreTurno(turno)} · ${fechaLarga(dia.fecha)}\n${nums.join(
    " ",
  )}${pie()}`;
}

export function textoReunion(r: Reunion): string {
  const lineas = r.carreras.map((c) => {
    const g = c.posiciones.find((p) => p.puesto === "GAN");
    return `${c.numero}ª: ${g ? `${g.competidor} (${g.orden ?? "-"})` : "sin datos"}`;
  });
  return `${TURF.nombre} · Reunión ${r.reunion} · ${fechaLarga(r.fecha)}\n${lineas.join("\n")}${pie()}`;
}

export async function compartir(texto: string): Promise<void> {
  try {
    await Share.share({ message: texto });
  } catch {
    /* si la persona cancela, no hay nada que hacer */
  }
}

/** Botón discreto, del color del juego. Se pone al lado del título del resultado. */
export function BotonCompartir({ texto, color, etiqueta = "Compartir" }: { texto: string; color: string; etiqueta?: string }) {
  const t = useTema();
  return (
    <Pressable
      onPress={() => compartir(texto)}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint="Abre las opciones para compartir este resultado"
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          borderWidth: 1,
          borderColor: t.borde,
          borderRadius: 999,
          paddingHorizontal: Espacio.s,
          paddingVertical: Espacio.xs,
        }}
      >
        <Text style={{ color, fontSize: 13 }}>↗</Text>
        <Text style={{ color, fontSize: 12, fontWeight: "600" }}>{etiqueta}</Text>
      </View>
    </Pressable>
  );
}
