import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useResultados } from "../../../../src/api";
import { Disclaimer, Vacio } from "../../../../src/componentes";
import { Espacio, useTema } from "../../../../src/design";
import { Sorteo, esJuego } from "../../../../src/modelos";
import { SorteoDetalle } from "../../../../src/sorteo-detalle";

export default function SorteoCargado() {
  const { juego, numero } = useLocalSearchParams<{ juego: string; numero: string }>();
  const t = useTema();
  const r = useResultados();
  const [sorteo, setSorteo] = useState<Sorteo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const n = Number(numero);

  useEffect(() => {
    if (!esJuego(juego) || !Number.isFinite(n)) return;
    let vivo = true;
    setSorteo(null);
    setError(null);
    r.sorteo(juego, n)
      .then((s) => vivo && setSorteo(s))
      .catch((e: unknown) => vivo && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      vivo = false;
    };
  }, [juego, n, r]);

  if (!esJuego(juego)) return <Vacio texto="Juego desconocido." />;
  return (
    <>
      <Stack.Screen options={{ title: `Sorteo ${numero}` }} />
      <ScrollView contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m }}>
        {sorteo ? (
          <>
            <SorteoDetalle juego={juego} sorteo={sorteo} />
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
