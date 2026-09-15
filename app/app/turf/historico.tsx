import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "../../src/texto";
import { Stack, useRouter } from "expo-router";
import { useResultados } from "../../src/api";
import { Disclaimer, Tarjeta, Vacio } from "../../src/componentes";
import { Espacio, useTema } from "../../src/design";
import { fechaLarga } from "../../src/formato";
import { paletaTurf } from "../../src/turf-detalle";

export default function HistoricoTurf() {
  const t = useTema();
  const r = useResultados();
  const router = useRouter();
  const p = paletaTurf(t.oscuro);
  return (
    <>
      <Stack.Screen options={{ title: "Reuniones anteriores" }} />
      <ScrollView contentContainerStyle={{ padding: Espacio.m, gap: Espacio.s }}>
        {r.turfIndice.length === 0 && <Vacio texto="Todavía no hay reuniones publicadas." />}
        {r.turfIndice.map((f) => (
          <Pressable
            key={f.fecha}
            onPress={() => router.push(`/turf/${f.fecha}`)}
            accessibilityRole="button"
            accessibilityLabel={`Reunión ${f.reunion} del ${fechaLarga(f.fecha)}, ${f.carreras} carreras`}
          >
            <Tarjeta fondo={p.fondoTarjeta} style={{ borderColor: p.primario + "40" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Espacio.s }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.texto, fontSize: 15, fontWeight: "600" }}>{fechaLarga(f.fecha)}</Text>
                  <Text style={{ color: t.textoSec, fontSize: 12 }}>
                    Reunión {f.reunion} · {f.carreras} carreras
                  </Text>
                </View>
                <Text style={{ color: p.primario, fontSize: 18 }}>›</Text>
              </View>
            </Tarjeta>
          </Pressable>
        ))}
        <Disclaimer compacto />
      </ScrollView>
    </>
  );
}
