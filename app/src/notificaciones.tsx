// Notificaciones de sorteos. La persona elige en Ajustes qué juegos y qué quinielas quiere; la app pide
// permiso al sistema, obtiene un token anónimo de Expo y lo registra (junto con los temas) en el Worker
// sorteos-ar-push. El backend manda la notificación cuando un sorteo queda confirmado por dos fuentes.
// No se envía ningún dato personal: solo el token del dispositivo y la lista de temas.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { JUEGOS, JuegoId, ORDEN_JUEGOS, ORDEN_PROVINCIAS, POCEADA, PROVINCIAS, ProvinciaId } from "./modelos";

export type Tema = JuegoId | "poceada" | `quiniela:${ProvinciaId}`;
export const TEMAS: { tema: Tema; nombre: string; grupo: "juegos" | "quinielas" }[] = [
  ...ORDEN_JUEGOS.map((j) => ({ tema: j as Tema, nombre: JUEGOS[j].nombre, grupo: "juegos" as const })),
  { tema: "poceada", nombre: POCEADA.nombre, grupo: "juegos" },
  ...ORDEN_PROVINCIAS.map((p) => ({ tema: `quiniela:${p}` as Tema, nombre: `Quiniela ${PROVINCIAS[p].corto}`, grupo: "quinielas" as const })),
];

const CLAVE = "notificaciones:v1";
const URL = (Constants.expoConfig?.extra?.pushURL as string | undefined) ?? "";
const KEY = (Constants.expoConfig?.extra?.pushKey as string | undefined) ?? "";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

interface EstadoNotif {
  temas: Tema[];
  permiso: "sin-pedir" | "ok" | "denegado";
  ocupado: boolean;
  error: string | null;
  cambiar: (tema: Tema, activo: boolean) => Promise<void>;
  apagarTodo: () => Promise<void>;
}

const Ctx = createContext<EstadoNotif | null>(null);

async function obtenerToken(): Promise<string> {
  if (!Device.isDevice) throw new Error("Las notificaciones solo funcionan en un teléfono real.");
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("sorteos", { name: "Sorteos", importance: Notifications.AndroidImportance.DEFAULT });
  }
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  const t = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return t.data;
}

async function registrar(token: string, temas: Tema[]): Promise<void> {
  if (!URL || !KEY) throw new Error("Notificaciones no configuradas en esta versión.");
  const r = await fetch(`${URL}/${temas.length ? "registrar" : "baja"}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-sorteos-key": KEY },
    body: JSON.stringify({ token, temas }),
  });
  if (!r.ok) throw new Error(`No se pudo guardar la suscripción (HTTP ${r.status}).`);
}

export function NotificacionesProvider({ children }: { children: React.ReactNode }) {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [permiso, setPermiso] = useState<EstadoNotif["permiso"]>("sin-pedir");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then((raw) => {
        if (raw) setTemas(JSON.parse(raw) as Tema[]);
      })
      .catch(() => undefined);
    Notifications.getPermissionsAsync()
      .then((p) => setPermiso(p.granted ? "ok" : p.status === "denied" ? "denegado" : "sin-pedir"))
      .catch(() => undefined);
  }, []);

  const aplicar = useCallback(async (nuevos: Tema[]) => {
    setOcupado(true);
    setError(null);
    try {
      if (nuevos.length) {
        const p = await Notifications.getPermissionsAsync();
        let granted = p.granted;
        if (!granted && p.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted;
        setPermiso(granted ? "ok" : "denegado");
        if (!granted) throw new Error("Sin permiso de notificaciones. Se activa en Ajustes del iPhone → Sorteos AR → Notificaciones.");
      }
      const token = await obtenerToken();
      await registrar(token, nuevos);
      setTemas(nuevos);
      await AsyncStorage.setItem(CLAVE, JSON.stringify(nuevos));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  }, []);

  const cambiar = useCallback((tema: Tema, activo: boolean) => aplicar(activo ? Array.from(new Set([...temas, tema])) : temas.filter((t) => t !== tema)), [temas, aplicar]);
  const apagarTodo = useCallback(() => aplicar([]), [aplicar]);

  const valor = useMemo<EstadoNotif>(() => ({ temas, permiso, ocupado, error, cambiar, apagarTodo }), [temas, permiso, ocupado, error, cambiar, apagarTodo]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useNotificaciones(): EstadoNotif {
  const v = useContext(Ctx);
  if (!v) throw new Error("useNotificaciones fuera de NotificacionesProvider");
  return v;
}

/** Ruta a abrir cuando la persona toca una notificación (viene en data.ruta). */
export function rutaDeNotificacion(r: Notifications.NotificationResponse): string | null {
  const ruta = (r.notification.request.content.data as { ruta?: unknown } | undefined)?.ruta;
  return typeof ruta === "string" && ruta.startsWith("/") ? ruta : null;
}
