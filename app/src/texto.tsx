// Texto con tope de escala de accesibilidad. Dynamic Type sigue funcionando (hasta 1,5×), pero sin
// que los tamaños extremos rompan tarjetas, filas y bolillas. Se importa como `Text` en toda la app.
import React, { forwardRef } from "react";
import { Text as RNText, TextProps, useWindowDimensions } from "react-native";

export const ESCALA_MAX = 1.5;

export const Text = forwardRef<RNText, TextProps>(function Texto(props, ref) {
  return <RNText maxFontSizeMultiplier={ESCALA_MAX} {...props} ref={ref} />;
});

/** Factor para agrandar elementos que no son texto (bolillas, chips) junto con la letra. */
export function useEscala(): number {
  const { fontScale } = useWindowDimensions();
  return Math.min(Math.max(fontScale, 1), ESCALA_MAX);
}
