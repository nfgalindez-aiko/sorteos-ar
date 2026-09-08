// Logo animado de Sorteos AR en react-native-svg, misma coreografía que branding/sorteos-logo-scene.jsx
// (dos fuentes convergen, la intersección se enciende en 17, se dibuja el ícono, aparece la firma).
// - <IntroPrimeraVez/>: la animación completa, una sola vez por dispositivo; un toque la cierra.
// - <SplashLogo/>: el cuadro final (ícono + nombre) un instante en cada apertura.
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Rect, Text as SvgText } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";

const INK = "#0A0F1C", TILE = "#17263E", IVORY = "#EDE6D6", ACCENT = "#74C0E8";
const SCENES: [string, number][] = [["Fuentes", 2.4], ["Coinciden", 2.0], ["Marca", 2.2], ["Firma", 3.4]];
const CUES: Record<string, number> = {};
let TOTAL = 0;
for (const [n, d] of SCENES) { CUES[n] = TOTAL; TOTAL += d; }
export const DURACION = TOTAL;

const E = {
  outQuart: (t: number) => 1 - --t * t * t * t,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  outBack: (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
const anim = (from: number, to: number, start: number, end: number, ease: (t: number) => number) => (t: number) =>
  t <= start ? from : t >= end ? to : from + (to - from) * ease((t - start) / (end - start));
function spinNum(T: number, seed: number): string {
  const k = Math.floor(T * 11) + seed;
  const n = (Math.abs(k * 37 + seed * 131) % 45) + 1;
  return n < 10 ? "0" + n : String(n);
}

const mergeStart = CUES.Coinciden + 0.15, settle = CUES.Coinciden + 0.95;
const cx1 = anim(940, 285, 0.2, mergeStart, E.outQuart), cx2 = anim(285, 55, mergeStart, settle, E.inOutCubic);
const ballsIn = anim(0, 1, 0.25, 1.05, E.outQuart);
const lensA = anim(0, 1, settle - 0.06, settle + 0.34, E.outBack);
const numIn = anim(0, 1, settle + 0.1, settle + 0.5, E.outBack);
const aFade = anim(1, 0, settle - 0.25, settle + 0.05, E.inOutCubic);
const rip = anim(0, 1, settle, settle + 0.95, E.outQuart);
const tileDraw = anim(0, 1, CUES.Marca, CUES.Marca + 0.85, E.inOutCubic);
const tileFill = anim(0, 1, CUES.Marca + 0.5, CUES.Marca + 1.15, E.inOutCubic);
const camScale = anim(1.34, 1.0, CUES.Marca - 0.3, CUES.Marca + 0.8, E.inOutCubic);
const camX = anim(0, -300, CUES.Firma - 0.35, CUES.Firma + 0.75, E.inOutCubic);
const wordIn = anim(0, 1, CUES.Firma + 0.15, CUES.Firma + 1.05, E.outQuart);
const tagIn = anim(0, 1, CUES.Firma + 0.6, CUES.Firma + 1.5, E.outQuart);
const outro = anim(1, 0, TOTAL - 0.55, TOTAL - 0.02, E.inOutCubic);
const bobFade = anim(1, 0, mergeStart, settle, E.inOutCubic);

/** Un cuadro de la animación en el instante T (segundos). */
export function CuadroLogo({ T, width, height, conOutro = true }: { T: number; width: number; height: number; conOutro?: boolean }) {
  const cx = T < mergeStart ? cx1(T) : cx2(T);
  const settled = T >= settle;
  const bi = ballsIn(T);
  const ripv = rip(T);
  const pop = settled ? 1 + 0.055 * Math.max(0, 1 - (T - settle) / 0.45) * Math.sin(Math.min(1, (T - settle) / 0.45) * Math.PI) : 1;
  const bob = Math.sin(T * 1.15) * 9 * bi * bobFade(T);
  const td = tileDraw(T), wi = wordIn(T), ti = tagIn(T);
  const numA = settled ? "17" : spinNum(T, 3), numB = settled ? "17" : spinNum(T, 17);
  const tag = "Sorteos Argentinos";
  return (
    <Svg width={width} height={height} viewBox="-800 -450 1600 900" preserveAspectRatio="xMidYMid meet">
      <Rect x={-800} y={-450} width={1600} height={900} fill={INK} />
      <G opacity={conOutro ? outro(T) : 1}>
        <G transform={`translate(${camX(T)} 0) scale(${camScale(T)})`}>
          <G opacity={td > 0 ? 1 : 0}>
            <Rect x={-330} y={-330} width={660} height={660} rx={152} fill={TILE} fillOpacity={tileFill(T)}
              stroke={ACCENT} strokeOpacity={0.5} strokeWidth={5} strokeDasharray={[2640 * td, 2640]} />
          </G>
          <G transform={`translate(0 ${bob}) scale(${pop})`}>
            <Circle cx={0} cy={0} r={120 + ripv * 420} fill="none" stroke={ACCENT} strokeOpacity={ripv > 0 ? (1 - ripv) * 0.5 : 0} strokeWidth={6} />
            <Defs>
              <ClipPath id="lensClip"><Circle cx={-cx} cy={0} r={150} /></ClipPath>
            </Defs>
            <G clipPath="url(#lensClip)" opacity={lensA(T)}>
              <Circle cx={cx} cy={0} r={150} fill={ACCENT} />
            </G>
            <Circle cx={-cx} cy={0} r={150} fill="none" stroke={IVORY} strokeOpacity={0.9 * bi} strokeWidth={9} />
            <Circle cx={cx} cy={0} r={150} fill="none" stroke={IVORY} strokeOpacity={0.9 * bi} strokeWidth={9} />
            <SvgText x={-cx} y={4} textAnchor="middle" alignmentBaseline="central" fill={IVORY} opacity={bi * aFade(T)} fontSize={112} fontWeight="800">
              {numA}
            </SvgText>
            <SvgText x={settled ? 0 : cx} y={settled ? 6 : 4} textAnchor="middle" alignmentBaseline="central" fill={settled ? INK : IVORY}
              opacity={bi} fontSize={settled ? 108 + 24 * numIn(T) : 112} letterSpacing={settled ? -7 : 0} fontWeight="800">
              {numB}
            </SvgText>
          </G>
          <G opacity={wi}>
            <SvgText x={410} y={-34 + (1 - wi) * 26} textAnchor="start" alignmentBaseline="central" fill={IVORY} fontSize={104} letterSpacing={-1} fontWeight="800">
              Sorteos AR
            </SvgText>
            <SvgText x={412} y={58 + (1 - ti) * 20} textAnchor="start" alignmentBaseline="central" fill={ACCENT} opacity={ti} fontSize={42} letterSpacing={0.5} fontWeight="500">
              {tag}
            </SvgText>
          </G>
        </G>
      </G>
    </Svg>
  );
}

/** Reproduce T de 0 a DURACION con requestAnimationFrame. */
function useReloj(activo: boolean, velocidad: number, alTerminar?: () => void, desde = 0) {
  const [T, setT] = useState(desde);
  const inicio = useRef<number | null>(null);
  const fin = useRef(alTerminar);
  fin.current = alTerminar;
  useEffect(() => {
    if (!activo) return;
    let raf = 0, vivo = true;
    const tick = (now: number) => {
      if (!vivo) return;
      if (inicio.current == null) inicio.current = now;
      const t = desde + ((now - inicio.current) / 1000) * velocidad;
      if (t >= TOTAL) { setT(TOTAL); fin.current?.(); return; }
      setT(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { vivo = false; cancelAnimationFrame(raf); };
  }, [activo, velocidad, desde]);
  return T;
}

const CLAVE_INTRO = "intro-vista:v1";

export async function introYaVista(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(CLAVE_INTRO)) === "1"; } catch { return true; }
}
export async function marcarIntroVista(): Promise<void> {
  try { await AsyncStorage.setItem(CLAVE_INTRO, "1"); } catch { /* sin storage: se mostrará otra vez, no pasa nada */ }
}

/** Animación completa a pantalla completa. Un toque en cualquier lado la cierra. */
export function IntroPrimeraVez({ onFin }: { onFin: () => void }) {
  const { width, height } = useWindowDimensions();
  const [cerrando, setCerrando] = useState(false);
  const T = useReloj(!cerrando, 1.25, () => onFin());
  const cerrar = () => { if (!cerrando) { setCerrando(true); onFin(); } };
  return (
    <Pressable onPress={cerrar} style={[StyleSheet.absoluteFill, { backgroundColor: INK, alignItems: "center", justifyContent: "center", zIndex: 1000 }]} accessibilityLabel="Presentación de Sorteos AR. Tocá para continuar" accessibilityRole="button">
      <CuadroLogo T={T} width={width} height={Math.min(height, (width * 9) / 16)} />
    </Pressable>
  );
}

/** Tramo final del video en cada apertura: el ícono ya dibujado, la cámara se corre, aparece la firma y se funde. */
export const SPLASH_DESDE = CUES.Firma - 0.1;
export function SplashLogo({ visible, onFin }: { visible: boolean; onFin?: () => void }) {
  const { width, height } = useWindowDimensions();
  const T = useReloj(visible, 1.0, () => onFin?.(), SPLASH_DESDE);
  if (!visible) return null;
  return (
    <Pressable onPress={() => onFin?.()} style={[StyleSheet.absoluteFill, { backgroundColor: INK, alignItems: "center", justifyContent: "center", zIndex: 1000 }]} accessibilityLabel="Sorteos AR. Tocá para entrar" accessibilityRole="button">
      <CuadroLogo T={T} width={width} height={Math.min(height, (width * 9) / 16)} />
      <Text style={{ position: "absolute", bottom: 40, color: "#8C8779", fontSize: 11, letterSpacing: 2, opacity: outro(T) }}>SOLO CONSULTA · +18</Text>
    </Pressable>
  );
}
