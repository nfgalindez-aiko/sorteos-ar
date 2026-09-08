import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useResultados } from "../../../src/api";
import { BannerSinConexion, Boton, Disclaimer, Vacio } from "../../../src/componentes";
import { Espacio, usePaleta, useTema } from "../../../src/design";
import { JUEGOS, JuegoId, esJuego } from "../../../src/modelos";
import { SorteoDetalle } from "../../../src/sorteo-detalle";

export default function DetalleJuego() {
  const { juego } = useLocalSearchParams<{ juego: string }>();
  const t = useTema();
  const r = useResultados();
  const router = useRouter();
  if (!esJuego(juego)) return <Vacio texto="Juego desconocido." />;
  return <Cuerpo juego={juego} t={t} r={r} router={router} />;
}

function Cuerpo({ juego, t, r, router }: { juego: JuegoId; t: ReturnType<typeof useTema>; r: ReturnType<typeof useResultados>; router: ReturnType<typeof useRouter> }) {
  const p = usePaleta(juego);
  const s = r.ultimos[juego];
  return (
    <>
      <Stack.Screen options={{ title: JUEGOS[juego].nombre }} />
      <ScrollView
        contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m }}
        refreshControl={<RefreshControl refreshing={r.cargando} onRefresh={r.recargar} tintColor={t.textoSec} />}
      >
        {r.sinConexion && <BannerSinConexion />}
        <View style={{ flexDirection: "row", gap: Espacio.m }}>
          <Boton titulo="Sorteos anteriores" color={p.primario} onPress={() => router.push(`/juego/${juego}/historico`)} />
          <Boton titulo="Controlar jugada" color={p.primario} relleno onPress={() => router.push(`/juego/${juego}/control`)} />
        </View>
        {s ? <SorteoDetalle juego={juego} sorteo={s} /> : <Vacio texto="Sin resultados disponibles todavía. Deslizá para actualizar." />}
        <Disclaimer compacto />
      </ScrollView>
    </>
  );
}
