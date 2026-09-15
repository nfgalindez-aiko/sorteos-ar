import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { Text } from "../../src/texto";
import { Stack, useLocalSearchParams } from "expo-router";
import { useResultados } from "../../src/api";
import { Disclaimer, Vacio } from "../../src/componentes";
import { Espacio, useTema } from "../../src/design";
import { Reunion } from "../../src/modelos";
import { ReunionDetalle } from "../../src/turf-detalle";

export default function ReunionPorFecha() {
  const { fecha } = useLocalSearchParams<{ fecha: string }>();
  const t = useTema();
  const r = useResultados();
  const [reunion, setReunion] = useState<Reunion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const d = await r.turfReunion(String(fecha));
        if (vivo) setReunion(d);
      } catch {
        if (vivo) setError("No se pudo cargar esta reunión. Probá de nuevo con conexión.");
      }
    })();
    return () => {
      vivo = false;
    };
  }, [fecha, r]);

  return (
    <>
      <Stack.Screen options={{ title: "Reunión" }} />
      <ScrollView contentContainerStyle={{ padding: Espacio.m, gap: Espacio.m }}>
        {error ? (
          <Vacio texto={error} />
        ) : reunion ? (
          <ReunionDetalle reunion={reunion} />
        ) : (
          <ActivityIndicator color={t.textoSec} />
        )}
        <Disclaimer compacto />
      </ScrollView>
    </>
  );
}
