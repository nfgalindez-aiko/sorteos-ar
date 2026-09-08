// Render de un sorteo de la Poceada: 20 números de dos cifras, letras, tabla de premios y próximo pozo.
import React from "react";
import { Text, View } from "react-native";
import { Chip, CuentaRegresiva, Tarjeta } from "./componentes";
import { Espacio, Paleta, useTema } from "./design";
import { entero, fechaLarga, instanteSorteo, pesos } from "./formato";
import { POCEADA, Poceada } from "./modelos";

export function paletaPoceada(oscuro: boolean): Paleta {
  return oscuro
    ? { primario: "#7FD1C7", secundario: "#F2C14E", bolilla: "#1F4A45", textoBolilla: "#EAFFFB", fondoTarjeta: "#12312D" }
    : { primario: "#0F6E63", secundario: "#B8860B", bolilla: "#D6F3EE", textoBolilla: "#0B3A35", fondoTarjeta: "#EDF9F7" };
}

export function PoceadaDetalle({ sorteo }: { sorteo: Poceada }) {
  const t = useTema();
  const p = paletaPoceada(t.oscuro);
  const prox = sorteo.proximo;
  const objetivo = prox?.fecha ? instanteSorteo(prox.fecha, POCEADA.hora) : null;
  return (
    <View style={{ gap: Espacio.m }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} accessible>
        <View>
          <Text style={{ color: t.texto, fontSize: 20, fontWeight: "700" }}>Sorteo {sorteo.sorteo}</Text>
          <Text style={{ color: t.textoSec, fontSize: 14 }}>{fechaLarga(sorteo.fecha)}</Text>
        </View>
        {sorteo.validado ? <Chip texto="2 fuentes" color={p.primario} /> : <Chip texto="1 fuente" color={t.aviso} />}
      </View>

      <Tarjeta fondo={p.fondoTarjeta} style={{ gap: Espacio.s }}>
        <Text style={{ color: p.primario, fontWeight: "600" }}>Números sorteados</Text>
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: Espacio.s }}
          accessible
          accessibilityLabel={`Números sorteados: ${sorteo.numeros.join(", ")}`}
        >
          {sorteo.numeros.map((n) => (
            <View key={n} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: p.bolilla, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: p.textoBolilla, fontWeight: "800", fontSize: 18, fontVariant: ["tabular-nums"] }}>{n}</Text>
            </View>
          ))}
        </View>
        {sorteo.letras && (
          <Text style={{ color: t.textoSec, fontSize: 13 }}>
            Letras: <Text style={{ color: t.texto, fontWeight: "600", letterSpacing: 2 }}>{sorteo.letras}</Text>
          </Text>
        )}
      </Tarjeta>

      <Tarjeta fondo={p.fondoTarjeta} style={{ gap: Espacio.xs }}>
        <View style={{ flexDirection: "row" }}>
          {["Aciertos", "Ganadores", "Premio"].map((h, i) => (
            <Text key={h} style={{ flex: 1, textAlign: i === 0 ? "left" : "right", color: t.textoSec, fontSize: 12, fontWeight: "600" }}>{h}</Text>
          ))}
        </View>
        {sorteo.premios.map((f) => (
          <View key={f.aciertos} style={{ flexDirection: "row" }} accessible accessibilityLabel={`${f.aciertos} aciertos, ${f.ganadores === 0 ? "vacante" : `${f.ganadores} ganadores`}, ${f.nota ?? `premio ${pesos(f.premio)}`}`}>
            <Text style={{ flex: 1, color: t.texto, fontSize: 14, fontVariant: ["tabular-nums"] }}>{f.aciertos}</Text>
            <Text style={{ flex: 1, textAlign: "right", color: t.texto, fontSize: 14, fontVariant: ["tabular-nums"] }}>{f.ganadores === 0 ? "Vacante" : entero(f.ganadores)}</Text>
            <Text style={{ flex: 1, textAlign: "right", color: t.texto, fontSize: 14, fontVariant: ["tabular-nums"] }}>{f.nota ? "Recuperan la apuesta" : pesos(f.premio)}</Text>
          </View>
        ))}
      </Tarjeta>

      {prox && (prox.fecha || prox.pozo != null) && (
        <Tarjeta fondo={p.secundario + "1F"}>
          <View style={{ gap: Espacio.xs }} accessible>
            <Text style={{ color: p.secundario, fontWeight: "600" }}>Próximo sorteo</Text>
            {prox.sorteo && prox.fecha && (
              <Text style={{ color: t.texto, fontSize: 13 }}>Nº {prox.sorteo} · {fechaLarga(prox.fecha)} · {POCEADA.hora} hs</Text>
            )}
            {prox.pozo != null && <Text style={{ color: t.texto, fontWeight: "600" }}>Pozo estimado: {pesos(prox.pozo)}</Text>}
            {objetivo && <CuentaRegresiva objetivo={objetivo} />}
          </View>
        </Tarjeta>
      )}
      <Text style={{ color: t.textoSec, fontSize: 12, lineHeight: 16 }}>
        La Poceada se resuelve con la nocturna de la Quiniela de la Ciudad: la app la confirma cruzando los números con ese extracto.
      </Text>
    </View>
  );
}
