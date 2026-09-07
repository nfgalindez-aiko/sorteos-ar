import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useResultados } from "../../src/api";
import { Disclaimer, Vacio } from "../../src/componentes";
import { Espacio, useTema } from "../../src/design";
import { Poceada } from "../../src/modelos";
import { PoceadaDetalle } from "../../src/poceada-detalle";

export default function PoceadaSorteo() {
  const { numero } = useLocalSearchParams<{ numero: string }>();
  const t = useTema();
  const r = useResultados();
  const [sorteo, setSorteo] = useState<Poceada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const n = Number(numero);

  useEffect(() => {
    if (!Number.isFinite(n)) return;
    let vivo = true;
    r.poceadaSorteo(n)
      .then((s) => vivo && setSorteo(s))
      .catch((e: unknown) => vivo && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      vivo = false;
    };
  }, [n, r]);

  return (
    <>
      <Stack.Screen options={{ title: `Poceada ${numero}` }} />
      <ScrollView contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m }}>
        {sorteo ? (
          <>
            <PoceadaDetalle sorteo={sorteo} />
            <Disclaimer compacto />
          </>
        ) : error ? (
          <Vacio texto={`No se pudo cargar el sorteo ${numero}. ${error}`} />
        ) : (
          <ActivityIndicator color={t.textoSec} style={{ padding: Espacio.xl }} />
        )}
      </ScrollView>
    </>
  );
}
