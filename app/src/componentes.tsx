import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { Text, useEscala } from "./texto";
import { Espacio, Paleta, Radio, useTema } from "./design";
import { cuentaRegresiva, dosDigitos, entero, pesos } from "./formato";
import { DISCLAIMER, PremioFila } from "./modelos";

export function Bolilla({ numero, paleta, resaltada = false, tamano: base = 44 }: { numero: number; paleta: Paleta; resaltada?: boolean; tamano?: number }) {
  const tamano = base * useEscala(); // crece con la letra grande, hasta 1,5×
  return (
    <View
      accessible
      accessibilityLabel={resaltada ? `Número ${numero}, acertado` : `Número ${numero}`}
      style={{
        width: tamano,
        height: tamano,
        borderRadius: tamano / 2,
        backgroundColor: paleta.bolilla,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: resaltada ? paleta.primario : "transparent",
      }}
    >
      <Text
        style={{ color: paleta.textoBolilla, fontWeight: "800", fontSize: base * 0.42, fontVariant: ["tabular-nums"] }}
      >
        {dosDigitos(numero)}
      </Text>
    </View>
  );
}

/** Fila de 6 bolillas. VoiceOver la lee como un solo elemento: "Tradicional: 2, 16, 20, 21, 22, 38". */
export function FilaBolillas({ titulo, numeros, paleta, resaltados = [] }: { titulo: string; numeros: number[]; paleta: Paleta; resaltados?: number[] }) {
  return (
    <View accessible accessibilityLabel={`${titulo}: ${numeros.join(", ")}`} style={{ gap: Espacio.s }}>
      <Text style={{ color: paleta.primario, fontWeight: "600", fontSize: 14 }}>{titulo}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Espacio.s }}>
        {numeros.map((n) => (
          <Bolilla key={n} numero={n} paleta={paleta} resaltada={resaltados.includes(n)} />
        ))}
      </View>
    </View>
  );
}

export function PremiosTabla({ premios }: { premios: PremioFila[] }) {
  const t = useTema();
  const col = (txt: string, align: "left" | "right", bold = false) => (
    <Text style={{ flex: 1, textAlign: align, color: bold ? t.textoSec : t.texto, fontSize: bold ? 12 : 14, fontWeight: bold ? "600" : "400", fontVariant: ["tabular-nums"] }}>
      {txt}
    </Text>
  );
  return (
    <View style={{ gap: Espacio.xs }}>
      <View style={{ flexDirection: "row" }}>
        {col("Aciertos", "left", true)}
        {col("Ganadores", "right", true)}
        {col("Premio", "right", true)}
      </View>
      {premios.map((f) => (
        <View
          key={f.aciertos}
          style={{ flexDirection: "row" }}
          accessible
          accessibilityLabel={`${f.aciertos} aciertos, ${f.ganadores === 0 ? "vacante" : `${f.ganadores} ganadores`}, premio ${pesos(f.premio)}`}
        >
          {col(String(f.aciertos), "left")}
          {col(f.ganadores === 0 ? "Vacante" : entero(f.ganadores), "right")}
          {col(pesos(f.premio), "right")}
        </View>
      ))}
    </View>
  );
}

export function CuentaRegresiva({ objetivo }: { objetivo: Date }) {
  const t = useTema();
  const [ahora, setAhora] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const txt = cuentaRegresiva(objetivo, ahora);
  return (
    <Text style={{ color: t.textoSec, fontSize: 13, fontVariant: ["tabular-nums"] }}>
      {txt ?? "Sorteo en curso o pendiente de publicación"}
    </Text>
  );
}

export function BannerSinConexion() {
  const t = useTema();
  return (
    <View style={{ backgroundColor: t.avisoFondo, padding: Espacio.m, borderRadius: Radio.chip }} accessibilityRole="text">
      <Text style={{ color: t.aviso, fontSize: 13 }}>Sin conexión. Mostrando los últimos resultados guardados.</Text>
    </View>
  );
}

export function Disclaimer({ compacto = false }: { compacto?: boolean }) {
  const t = useTema();
  return <Text style={{ color: t.textoSec, fontSize: compacto ? 11 : 13, lineHeight: compacto ? 15 : 18 }}>{DISCLAIMER}</Text>;
}

