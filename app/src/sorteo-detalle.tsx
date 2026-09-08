// Render de un sorteo completo (lo usan el detalle del último y el histórico).
import React from "react";
import { View } from "react-native";
import { Text } from "./texto";
import { ChipFuentes, CuentaRegresiva, FilaBolillas, PremiosTabla, Tarjeta } from "./componentes";
import { Espacio, usePaleta, useTema } from "./design";
import { entero, fechaLarga, instanteSorteo, pesos } from "./formato";
import { JUEGOS, JuegoId, Sorteo, modalidadesOrdenadas, nombreModalidad } from "./modelos";

export function SorteoDetalle({ juego, sorteo }: { juego: JuegoId; sorteo: Sorteo }) {
  const t = useTema();
  const p = usePaleta(juego);
  const meta = JUEGOS[juego];
  const prox = sorteo.proximo;
  const objetivo = prox?.fecha ? instanteSorteo(prox.fecha, meta.hora) : null;

  return (
    <View style={{ gap: Espacio.m }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }} accessible>
        <View>
          <Text style={{ color: t.texto, fontSize: 20, fontWeight: "700" }}>Sorteo {sorteo.sorteo}</Text>
          <Text style={{ color: t.textoSec, fontSize: 14 }}>{fechaLarga(sorteo.fecha)}</Text>
        </View>
        <ChipFuentes fuentes={sorteo.fuentes} validado={sorteo.validado} color={p.primario} />
      </View>

      {modalidadesOrdenadas(sorteo, meta).map(({ clave, modalidad }) => (
        <Tarjeta key={clave} fondo={p.fondoTarjeta}>
          <View style={{ gap: Espacio.s }}>
            <FilaBolillas titulo={nombreModalidad(clave)} numeros={modalidad.numeros} paleta={p} />
            <PremiosTabla premios={modalidad.premios} />
          </View>
        </Tarjeta>
      ))}

      {sorteo.numero_plus != null && (
        <Tarjeta fondo={p.fondoTarjeta}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} accessible accessibilityLabel={`Número Plus ${sorteo.numero_plus}`}>
            <Text style={{ color: p.primario, fontWeight: "600" }}>Número Plus</Text>
            <Text style={{ color: t.texto, fontWeight: "800", fontSize: 22, fontVariant: ["tabular-nums"] }}>{sorteo.numero_plus}</Text>
          </View>
        </Tarjeta>
      )}
      {sorteo.pozo_extra && (
        <Tarjeta fondo={p.fondoTarjeta}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} accessible>
            <Text style={{ color: p.primario, fontWeight: "600" }}>Pozo extra</Text>
            <Text style={{ color: t.texto, fontVariant: ["tabular-nums"] }}>
              {sorteo.pozo_extra.ganadores === 0 ? "Vacante" : `${entero(sorteo.pozo_extra.ganadores)} ganadores · ${pesos(sorteo.pozo_extra.premio)}`}
            </Text>
          </View>
        </Tarjeta>
      )}

      {prox && (prox.fecha || prox.pozo) && (
        <Tarjeta fondo={p.secundario + "1F"}>
          <View style={{ gap: Espacio.xs }} accessible>
            <Text style={{ color: p.secundario, fontWeight: "600" }}>Próximo sorteo</Text>
            {prox.sorteo && prox.fecha && (
              <Text style={{ color: t.texto, fontSize: 13 }}>
                Nº {prox.sorteo} · {fechaLarga(prox.fecha)} · {meta.hora} hs
              </Text>
            )}
            {prox.pozo != null && <Text style={{ color: t.texto, fontWeight: "600" }}>Pozo estimado: {pesos(prox.pozo)}</Text>}
            {objetivo && <CuentaRegresiva objetivo={objetivo} />}
          </View>
        </Tarjeta>
      )}
    </View>
  );
}
