// Jugadas del usuario, guardadas solo en el dispositivo (AsyncStorage). Sin cuenta, sin servidor.
// Solo compara números contra los sorteados: no aconseja ni sugiere.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Jugada, JuegoId, Sorteo } from "./modelos";

const CLAVE = "jugadas:v1";

interface EstadoJugadas {
  jugadas: Jugada[];
  de: (juego: JuegoId) => Jugada[];
  agregar: (juego: JuegoId, numeros: number[], nombre: string) => Promise<void>;
  borrar: (id: string) => Promise<void>;
  borrarTodas: () => Promise<void>;
}

const Ctx = createContext<EstadoJugadas | null>(null);

function nuevoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function JugadasProvider({ children }: { children: React.ReactNode }) {
  const [jugadas, setJugadas] = useState<Jugada[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then((raw) => {
        if (raw) setJugadas(JSON.parse(raw) as Jugada[]);
      })
      .catch(() => undefined);
  }, []);

  const guardar = useCallback(async (lista: Jugada[]) => {
    setJugadas(lista);
    try {
      await AsyncStorage.setItem(CLAVE, JSON.stringify(lista));
    } catch {
      /* si no se puede persistir, queda en memoria */
    }
  }, []);

  const agregar = useCallback(
    (juego: JuegoId, numeros: number[], nombre: string) =>
      guardar([...jugadas, { id: nuevoId(), juego, numeros: [...numeros].sort((a, b) => a - b), nombre: nombre.trim(), creada: new Date().toISOString() }]),
    [jugadas, guardar],
  );
  const borrar = useCallback((id: string) => guardar(jugadas.filter((j) => j.id !== id)), [jugadas, guardar]);
  const borrarTodas = useCallback(() => guardar([]), [guardar]);
  const de = useCallback((juego: JuegoId) => jugadas.filter((j) => j.juego === juego), [jugadas]);

  const valor = useMemo<EstadoJugadas>(() => ({ jugadas, de, agregar, borrar, borrarTodas }), [jugadas, de, agregar, borrar, borrarTodas]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useJugadas(): EstadoJugadas {
  const v = useContext(Ctx);
  if (!v) throw new Error("useJugadas fuera de JugadasProvider");
  return v;
}

/** Números de la jugada que salieron en cada modalidad del sorteo. */
export function aciertos(jugada: Jugada, sorteo: Sorteo): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [clave, mod] of Object.entries(sorteo.modalidades)) {
    out[clave] = jugada.numeros.filter((n) => mod.numeros.includes(n)).sort((a, b) => a - b);
  }
  return out;
}
