import React from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useResultados } from "../../src/api";
import { Vacio } from "../../src/componentes";
import { Espacio, useTema } from "../../src/design";
import { fechaLarga } from "../../src/formato";

export default function PoceadaHistorico() {
  const t = useTema();
  const r = useResultados();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: "Anteriores · Poceada" }} />
      <FlatList
        data={r.poceadaIndice}
        keyExtractor={(i) => String(i.sorteo)}
        contentContainerStyle={{ padding: Espacio.m, gap: Espacio.s }}
        refreshControl={<RefreshControl refreshing={r.cargando} onRefresh={r.recargar} tintColor={t.textoSec} />}
        ListEmptyComponent={<Vacio texto="Todavía no hay sorteos anteriores cargados." />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/poceada/${item.sorteo}`)}
            accessibilityRole="button"
            accessibilityLabel={`Sorteo ${item.sorteo}, ${fechaLarga(item.fecha)}${item.validado ? "" : ", una sola fuente"}`}
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
          </Pressable>
        )}
      />
    </>
  );
}
