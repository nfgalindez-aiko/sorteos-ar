// Cliente del JSON estático publicado por el backend, con caché en AsyncStorage y modo offline.
// La app NO scrapea: solo lee estos archivos.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Indice, IndiceItem, JuegoId, ORDEN_JUEGOS, Sorteo } from "./modelos";

const BASE: string =
  (Constants.expoConfig?.extra?.baseURL as string | undefined) ?? "https://nfgalindez-aiko.github.io/sorteos-ar/data/";
const PREFIJO = "sorteos-json:";
const TIMEOUT_MS = 15000;

async function leerCache<T>(path: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIJO + path);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function escribirCache(path: string, raw: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIJO + path, raw);
  } catch {
    /* sin espacio o sin storage: la app sigue */
  }
}

async function descargar<T>(path: string): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(BASE + path, { signal: ctrl.signal, headers: { "Cache-Control": "no-cache" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const raw = await r.text();
    const valor = JSON.parse(raw) as T;
    await escribirCache(path, raw);
    return valor;
  } finally {
    clearTimeout(t);
  }
}

/** Red primero; si falla, caché. Devuelve también si vino de caché. */
async function obtener<T>(path: string): Promise<{ valor: T; deCache: boolean }> {
  try {
    return { valor: await descargar<T>(path), deCache: false };
  } catch (e) {
    const c = await leerCache<T>(path);
    if (c) return { valor: c, deCache: true };
    throw e;
  }
}

interface EstadoResultados {
  ultimos: Partial<Record<JuegoId, Sorteo>>;
  indices: Partial<Record<JuegoId, IndiceItem[]>>;
  sinConexion: boolean;
  cargando: boolean;
  ultimaActualizacion: Date | null;
  recargar: () => Promise<void>;
  sorteo: (juego: JuegoId, numero: number) => Promise<Sorteo>;
}

const Ctx = createContext<EstadoResultados | null>(null);

export function ResultadosProvider({ children }: { children: React.ReactNode }) {
  const [ultimos, setUltimos] = useState<Partial<Record<JuegoId, Sorteo>>>({});
  const [indices, setIndices] = useState<Partial<Record<JuegoId, IndiceItem[]>>>({});
  const [sinConexion, setSinConexion] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [ultimaActualizacion, setUltima] = useState<Date | null>(null);
  const enCurso = useRef(false);

  const recargar = useCallback(async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    setCargando(true);
    let fallos = 0;
    let deCache = 0;
    for (const juego of ORDEN_JUEGOS) {
      try {
        const r = await obtener<Sorteo>(`${juego}/latest.json`);
        if (r.deCache) deCache++;
        setUltimos((u) => ({ ...u, [juego]: r.valor }));
      } catch {
        fallos++;
      }
      try {
        const r = await obtener<Indice>(`${juego}/index.json`);
        setIndices((i) => ({ ...i, [juego]: r.valor.sorteos }));
      } catch {
        /* el índice es opcional */
      }
    }
    const offline = fallos + deCache === ORDEN_JUEGOS.length;
    setSinConexion(offline);
    if (!offline) setUltima(new Date());
    setCargando(false);
    enCurso.current = false;
  }, []);

  // Arranque instantáneo con lo cacheado, después red.
  useEffect(() => {
    (async () => {
      for (const juego of ORDEN_JUEGOS) {
        const s = await leerCache<Sorteo>(`${juego}/latest.json`);
        if (s) setUltimos((u) => ({ ...u, [juego]: s }));
        const i = await leerCache<Indice>(`${juego}/index.json`);
        if (i) setIndices((x) => ({ ...x, [juego]: i.sorteos }));
      }
      await recargar();
    })();
  }, [recargar]);

  /** Un sorteo puntual. Los publicados no cambian: la caché vale siempre. */
  const sorteo = useCallback(async (juego: JuegoId, numero: number): Promise<Sorteo> => {
    const path = `${juego}/${numero}.json`;
    const c = await leerCache<Sorteo>(path);
    if (c && c.validado) return c;
    try {
      return await descargar<Sorteo>(path);
    } catch (e) {
      if (c) return c;
      throw e;
    }
  }, []);

  const valor = useMemo<EstadoResultados>(
    () => ({ ultimos, indices, sinConexion, cargando, ultimaActualizacion, recargar, sorteo }),
    [ultimos, indices, sinConexion, cargando, ultimaActualizacion, recargar, sorteo],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useResultados(): EstadoResultados {
  const v = useContext(Ctx);
  if (!v) throw new Error("useResultados fuera de ResultadosProvider");
  return v;
}