export function Chip({ texto, color }: { texto: string; color: string }) {
  return (
    <View style={{ backgroundColor: color + "2E", paddingHorizontal: Espacio.s, paddingVertical: Espacio.xs, borderRadius: 999 }}>
      <Text style={{ color, fontSize: 12, fontWeight: "600" }}>{texto}</Text>
    </View>
  );
}

const NOMBRES_FUENTE: Record<string, string> = {
  A: "tujugada.com.ar",
  B: "quini-6-resultados.com.ar",
  M: "quinielamontevideo.com",
  "ciudad-nocturna": "Nocturna de la Quiniela de la Ciudad (cruce)",
  "ciudad-nocturna(A+B)": "Nocturna de la Quiniela de la Ciudad, publicada por dos sitios (cruce)",
};

/** "1 fuente" / "2 fuentes" tocable: al tocar dice de qué sitios salió el dato. Sin tono de alarma. */
export function ChipFuentes({ fuentes, validado, conflicto = false, color }: { fuentes: string[]; validado: boolean; conflicto?: boolean; color: string }) {
  const t = useTema();
  const distintas = Array.from(new Set(fuentes));
  const n = validado ? Math.max(2, distintas.length) : Math.max(1, distintas.length);
  const texto = conflicto ? "Fuentes no coinciden" : validado ? `${n} fuentes` : `${n === 1 ? "1 fuente" : `${n} fuentes`}`;
  const detalle = distintas.map((f) => `• ${NOMBRES_FUENTE[f] ?? f}`).join("\n");
  const explicacion = conflicto
    ? "Los sitios publicaron números distintos para este dato, así que no se muestra hasta que coincidan."
    : validado
      ? "Los sitios coincidieron número por número."
      : "Por ahora lo publicó un solo sitio. Se marca como confirmado cuando un segundo sitio coincide.";
  const tono = conflicto ? t.aviso : validado ? color : t.textoSec;
  return (
    <Pressable
      onPress={() => Alert.alert(texto, `${detalle}\n\n${explicacion}\n\nAnte cualquier discrepancia vale el extracto oficial.`)}
      accessibilityRole="button"
      accessibilityLabel={`${texto}. Tocá para ver cuáles`}
      hitSlop={6}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ backgroundColor: tono + "24", paddingHorizontal: Espacio.s, paddingVertical: Espacio.xs, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text style={{ color: tono, fontSize: 12, fontWeight: "600" }}>{texto}</Text>
        <Text style={{ color: tono, fontSize: 11 }}>ⓘ</Text>
      </View>
    </Pressable>
  );
}

export function Tarjeta({ children, style, fondo }: { children: React.ReactNode; style?: ViewStyle; fondo?: string }) {
  const t = useTema();
  return (
    <View style={[{ backgroundColor: fondo ?? t.superficie, borderRadius: Radio.tarjeta, padding: Espacio.m, borderWidth: StyleSheet.hairlineWidth, borderColor: t.borde }, style]}>
      {children}
    </View>
  );
}

/** Luminancia relativa aproximada de un color #RRGGBB, para elegir texto claro u oscuro encima. */
function esClaro(hex: string): boolean {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  if (!m) return false;
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55;
}

export function Boton({ titulo, onPress, color, relleno = false, disabled = false }: { titulo: string; onPress: () => void; color: string; relleno?: boolean; disabled?: boolean }) {
  const t = useTema();
  // relleno: fondo del color del juego y texto que contraste de verdad (oscuro sobre colores claros, claro sobre oscuros)
  // contorno: superficie de la tarjeta, borde y texto del color del juego, en negrita
  const textoRelleno = esClaro(color) ? "#0F1311" : "#FFFFFF";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flex: 1,
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        backgroundColor: relleno ? color : t.superficie,
        borderWidth: 2,
        borderColor: color,
        paddingVertical: 12,
        borderRadius: Radio.chip,
        alignItems: "center",
      })}
    >
      <Text style={{ color: relleno ? textoRelleno : color, fontWeight: "700", fontSize: 15 }}>{titulo}</Text>
    </Pressable>
  );
}

export function Vacio({ texto }: { texto: string }) {
  const t = useTema();
  return (
    <View style={{ padding: Espacio.xl, alignItems: "center" }}>
      <Text style={{ color: t.textoSec, textAlign: "center" }}>{texto}</Text>
    </View>
  );
}
