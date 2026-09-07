// Formateo sin depender de Intl (Hermes lo trae, pero así queda determinista).

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function entero(n: number): string {
  const s = Math.trunc(Math.abs(n)).toString();
  const out = s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return n < 0 ? "-" + out : out;
}

export function pesos(n: number): string {
  return "$ " + entero(n);
}

export function dosDigitos(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

/** "2026-09-06" -> Date a las 00:00 en hora local del dispositivo (solo para día/mes). */
function partes(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}

export function fechaLarga(iso: string): string {
  const p = partes(iso);
  if (!p) return iso;
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d));
  const dia = DIAS[d.getUTCDay()];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${p.d} de ${MESES[p.m - 1]}`;
}

export function fechaCorta(iso: string): string {
  const p = partes(iso);
  if (!p) return iso;
  return `${dosDigitos(p.d)}/${dosDigitos(p.m)}/${p.y}`;
}

/** Instante del sorteo en hora Argentina (UTC-3, sin horario de verano). */
export function instanteSorteo(iso: string, hora: string): Date | null {
  if (!partes(iso)) return null;
  return new Date(`${iso}T${hora}:00-03:00`);
}

export function cuentaRegresiva(objetivo: Date, ahora: Date): string | null {
  const s = Math.floor((objetivo.getTime() - ahora.getTime()) / 1000);
  if (s <= 0) return null;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  if (d > 0) return `Faltan ${d} d ${h} h ${m} min`;
  return `Faltan ${dosDigitos(h)}:${dosDigitos(m)}:${dosDigitos(seg)}`;
}

export function horaCorta(d: Date): string {
  return `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
}
