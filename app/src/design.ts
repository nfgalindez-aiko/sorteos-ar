// Tokens de diseño. Paleta INSPIRADA en la familia cromática de cada juego, nunca copia.
// Tipografía de sistema. Sin logos ajenos.
import { useColorScheme } from "react-native";
import type { JuegoId } from "./modelos";

export const Espacio = { xs: 4, s: 8, m: 16, l: 24, xl: 32 } as const;
export const Radio = { tarjeta: 16, chip: 10 } as const;

export interface Paleta {
  primario: string;
  secundario: string;
  bolilla: string;
  textoBolilla: string;
  fondoTarjeta: string;
}

export interface Tema {
  oscuro: boolean;
  fondo: string;
  superficie: string;
  texto: string;
  textoSec: string;
  borde: string;
  aviso: string;
  avisoFondo: string;
}

const CLARO: Tema = {
  oscuro: false,
  fondo: "#F6F7F5",
  superficie: "#FFFFFF",
  texto: "#1B1F1C",
  textoSec: "#5E6660",
  borde: "#E1E5E0",
  aviso: "#A35A00",
  avisoFondo: "#FFF1E0",
};

const OSCURO: Tema = {
  oscuro: true,
  fondo: "#0F1311",
  superficie: "#181D1A",
  texto: "#F0F2EF",
  textoSec: "#A2ABA5",
  borde: "#2A312C",
  aviso: "#FFB25C",
  avisoFondo: "#33230F",
};

const PALETAS: Record<JuegoId, { claro: Paleta; oscuro: Paleta }> = {
  quini6: {
    claro: { primario: "#0D7345", secundario: "#D9A60D", bolilla: "#F7D640", textoBolilla: "#1A331F", fondoTarjeta: "#EAF7EE" },
    oscuro: { primario: "#59CC8C", secundario: "#FACC40", bolilla: "#E6BF33", textoBolilla: "#14241A", fondoTarjeta: "#1A2E21" },
  },
  lotoplus: {
    claro: { primario: "#8A1C3B", secundario: "#C98A00", bolilla: "#F3C8D4", textoBolilla: "#4A0F22", fondoTarjeta: "#FBEFF2" },
    oscuro: { primario: "#F08DA8", secundario: "#F2C14E", bolilla: "#6B2140", textoBolilla: "#FDECF1", fondoTarjeta: "#2D1720" },
  },
  brinco: {
    claro: { primario: "#1F529E", secundario: "#E6661A", bolilla: "#FA8C33", textoBolilla: "#FFFFFF", fondoTarjeta: "#EBF2FC" },
    oscuro: { primario: "#80B3FA", secundario: "#FF994D", bolilla: "#F28C38", textoBolilla: "#1A140D", fondoTarjeta: "#172438" },
  },
};

export function useTema(): Tema {
  return useColorScheme() === "dark" ? OSCURO : CLARO;
}

export function usePaleta(juego: JuegoId): Paleta {
  const oscuro = useColorScheme() === "dark";
  return oscuro ? PALETAS[juego].oscuro : PALETAS[juego].claro;
}
