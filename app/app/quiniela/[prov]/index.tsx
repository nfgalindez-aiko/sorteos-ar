import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useResultados } from "../../../src/api";
import { BannerSinConexion, Boton, Disclaimer, Vacio } from "../../../src/componentes";
import { Espacio, useTema } from "../../../src/design";
import { DiaQuiniela, PROVINCIAS, esProvincia } from "../../../src/modelos";
import { QuinielaDia, paletaQuiniela } from "../../../src/quiniela-detalle";

export default function QuinielaHoy() {
  const { prov } = useLocalSearchParams<{ prov: string }>();
  const t = useTema();
  const r = useResultados();
  const router = useRouter();
  const [dia, setDia] = useState<DiaQuiniela | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const ok = esProvincia(prov);

  const cargar = useCallback(async () => {
    if (!ok) return;
    setCargando(true);
    try {
      setDia(await r.quinielaDia(prov, "latest"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }, [ok, prov, r]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!ok) return <Vacio texto="Quiniela desconocida." />;
  const p = paletaQuiniela(t.oscuro);
  return (
    <>
      <Stack.Screen options={{ title: `Quiniela ${PROVINCIAS[prov].corto}` }} />
      <ScrollView
        contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={t.textoSec} />}
      >
        {r.sinConexion && <BannerSinConexion />}
        {dia ? <QuinielaDia dia={dia} /> : error ? <Vacio texto={`No se pudo cargar. ${error}`} /> : <ActivityIndicator color={t.textoSec} style={{ padding: Espacio.xl }} />}
        <View style={{ flexDirection: "row" }}>
          <Boton titulo="Días anteriores" color={p.primario} onPress={() => router.push(`/quiniela/${prov}/historico`)} />
        </View>
        <Disclaimer compacto />
      </ScrollView>
    </>
  );
}
