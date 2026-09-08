import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { ResultadosProvider } from "../src/api";
import { JugadasProvider } from "../src/jugadas";
import { useTema } from "../src/design";
import { IntroPrimeraVez, SplashLogo, introYaVista, marcarIntroVista } from "../src/logo-animado";

// El splash nativo (ícono sobre azul noche) queda hasta que nuestro cuadro con el nombre esté dibujado.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

type Arranque = "cargando" | "intro" | "splash" | "listo";

export default function Layout() {
  const t = useTema();
  const [arranque, setArranque] = useState<Arranque>("cargando");

  useEffect(() => {
    let vivo = true;
    introYaVista().then((vista) => {
      if (!vivo) return;
      setArranque(vista ? "splash" : "intro");
      SplashScreen.hideAsync().catch(() => undefined);
    });
    return () => {
      vivo = false;
    };
  }, []);


  const terminarIntro = () => {
    marcarIntroVista();
    setArranque("listo");
  };

  return (
    <ResultadosProvider>
      <JugadasProvider>
        <StatusBar style={arranque === "listo" ? (t.oscuro ? "light" : "dark") : "light"} />
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
        {arranque === "intro" && <IntroPrimeraVez onFin={terminarIntro} />}
        <SplashLogo visible={arranque === "splash" || arranque === "cargando"} onFin={() => setArranque((a) => (a === "splash" ? "listo" : a))} />
      </JugadasProvider>
    </ResultadosProvider>
  );
}
