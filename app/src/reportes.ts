// Envío de reportes de error al Worker de Cloudflare, que es el único que conoce el mail del dueño.
// La app nunca abre el cliente de correo ni expone ninguna dirección.
import Constants from "expo-constants";
import { Platform } from "react-native";

const URL = (Constants.expoConfig?.extra?.reportesURL as string | undefined) ?? "";
const KEY = (Constants.expoConfig?.extra?.reportesKey as string | undefined) ?? "";

export interface ContextoReporte {
  pantalla: string;
  juego?: string;
  sorteo?: string | number;
}

export async function enviarReporte(texto: string, contacto: string, ctx: ContextoReporte): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!URL || !KEY) return { ok: false, error: "El canal de reportes no está configurado en esta versión." };
  const body = {
    texto: texto.trim().slice(0, 2000),
    contacto: contacto.trim().slice(0, 120),
    contexto: {
      pantalla: ctx.pantalla,
      juego: ctx.juego ?? "",
      sorteo: ctx.sorteo != null ? String(ctx.sorteo) : "",
      version: Constants.expoConfig?.version ?? "?",
      so: `${Platform.OS} ${Platform.Version}`,
      dispositivo: Constants.deviceName ?? "",
    },
  };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(URL, { method: "POST", headers: { "content-type": "application/json", "x-sorteos-key": KEY }, body: JSON.stringify(body), signal: ctrl.signal });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (r.ok && j.ok) return { ok: true };
    return { ok: false, error: j.error ?? `No se pudo enviar (HTTP ${r.status}).` };
  } catch {
    return { ok: false, error: "Sin conexión. Probá de nuevo cuando tengas red." };
  } finally {
    clearTimeout(t);
  }
}
