import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useResultados } from "../../../src/api";
import { Disclaimer, Vacio } from "../../../src/componentes";
import { Espacio, useTema } from "../../../src/design";
import { fechaCorta } from "../../../src/formato";
import { DiaQuiniela, esProvincia } from "../../../src/modelos";
import { QuinielaDia } from "../../../src/quiniela-detalle";

export default function QuinielaFecha() {
  const { prov, fecha } = useLocalSearchParams<{ prov: string; fecha: string }>();
  const t = useTema();
  const r = useResultados();
  const [dia, setDia] = useState<DiaQuiniela | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ok = esProvincia(prov) && /^\d{4}-\d{2}-\d{2}$/.test(fecha ?? "");

  useEffect(() => {
    if (!ok) return;
    let vivo = true;
    r.quinielaDia(prov, fecha)
      .then((d) => vivo && setDia(d))
      .catch((e: unknown) => vivo && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      vivo = false;
    };
  }, [ok, prov, fecha, r]);

  if (!ok) return <Vacio texto="Fecha o quiniela desconocida." />;
  return (
    <>
      <Stack.Screen options={{ title: fechaCorta(fecha) }} />
      <ScrollView contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m }}>
        {dia ? (
          <>
            <QuinielaDia dia={dia} />
            <Disclaimer compacto />
          </>
        ) : error ? (
          <Vacio texto={`No se pudo cargar el día ${fechaCorta(fecha)}. ${error}`} />
        ) : (
          <ActivityIndicator color={t.textoSec} style={{ padding: Espacio.xl }} />
        )}
      </ScrollView>
    </>
  );
}
