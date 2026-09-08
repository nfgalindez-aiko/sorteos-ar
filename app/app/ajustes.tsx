import React from "react";
import { Alert, Linking, Pressable, ScrollView, View } from "react-native";
import { Text } from "../src/texto";
import Constants from "expo-constants";
import { Boton, Disclaimer, Tarjeta } from "../src/componentes";
import { useRouter } from "expo-router";
import { Espacio, useTema } from "../src/design";
import { useJugadas } from "../src/jugadas";
import { FUENTES, SITIO } from "../src/modelos";

export default function Ajustes() {
  const t = useTema();
  const js = useJugadas();
  const version = Constants.expoConfig?.version ?? "0.1.0";
  const router = useRouter();

  const Seccion = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
    <View style={{ gap: Espacio.s }}>
      <Text style={{ color: t.textoSec, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>{titulo}</Text>
      <Tarjeta style={{ gap: Espacio.s }}>{children}</Tarjeta>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: Espacio.m, gap: Espacio.l }}>
      <Seccion titulo="Aviso">
        <Disclaimer />
      </Seccion>
      <Seccion titulo="Fuentes de los resultados">
        {FUENTES.map((f) => (
          <Text key={f} style={{ color: t.texto, fontSize: 15 }}>{f}</Text>
        ))}
        <Text style={{ color: t.textoSec, fontSize: 13, lineHeight: 18 }}>
          Cada sorteo se publica solo cuando dos fuentes independientes coinciden número por número. Cuando un dato dice "1 fuente" es porque por ahora lo publicó un solo sitio; se confirma solo cuando el segundo coincide.
        </Text>
      </Seccion>
      <Seccion titulo="Tus datos">
        <Text style={{ color: t.textoSec, fontSize: 13, lineHeight: 18 }}>
          Esta app no tiene cuenta ni recolecta datos. Las jugadas que cargás quedan guardadas únicamente en este dispositivo.
        </Text>
        <Pressable
          disabled={js.jugadas.length === 0}
          onPress={() =>
            Alert.alert("¿Borrar todas las jugadas guardadas?", undefined, [
              { text: "Cancelar", style: "cancel" },
              { text: "Borrar todas", style: "destructive", onPress: () => js.borrarTodas() },
            ])
          }
          accessibilityRole="button"
        >
          <Text style={{ color: "#D0342C", fontSize: 15, opacity: js.jugadas.length === 0 ? 0.4 : 1 }}>
            Borrar jugadas guardadas ({js.jugadas.length})
          </Text>
        </Pressable>
      </Seccion>
      <Seccion titulo="Acerca de">
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: t.texto, fontSize: 15 }}>Versión</Text>
          <Text style={{ color: t.textoSec, fontSize: 15 }}>{version}</Text>
        </View>
        <Pressable onPress={() => Linking.openURL(SITIO + "privacidad/")} accessibilityRole="link">
          <Text style={{ color: t.texto, fontSize: 15 }}>Política de privacidad</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(SITIO + "soporte/")} accessibilityRole="link">
          <Text style={{ color: t.texto, fontSize: 15 }}>Soporte</Text>
        </Pressable>
        <Text style={{ color: t.textoSec, fontSize: 13, lineHeight: 18 }}>
          Los nombres de los juegos se usan de manera descriptiva. Esta app no está afiliada a ningún organismo ni operador de juegos de azar.
        </Text>
      </Seccion>
      <View style={{ flexDirection: "row" }}>
        <Boton titulo="¿Ves algún error? Dejámelo acá" color={t.textoSec} onPress={() => router.push("/reporte?pantalla=ajustes")} />
      </View>
      <Pressable onPress={() => Linking.openURL("https://nfgalindez.com")} accessibilityRole="link" style={{ alignItems: "center", paddingVertical: Espacio.m }}>
        <Text style={{ color: t.textoSec, fontSize: 13 }}>Hecha por Nicolás Galindez</Text>
        <Text style={{ color: t.texto, fontSize: 13, fontWeight: "600", textDecorationLine: "underline" }}>nfgalindez.com</Text>
      </Pressable>
    </ScrollView>
  );
}
