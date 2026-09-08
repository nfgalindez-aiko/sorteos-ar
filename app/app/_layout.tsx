import React, { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { ResultadosProvider } from "../src/api";
import { JugadasProvider } from "../src/jugadas";
import { useTema } from "../src/design";
import { IntroPrimeraVez, SplashLogo, introYaVista, marcarIntroVista } from "../src/logo-animado";
import { NotificacionesProvider, rutaDeNotificacion } from "../src/notificaciones";

// El splash nativo (ícono sobre azul noche) queda hasta que nuestro cuadro con el nombre esté dibujado.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

type Arranque = "cargando" | "intro" | "splash" | "listo";

export default function Layout() {
  const t = useTema();
  const [arranque, setArranque] = useState<Arranque>("cargando");
  const router = useRouter();

  // Tocar una notificación abre la pantalla del sorteo (data.ruta), también si la app estaba cerrada.
  useEffect(() => {
    const abrir = (r: Notifications.NotificationResponse | null) => {
      const ruta = r && rutaDeNotificacion(r);
      if (ruta) setTimeout(() => router.push(ruta as never), 400);
    };
    Notifications.getLastNotificationResponseAsync().then(abrir).catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener(abrir);
    return () => sub.remove();
  }, [router]);

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
       <NotificacionesProvider>
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
       </NotificacionesProvider>
      </JugadasProvider>
    </ResultadosProvider>
  );
}
