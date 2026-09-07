import React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Link, Stack, useRouter } from "expo-router";
import { useResultados } from "../src/api";
import { BannerSinConexion, Chip, CuentaRegresiva, Disclaimer, FilaBolillas, Tarjeta } from "../src/componentes";
import { Espacio, usePaleta, useTema } from "../src/design";
import { fechaLarga, horaCorta, instanteSorteo, pesos } from "../src/formato";
import { JUEGOS, JuegoId, ORDEN_JUEGOS, Sorteo } from "../src/modelos";

export default function Inicio() {
  const t = useTema();
  const r = useResultados();
  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/ajustes" asChild>
              <Pressable accessibilityLabel="Ajustes" hitSlop={12}>
                <Text style={{ color: t.texto, fontSize: 22 }}>⚙︎</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m }}
        refreshControl={<RefreshControl refreshing={r.cargando} onRefresh={r.recargar} tintColor={t.textoSec} />}
      >
        {r.sinConexion && <BannerSinConexion />}
        {ORDEN_JUEGOS.map((j) => (
          <TarjetaJuego key={j} juego={j} sorteo={r.ultimos[j]} />
        ))}
        {r.ultimaActualizacion && (
          <Text style={{ color: t.textoSec, fontSize: 11, textAlign: "center" }}>Actualizado {horaCorta(r.ultimaActualizacion)}</Text>
        )}
        <Disclaimer />
      </ScrollView>
    </>
  );
}

function TarjetaJuego({ juego, sorteo }: { juego: JuegoId; sorteo?: Sorteo }) {
  const t = useTema();
  const p = usePaleta(juego);
  const meta = JUEGOS[juego];
  const router = useRouter();
  const trad = sorteo?.modalidades.tradicional;
  const prox = sorteo?.proximo;
  const objetivo = prox?.fecha ? instanteSorteo(prox.fecha, meta.hora) : null;

  return (
    <Pressable onPress={() => router.push(`/juego/${juego}`)} accessibilityRole="button" accessibilityHint={`Abre el detalle de ${meta.nombre}`}>
      <Tarjeta fondo={p.fondoTarjeta} style={{ borderColor: p.primario + "40", gap: Espacio.s }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: p.primario, fontSize: 22, fontWeight: "700" }}>{meta.nombre}</Text>
          {sorteo && <Chip texto={`Sorteo ${sorteo.sorteo}`} color={p.primario} />}
        </View>
        {sorteo ? (
          <>
            <Text style={{ color: t.textoSec, fontSize: 14 }}>{fechaLarga(sorteo.fecha)}</Text>
            {trad && <FilaBolillas titulo="Tradicional" numeros={trad.numeros} paleta={p} />}
            <View style={{ height: 1, backgroundColor: t.borde, marginVertical: Espacio.xs }} />
            {prox?.pozo != null && <Text style={{ color: p.secundario, fontWeight: "600" }}>Próximo pozo estimado: {pesos(prox.pozo)}</Text>}
            {prox?.fecha && (
              <Text style={{ color: t.textoSec, fontSize: 13 }}>
                Próximo sorteo: {fechaLarga(prox.fecha)} {meta.hora} hs
              </Text>
            )}
            {objetivo && <CuentaRegresiva objetivo={objetivo} />}
            {!sorteo.validado && <Chip texto="Pendiente de confirmación" color={t.aviso} />}
          </>
        ) : (
          <Text style={{ color: t.textoSec }}>Todavía no hay resultados cargados.</Text>
        )}
      </Tarjeta>
    </Pressable>
  );
}
