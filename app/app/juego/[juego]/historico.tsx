import React from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useResultados } from "../../../src/api";
import { Vacio } from "../../../src/componentes";
import { Espacio, useTema } from "../../../src/design";
import { fechaLarga } from "../../../src/formato";
import { JUEGOS, esJuego } from "../../../src/modelos";

export default function Historico() {
  const { juego } = useLocalSearchParams<{ juego: string }>();
  const t = useTema();
  const r = useResultados();
  const router = useRouter();
  if (!esJuego(juego)) return <Vacio texto="Juego desconocido." />;
  const items = r.indices[juego] ?? [];
  return (
    <>
      <Stack.Screen options={{ title: `Anteriores · ${JUEGOS[juego].nombre}` }} />
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.sorteo)}
        contentContainerStyle={{ padding: Espacio.m, gap: Espacio.s }}
        refreshControl={<RefreshControl refreshing={r.cargando} onRefresh={r.recargar} tintColor={t.textoSec} />}
        ListEmptyComponent={<Vacio texto="Todavía no hay sorteos anteriores cargados." />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/juego/${juego}/sorteo/${item.sorteo}`)}
            accessibilityRole="button"
            accessibilityLabel={`Sorteo ${item.sorteo}, ${fechaLarga(item.fecha)}${item.validado ? "" : ", pendiente de confirmación"}`}
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
              <Text style={{ color: t.texto, fontWeight: "600", fontSize: 16 }}>Sorteo {item.sorteo}</Text>
              <Text style={{ color: t.textoSec, fontSize: 14 }}>{fechaLarga(item.fecha)}</Text>
            </View>
            {!item.validado && <Text style={{ color: t.aviso, fontSize: 18 }}>⚠︎</Text>}
          </Pressable>
        )}
      />
    </>
  );
}
