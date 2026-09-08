import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { Text } from "../../../src/texto";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useResultados } from "../../../src/api";
import { Vacio } from "../../../src/componentes";
import { Espacio, useTema } from "../../../src/design";
import { fechaLarga } from "../../../src/formato";
import { IndiceQuinielaItem, PROVINCIAS, esProvincia } from "../../../src/modelos";

export default function QuinielaHistorico() {
  const { prov } = useLocalSearchParams<{ prov: string }>();
  const t = useTema();
  const r = useResultados();
  const router = useRouter();
  const [items, setItems] = useState<IndiceQuinielaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ok = esProvincia(prov);

  useEffect(() => {
    if (!ok) return;
    r.quinielaIndice(prov)
      .then((i) => setItems(i.fechas))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [ok, prov, r]);

  if (!ok) return <Vacio texto="Quiniela desconocida." />;
  return (
    <>
      <Stack.Screen options={{ title: `Anteriores · ${PROVINCIAS[prov].corto}` }} />
      {items === null ? (
        error ? <Vacio texto={`No se pudo cargar. ${error}`} /> : <ActivityIndicator color={t.textoSec} style={{ padding: Espacio.xl }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.fecha}
          contentContainerStyle={{ padding: Espacio.m, gap: Espacio.s }}
          ListEmptyComponent={<Vacio texto="Todavía no hay días anteriores cargados." />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/quiniela/${prov}/${item.fecha}`)}
              accessibilityRole="button"
              accessibilityLabel={`${fechaLarga(item.fecha)}, ${item.turnos} sorteos${item.validado ? "" : ", con turnos de una sola fuente"}`}
              style={({ pressed }) => ({
                backgroundColor: t.superficie,
                opacity: pressed ? 0.7 : 1,
                padding: Espacio.m,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              })}
            >
              <View>
                <Text style={{ color: t.texto, fontWeight: "600", fontSize: 16 }}>{fechaLarga(item.fecha)}</Text>
                <Text style={{ color: t.textoSec, fontSize: 14 }}>{item.turnos} {item.turnos === 1 ? "sorteo" : "sorteos"}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </>
  );
}
