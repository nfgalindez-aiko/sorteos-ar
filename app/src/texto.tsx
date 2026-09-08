// Texto con escala de accesibilidad hecha a mano. En iOS (arquitectura nueva) el escalado
// automático mide la línea con la letra normal y la dibuja con la grande, y el texto se corta por la
// mitad. Acá se apaga el escalado del sistema (`allowFontScaling={false}`) y se multiplica el
// fontSize y el lineHeight por el factor del sistema (tope 1,3×): lo medido y lo dibujado coinciden.
import React, { forwardRef } from "react";
import { StyleSheet, Text as RNText, TextProps, TextStyle, useWindowDimensions } from "react-native";

export const ESCALA_MAX = 1.3; // 15 % menos que 1,5: con más, los importes se parten en dos líneas y confunden

/** Factor de escala real del sistema, con tope. Sirve también para bolillas y celdas. */
export function useEscala(): number {
  const { fontScale } = useWindowDimensions();
  return Math.min(Math.max(fontScale, 1), ESCALA_MAX);
}

export const Text = forwardRef<RNText, TextProps>(function Texto(props, ref) {
  const esc = useEscala();
  const plano = (StyleSheet.flatten(props.style) || {}) as TextStyle;
  const estilo: TextStyle = { ...plano };
  // Sin fontSize explícito se deja heredar (textos anidados) o el default de 14 escalado.
  estilo.fontSize = (plano.fontSize ?? 14) * esc;
  if (plano.lineHeight != null) estilo.lineHeight = plano.lineHeight * esc;
  return <RNText allowFontScaling={false} {...props} style={estilo} ref={ref} />;
});
