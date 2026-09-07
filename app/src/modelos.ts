// Modelos del JSON publicado por el backend (brief 6.5) y metadatos de cada juego.

export type JuegoId = "quini6" | "brinco";

export interface PremioFila { aciertos: number; ganadores: number; premio: number }
export interface Modalidad { numeros: number[]; premios: PremioFila[] }
export interface PozoExtra { ganadores: number; premio: number }
export interface Proximo { sorteo: number | null; fecha: string | null; pozo: number | null }

export interface Sorteo {
  juego: JuegoId;
  sorteo: number;
  fecha: string; // YYYY-MM-DD
  modalidades: Record<string, Modalidad>;
  pozo_extra: PozoExtra | null;
  proximo: Proximo | null;
  validado: boolean;
  fuentes: string[];
  generado: string;
}

export interface IndiceItem { sorteo: number; fecha: string; validado: boolean }
export interface Indice { juego: JuegoId; sorteos: IndiceItem[]; generado: string }

export interface Jugada {
  id: string;
  juego: JuegoId;
  numeros: number[];
  nombre: string;
  creada: string;
}

export interface JuegoMeta {
  id: JuegoId;
  nombre: string;
  min: number;
  max: number;
  /** Días de sorteo, 0 = domingo … 6 = sábado (getDay). */
  dias: number[];
  hora: string; // HH:MM hora Argentina
  modalidades: string[];
}

export const JUEGOS: Record<JuegoId, JuegoMeta> = {
  quini6: {
    id: "quini6",
    nombre: "Quini 6",
    min: 0,
    max: 45,
    dias: [0, 3],
    hora: "21:15",
    modalidades: ["tradicional", "segunda", "revancha", "siempre_sale"],
  },
  brinco: {
    id: "brinco",
    nombre: "Brinco",
    min: 0,
    max: 39,
    dias: [0],
    hora: "21:00",
    modalidades: ["tradicional", "junior"],
  },
};

export const ORDEN_JUEGOS: JuegoId[] = ["quini6", "brinco"];

export function esJuego(x: string | undefined): x is JuegoId {
  return x === "quini6" || x === "brinco";
}

const NOMBRES_MOD: Record<string, string> = {
  tradicional: "Tradicional",
  segunda: "Segunda vuelta",
  revancha: "Revancha",
  siempre_sale: "Siempre sale",
  junior: "Junior",
};

export function nombreModalidad(clave: string): string {
  return NOMBRES_MOD[clave] ?? clave.replace(/_/g, " ");
}

export function modalidadesOrdenadas(s: Sorteo, meta: JuegoMeta): { clave: string; modalidad: Modalidad }[] {
  return meta.modalidades
    .filter((k) => s.modalidades[k])
    .map((k) => ({ clave: k, modalidad: s.modalidades[k] }));
}

export const DISCLAIMER =
  "Aplicación informativa independiente. No está afiliada a Lotería de Santa Fe ni a ningún organismo oficial. No permite apostar. Ante cualquier discrepancia vale el extracto oficial. Jugar compulsivamente es perjudicial para la salud. +18.";

export const FUENTES = ["tujugada.com.ar", "quini-6-resultados.com.ar"];
export const SITIO = "https://nfgalindez.com/sorteos/";
