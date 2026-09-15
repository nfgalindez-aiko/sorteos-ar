import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useResultados } from "../../src/api";
import { BannerSinConexion, Boton, Disclaimer, Vacio } from "../../src/componentes";
import { Espacio, useTema } from "../../src/design";
import { ReunionDetalle, paletaTurf } from "../../src/turf-detalle";
import { TURF } from "../../src/modelos";

export default function TurfHoy() {
  const t = useTema();
  const r = useResultados();
  const router = useRouter();
  const p = paletaTurf(t.oscuro);
  return (
    <>
      <Stack.Screen options={{ title: TURF.nombre }} />
      <ScrollView
        contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m }}
        refreshControl={<RefreshControl refreshing={r.cargando} onRefresh={r.recargar} tintColor={t.textoSec} />}
      >
        {r.sinConexion && <BannerSinConexion />}
        <View style={{ flexDirection: "row" }}>
          <Boton titulo="Reuniones anteriores" color={p.primario} onPress={() => router.push("/turf/historico")} />
        </View>
        {r.turf ? <ReunionDetalle reunion={r.turf} /> : <Vacio texto="Sin reuniones publicadas todavía. Deslizá para actualizar." />}
        <Disclaimer compacto />
      </ScrollView>
    </>
  );
}
