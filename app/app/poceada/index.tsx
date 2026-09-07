import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useResultados } from "../../src/api";
import { BannerSinConexion, Boton, Disclaimer, Vacio } from "../../src/componentes";
import { Espacio, useTema } from "../../src/design";
import { PoceadaDetalle, paletaPoceada } from "../../src/poceada-detalle";

export default function PoceadaHoy() {
  const t = useTema();
  const r = useResultados();
  const router = useRouter();
  const p = paletaPoceada(t.oscuro);
  return (
    <>
      <Stack.Screen options={{ title: "Poceada" }} />
      <ScrollView
        contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m }}
        refreshControl={<RefreshControl refreshing={r.cargando} onRefresh={r.recargar} tintColor={t.textoSec} />}
      >
        {r.sinConexion && <BannerSinConexion />}
        {r.poceada ? <PoceadaDetalle sorteo={r.poceada} /> : <Vacio texto="Sin resultados disponibles todavía. Deslizá para actualizar." />}
        <View style={{ flexDirection: "row" }}>
          <Boton titulo="Sorteos anteriores" color={p.primario} onPress={() => router.push("/poceada/historico")} />
        </View>
        <Disclaimer compacto />
      </ScrollView>
    </>
  );
}
