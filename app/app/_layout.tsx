import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ResultadosProvider } from "../src/api";
import { JugadasProvider } from "../src/jugadas";
import { useTema } from "../src/design";

export default function Layout() {
  const t = useTema();
  return (
    <ResultadosProvider>
      <JugadasProvider>
        <StatusBar style={t.oscuro ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: t.fondo },
            headerTintColor: t.texto,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: t.fondo },
            headerBackButtonDisplayMode: "minimal",
          }}
        >
          <Stack.Screen name="index" options={{ title: "Sorteos AR" }} />
          <Stack.Screen name="ajustes" options={{ title: "Ajustes" }} />
        </Stack>
      </JugadasProvider>
    </ResultadosProvider>
  );
}
